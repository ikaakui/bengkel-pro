"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
    Printer, 
    ArrowLeft, 
    CheckCircle2, 
    Loader2, 
    MapPin, 
    Calendar, 
    Clock, 
    Car, 
    Smartphone,
    User,
    Building2,
    CreditCard,
    FileText,
    Wrench,
    QrCode,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface Booking {
    id: string;
    booking_code: string;
    customer_name: string;
    customer_phone: string;
    car_model: string;
    license_plate: string;
    service_date: string;
    service_time: string;
    status: string;
    branch_id: string;
    created_at: string;
    branches?: {
        name: string;
        address: string;
        phone: string;
    };
}

export default function BookingInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const bookingCode = params.code as string;
    const { globalLogoUrl, logoLoading } = useAuth();
    const invoiceRef = useRef<HTMLDivElement>(null);

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        fetchBookingData();
    }, [bookingCode]);

    const fetchBookingData = async () => {
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from("bookings")
                .select("*, branches:branch_id(name, address, phone)")
                .eq("booking_code", bookingCode)
                .single();

            if (fetchError || !data) {
                setError("Data booking tidak ditemukan.");
            } else {
                setBooking(data);
            }
        } catch (err: any) {
            setError("Gagal memuat data: " + err.message);
        } finally {
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary mb-4" size={40} />
                    <p className="text-slate-500 font-medium animate-pulse">Menyiapkan Invoice Anda...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !booking) {
        return (
            <DashboardLayout>
                <div className="max-w-md mx-auto text-center py-20">
                    <div className="w-20 h-20 bg-red-50 text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <FileText size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Ada Masalah</h2>
                    <p className="text-slate-500 mb-8">{error || "Data booking tidak ditemukan."}</p>
                    <Button onClick={() => router.push("/booking-online")} className="rounded-2xl h-12 px-8 font-bold">
                        Kembali ke Booking Online
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const waNumber = booking?.branches?.phone ? booking.branches.phone.replace(/\D/g, '') : "6281234567890";
    const formattedWa = waNumber.startsWith('0') ? '62' + waNumber.substring(1) : waNumber;
    const waMessage = `Halo Admin, saya ingin mengirimkan bukti transfer DP untuk kode booking *${booking?.booking_code}*`;
    const waLink = `https://wa.me/${formattedWa}?text=${encodeURIComponent(waMessage)}`;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <style jsx global>{`
                    @media print {
                        @page { margin: 0.5cm; }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            background: white !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .invoice-card {
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                        }
                        main {
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        .dashboard-layout-content {
                            padding: 0 !important;
                        }
                    }
                `}</style>

                <div className="max-w-4xl mx-auto pb-20">
                    {/* Header Actions */}
                    <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.push("/booking-online")}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-sm"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">Invoice Booking</h1>
                                <p className="text-slate-500 text-sm font-medium">Selesaikan proses reservasi Anda.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none h-12 px-6 rounded-2xl gap-2 font-bold border-slate-200 hover:bg-slate-50">
                                <Printer size={18} /> CETAK INVOICE
                            </Button>
                            <Button onClick={() => router.push("/")} className="flex-1 sm:flex-none h-12 px-6 rounded-2xl font-black shadow-xl shadow-primary/20">
                                KE DASHBOARD
                            </Button>
                        </div>
                    </div>

                    {/* Invoice Main Content */}
                    <Card className="invoice-card border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
                        {/* Header Branding */}
                        <div className="relative p-8 sm:p-12 bg-white border-b border-slate-100 overflow-hidden">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                            <div className="relative flex flex-col md:flex-row justify-between gap-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        {logoLoading ? (
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl animate-pulse" />
                                        ) : globalLogoUrl ? (
                                            <img src={globalLogoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                                        ) : (
                                            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                                                <Wrench size={32} />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tighter text-slate-900">INKA OTOSERVICE</h2>
                                            <p className="text-primary font-bold text-xs uppercase tracking-widest">{booking.branches?.name || "Pusat Perawatan Kendaraan"}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-w-xs">
                                        <div className="flex items-start gap-3 text-slate-500 text-sm">
                                            <MapPin size={18} className="shrink-0 mt-0.5 text-slate-400" />
                                            <p className="leading-relaxed font-medium">{booking.branches?.address || "Alamat Bengkel Inka Otoservice"}</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500 text-sm">
                                            <Smartphone size={18} className="shrink-0 text-slate-400" />
                                            <p className="font-bold">{booking.branches?.phone || "0812-XXXX-XXXX"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:text-right flex flex-col md:items-end justify-center">
                                    <div className="bg-slate-900 text-white px-8 py-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Kode Booking Member</p>
                                        <p className="text-4xl font-black font-mono tracking-tighter group-hover:scale-105 transition-transform duration-500">{booking.booking_code}</p>
                                        <div className="mt-4 flex items-center md:justify-end gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                            <Check size={12} strokeWidth={3} /> Terdaftar di Sistem
                                        </div>
                                    </div>
                                    <div className="mt-6 space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Booking</p>
                                        <p className="text-slate-700 font-bold">{formatDate(booking.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer & Unit Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 bg-slate-50/50">
                            <div className="p-8 sm:p-12 border-b md:border-b-0 md:border-r border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary border border-slate-100">
                                        <User size={16} />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tagihan Kepada</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{booking.customer_name}</p>
                                        <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                                            <Smartphone size={14} /> {booking.customer_phone}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <Badge className="bg-amber-100 text-amber-700 border-none font-bold">LOYAL MEMBER</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 sm:p-12">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary border border-slate-100">
                                        <Car size={16} />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Unit Kendaraan</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merek & Tipe</p>
                                            <p className="font-bold text-slate-900">{booking.car_model}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plat Nomor</p>
                                            <p className="font-mono font-black text-slate-900 text-lg">{booking.license_plate}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-primary" />
                                                <span className="text-xs font-bold text-slate-600">{booking.service_date}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-primary" />
                                                <span className="text-xs font-bold text-slate-600">{booking.service_time} WIB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items / Fee Section */}
                        <div className="p-8 sm:p-12 bg-white">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <th className="py-4 text-left">Deskripsi</th>
                                        <th className="py-4 text-center">Qty</th>
                                        <th className="py-4 text-right">Harga</th>
                                        <th className="py-4 text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="group">
                                        <td className="py-8">
                                            <p className="font-black text-slate-900 text-lg">Booking Fee / DP Servis</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">Biaya komitmen reservasi jadwal di {booking.branches?.name}</p>
                                        </td>
                                        <td className="py-8 text-center font-bold text-slate-700 text-lg">1</td>
                                        <td className="py-8 text-right font-bold text-slate-700 text-lg">Rp 50.000</td>
                                        <td className="py-8 text-right font-black text-slate-900 text-xl">Rp 50.000</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-900">
                                        <td colSpan={2} className="py-8">
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 max-w-sm">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Informasi Pembayaran</p>
                                                <p className="text-xs text-slate-600 leading-relaxed font-medium">Biaya servis akan dihitung setelah unit diperiksa. Untuk mengunci jadwal, <strong>wajib mentransfer Booking Fee / DP</strong> dan mengirimkan bukti transfer via WhatsApp.</p>
                                            </div>
                                        </td>
                                        <td className="py-8 text-right">
                                            <div className="space-y-4">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subtotal</p>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pajak (0%)</p>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-widest pt-2">Total Tagihan</p>
                                            </div>
                                        </td>
                                        <td className="py-8 text-right">
                                            <div className="space-y-4">
                                                <p className="text-sm font-bold text-slate-700">Rp 50.000</p>
                                                <p className="text-sm font-bold text-slate-700">Rp 0</p>
                                                <div className="bg-primary text-white px-6 py-3 rounded-2xl inline-block mt-2">
                                                    <p className="text-2xl font-black">Rp 50.000</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Payment Instructions / QR */}
                        <div className="p-8 sm:p-12 bg-slate-900 text-white flex flex-col md:flex-row items-center gap-10">
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight mb-2">Petunjuk & Konfirmasi</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-5">Untuk menyelesaikan reservasi, Anda <strong>wajib mentransfer</strong> biaya di atas dan mengirimkan bukti transfer agar jadwal Anda terkunci di sistem kami.</p>
                                    <a 
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-emerald-500/20"
                                    >
                                        <Smartphone size={18} /> KIRIM BUKTI VIA WA
                                    </a>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Transfer Ke (Optional)</p>
                                            <p className="text-sm font-bold">BCA: 123-456-7890</p>
                                            <p className="text-[10px] text-slate-400">a/n Inka Otoservice</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Metode Bayar</p>
                                            <p className="text-sm font-bold uppercase tracking-tight">CASH / TRANSFER</p>
                                            <p className="text-[10px] text-slate-400">Saat unit selesai dikerjakan</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-center gap-4">
                                <div className="p-4 bg-white rounded-3xl shadow-2xl">
                                    <QrCode size={120} className="text-slate-900" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Scan for Details</p>
                            </div>
                        </div>
                        
                        {/* Footer Disclaimer */}
                        <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Thank you for choosing Inka Otoservice</p>
                        </div>
                    </Card>

                    {/* Bottom Action no-print */}
                    <div className="no-print mt-8 text-center space-y-4">
                        <p className="text-slate-400 text-xs font-medium">Invoice ini sah diterbitkan secara digital oleh sistem reservasi Inka Otoservice.</p>
                        <div className="flex justify-center gap-4">
                            <button className="text-slate-500 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Smartphone size={14} /> Hubungi Admin
                            </button>
                            <span className="text-slate-200">|</span>
                            <button className="text-slate-500 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} /> Lihat Lokasi
                            </button>
                        </div>
                    </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
