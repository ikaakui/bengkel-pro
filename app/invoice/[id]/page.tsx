"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import {
    Printer,
    ArrowLeft,
    Download,
    CheckCircle2,
    Loader2,
    Wrench,
    Phone,
    MapPin,
    Hash,
    Calendar,
    User,
    Car,
    FileText,
    ShoppingCart,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface TransactionItem {
    id: string;
    catalog_id: string;
    qty: number;
    price_at_sale: number;
    cost_at_sale: number;
    catalog: {
        name: string;
        category: string;
    } | null;
}

interface Transaction {
    id: string;
    customer_name: string;
    total_amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    branch_id: string | null;
    booking_id: string | null;
}

interface Branch {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
}

interface BookingInfo {
    booking_code: string;
    customer_phone: string;
    car_model: string;
    license_plate: string;
}

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter();
    const transactionId = params.id as string;
    const invoiceRef = useRef<HTMLDivElement>(null);

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [items, setItems] = useState<TransactionItem[]>([]);
    const [branch, setBranch] = useState<Branch | null>(null);
    const [booking, setBooking] = useState<BookingInfo | null>(null);
    const { globalLogoUrl, logoLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        fetchInvoiceData();
    }, [transactionId]);

    const fetchInvoiceData = async () => {
        setLoading(true);
        try {
            // Fetch transaction
            const { data: txn, error: txnError } = await supabase
                .from("transactions")
                .select("*")
                .eq("id", transactionId)
                .single();

            if (txnError || !txn) {
                setError("Invoice tidak ditemukan.");
                setLoading(false);
                return;
            }

            setTransaction(txn);

            // Fetch transaction items with catalog info
            const { data: txnItems } = await supabase
                .from("transaction_items")
                .select("*, catalog:catalog_id(name, category)")
                .eq("transaction_id", transactionId);

            if (txnItems) setItems(txnItems);

            // Fetch branch info
            if (txn.branch_id) {
                const { data: branchData } = await supabase
                    .from("branches")
                    .select("*")
                    .eq("id", txn.branch_id)
                    .single();
                if (branchData) setBranch(branchData);
            }

            // Fetch booking info if linked
            if (txn.booking_id) {
                const { data: bookingData } = await supabase
                    .from("bookings")
                    .select("booking_code, customer_phone, car_model, license_plate")
                    .eq("id", txn.booking_id)
                    .single();
                if (bookingData) setBooking(bookingData);
            }

        } catch (err: any) {
            setError("Gagal memuat data invoice: " + err.message);
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!transaction) return;

        // Confirmation for cancellation
        if (newStatus === "Cancelled" && !window.confirm("Apakah Anda yakin ingin membatalkan transaksi ini?")) {
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase
                .from("transactions")
                .update({ status: newStatus })
                .eq("id", transaction.id);

            if (updateError) throw updateError;

            // If it was linked to a booking, update booking status too
            if (transaction.booking_id) {
                let bookingStatus = "";
                if (newStatus === "Cancelled") bookingStatus = "pending";
                else if (newStatus === "In Progress") bookingStatus = "processing";
                else if (newStatus === "Paid") bookingStatus = "completed";

                if (bookingStatus) {
                    await supabase
                        .from("bookings")
                        .update({
                            status: bookingStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", transaction.booking_id);
                }
            }

            // Refresh data
            await fetchInvoiceData();
            router.refresh();
        } catch (err: any) {
            alert("Gagal update status: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReopenInvoice = async () => {
        if (!transaction) return;

        if (!window.confirm("Buka kembali transaksi ini? Transaksi akan dikembalikan menjadi Draft untuk diedit.")) {
            return;
        }

        setLoading(true);
        try {
            // 1. Jika ada stok yang terpotong, kembalikan stoknya
            const { data: items } = await supabase
                .from("transaction_items")
                .select("qty, catalog_id, catalog:catalog_id(category, stock)")
                .eq("transaction_id", transaction.id);

            if (items) {
                for (const item of items) {
                    const cat = item.catalog as any;
                    if (cat && cat.category === 'Spare Part' && cat.stock !== null) {
                        await supabase
                            .from("catalog")
                            .update({ stock: cat.stock + item.qty })
                            .eq("id", item.catalog_id);
                    }
                }
            }

            // 2. Ubah status transaksi menjadi Draft
            await supabase
                .from("transactions")
                .update({ status: 'Draft' })
                .eq("id", transaction.id);

            // 3. Jika terkait dengan booking, pastikan booking status kembali menjadi processing
            if (transaction.booking_id) {
                await supabase
                    .from("bookings")
                    .update({ status: 'processing', updated_at: new Date().toISOString() })
                    .eq("id", transaction.booking_id);
            }

            // 4. Redirect kembali ke POS
            router.push(`/pos?draft_id=${transaction.id}${transaction.booking_id ? `&booking_id=${transaction.booking_id}` : ''}`);
        } catch (err: any) {
            alert("Gagal membuka kembali transaksi: " + err.message);
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const generateInvoiceNumber = (id: string, createdAt: string) => {
        const date = new Date(createdAt);
        const yy = date.getFullYear().toString().slice(-2);
        const mm = (date.getMonth() + 1).toString().padStart(2, "0");
        const dd = date.getDate().toString().padStart(2, "0");
        const shortId = id.slice(0, 6).toUpperCase();
        return `INV-${yy}${mm}${dd}-${shortId}`;
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Memuat invoice...</p>
                </div>
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={28} className="text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Tidak Ditemukan</h2>
                    <p className="text-slate-500 text-sm mb-6">{error || "Data transaksi tidak tersedia."}</p>
                    <button
                        onClick={() => router.push("/pos")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Kembali ke POS
                    </button>
                </div>
            </div>
        );
    }

    const invoiceNumber = generateInvoiceNumber(transaction.id, transaction.created_at);
    const subtotal = items.reduce((acc, item) => acc + item.price_at_sale * item.qty, 0);

    return (
        <>
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .invoice-container,
                    .invoice-container * {
                        visibility: visible;
                    }
                    .invoice-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .invoice-paper {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                    }
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-slide-up {
                    animation: slideUp 0.5s ease-out forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                .animate-scale-in {
                    animation: scaleIn 0.4s ease-out forwards;
                }
            `}</style>

            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-slate-100 pb-20 sm:pb-32">
                {/* Action Bar - Not printed */}
                <div className="no-print sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                        <button
                            onClick={() => router.push("/pos")}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
                        >
                            <ArrowLeft size={18} />
                            <span className="hidden sm:inline">Kembali ke POS</span>
                            <span className="sm:hidden">Kembali</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push("/pos")}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                            >
                                <ShoppingCart size={14} />
                                <span className="hidden sm:inline">Transaksi Baru</span>
                            </button>
                            <button
                                onClick={() => router.push("/antrian")}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                <ShoppingCart size={14} />
                                <span className="hidden sm:inline">Antrian</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                <Printer size={16} />
                                <span>Cetak</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="invoice-container max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
                    {/* UPDATE PROGRESS LAYANAN - Shown for draft/in-progress transactions */}
                    {transaction.status !== "Paid" && transaction.status !== "Cancelled" && (
                        <div className="no-print mb-6 animate-scale-in">
                            <div className="bg-white rounded-2xl p-5 shadow-xl shadow-slate-200 border border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                                    Update Progress Layanan
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {transaction.status === "Draft" && (
                                        <button
                                            onClick={() => handleUpdateStatus("In Progress")}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                        >
                                            <Wrench size={18} />
                                            Mulai Kerjakan
                                        </button>
                                    )}
                                    {transaction.status === "In Progress" && (
                                        <button
                                            onClick={() => router.push(`/pos?draft_id=${transaction.id}${transaction.booking_id ? `&booking_id=${transaction.booking_id}` : ''}`)}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            <CheckCircle2 size={18} />
                                            Selesaikan di POS
                                        </button>
                                    )}
                                    {transaction.status !== "Cancelled" && (
                                        <button
                                            onClick={() => handleUpdateStatus("Cancelled")}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                        >
                                            <X size={18} />
                                            Batalkan
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Banner - Shown only for Paid transactions */}
                    {transaction.status === "Paid" && (
                        <div className="no-print mb-6 animate-scale-in">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 sm:p-5 shadow-xl shadow-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm sm:text-base">Transaksi Berhasil! 🎉</p>
                                        <p className="text-emerald-100 text-xs sm:text-sm">Invoice telah dibuat dan siap dicetak untuk pelanggan.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleReopenInvoice}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-all border border-white/30 backdrop-blur-md whitespace-nowrap"
                                >
                                    Buka & Edit Kembali
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Invoice Paper */}
                    <div ref={invoiceRef} className="invoice-paper bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-slide-up">
                        {/* Invoice Header */}
                        <div className="p-6 sm:p-10 border-b-[3px] border-slate-900 bg-white">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        {logoLoading ? (
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
                                        ) : globalLogoUrl ? (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 max-w-20 bg-white rounded-xl flex items-center justify-center shrink-0">
                                                <img
                                                    src={globalLogoUrl}
                                                    alt="Logo Bengkel"
                                                    className="w-full h-full object-contain mix-blend-multiply"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center print:bg-slate-900 shadow-md">
                                                <Wrench size={24} className="text-white" />
                                            </div>
                                        )}
                                        <div>
                                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">BENGKEL PRO</h1>
                                            {branch && (
                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{branch.name}</p>
                                            )}
                                        </div>
                                    </div>
                                    {branch?.address && (
                                        <p className="text-slate-600 text-sm mt-2 max-w-xs leading-relaxed">
                                            {branch.address}
                                        </p>
                                    )}
                                    {branch?.phone && (
                                        <p className="text-slate-600 text-sm mt-1 font-medium">
                                            Telp: {branch.phone}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:text-right flex flex-col sm:items-end">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                                        INVOICE
                                    </p>
                                    <p className="text-xl sm:text-2xl font-mono font-black text-slate-900">{invoiceNumber}</p>
                                    <div className="mt-3 text-slate-600 font-medium text-sm">
                                        Tanggal: {formatDate(transaction.created_at)}
                                    </div>
                                    <div className="mt-4">
                                        <span className={cn(
                                            "inline-block px-4 py-1.5 border-2 text-xs font-black uppercase tracking-[0.2em] rounded-md",
                                            transaction.status === "Paid"
                                                ? "border-slate-900 text-slate-900 print:border-black print:text-black"
                                                : "border-slate-300 text-slate-500 print:border-gray-500 print:text-gray-500"
                                        )}>
                                            {transaction.status === "Paid" ? "LUNAS" : "BELUM LUNAS"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer & Booking Info */}
                        <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-200 bg-white">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Ditagihkan Kepada</p>
                                    <div className="text-slate-900">
                                        <p className="font-bold text-lg">{transaction.customer_name}</p>
                                        {booking?.customer_phone && (
                                            <p className="text-sm mt-1 text-slate-600">{booking.customer_phone}</p>
                                        )}
                                    </div>
                                </div>

                                {booking && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Informasi Kendaraan</p>
                                        <div className="text-slate-900 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
                                            <span className="text-slate-500">Model Kendaraan</span>
                                            <span className="font-bold">{booking.car_model}</span>

                                            <span className="text-slate-500">Plat Nomor</span>
                                            <span className="font-mono font-bold">{booking.license_plate}</span>

                                            {booking?.booking_code && (
                                                <>
                                                    <span className="text-slate-500">Kode Booking</span>
                                                    <span className="font-mono font-bold text-slate-700">{booking.booking_code}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="p-6 sm:p-10 pb-8 bg-white overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr className="border-b-[2px] border-slate-800 text-xs font-black text-slate-900 uppercase tracking-widest">
                                        <th className="py-4 px-2 w-12 text-center">No</th>
                                        <th className="py-4 px-2">Deskripsi Item</th>
                                        <th className="py-4 px-2 w-20 text-center">Qty</th>
                                        <th className="py-4 px-2 w-32 text-right">Harga</th>
                                        <th className="py-4 px-2 w-36 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                        <tr key={item.id} className="group">
                                            <td className="py-4 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                                            <td className="py-4 px-2">
                                                <p className="font-bold text-slate-900">{item.catalog?.name || "Item"}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-medium mt-0.5 tracking-wider">{item.catalog?.category || "-"}</p>
                                            </td>
                                            <td className="py-4 px-2 text-center font-bold text-slate-700">{item.qty}</td>
                                            <td className="py-4 px-2 text-right font-medium">Rp {item.price_at_sale.toLocaleString("id-ID")}</td>
                                            <td className="py-4 px-2 text-right font-black text-slate-900">Rp {(item.price_at_sale * item.qty).toLocaleString("id-ID")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="pt-6"></td>
                                        <td className="pt-6 px-2 text-right text-sm text-slate-500 font-bold border-t-[2px] border-slate-800 uppercase tracking-wider">
                                            Subtotal
                                        </td>
                                        <td className="pt-6 px-2 text-right text-sm font-black text-slate-900 border-t-[2px] border-slate-800">
                                            Rp {subtotal.toLocaleString("id-ID")}
                                        </td>
                                    </tr>
                                    {transaction.payment_method && (
                                        <tr>
                                            <td colSpan={3} className="pt-2"></td>
                                            <td className="pt-2 px-2 text-right text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                                Metode Bayar
                                            </td>
                                            <td className="pt-2 px-2 text-right text-sm font-bold text-slate-700 uppercase">
                                                {transaction.payment_method}
                                            </td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td colSpan={3} className="pt-4 pb-2"></td>
                                        <td className="pt-4 pb-2 px-2 text-right text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
                                            TOTAL
                                        </td>
                                        <td className="pt-4 pb-2 px-2 text-right text-2xl font-black text-slate-900">
                                            Rp {transaction.total_amount.toLocaleString("id-ID")}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 sm:px-10 py-6 bg-slate-50 border-t border-slate-200">
                            <div className="text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Terima Kasih! 🙏</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Simpan invoice ini sebagai bukti pembayaran yang sah.</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                    <Wrench size={12} />
                                    <span>BENGKEL PRO</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
