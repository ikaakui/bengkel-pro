"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import {
    Plus, Search, Calendar, User, Phone, Car, Loader2, RefreshCw,
    AppWindow, Clock, CalendarRange, CheckCircle2, X, Copy, Check,
    Users, Zap, Hash, MapPin, ArrowRight, Edit
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

type BookingTab = 'all' | 'direct' | 'referral';

export default function BookingsPage() {
    const { profile, role, branchId, branchName } = useAuth();
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);

    // Form state
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [carModel, setCarModel] = useState("");
    const [licensePlate, setLicensePlate] = useState("");
    const [serviceDate, setServiceDate] = useState("");
    const [serviceTime, setServiceTime] = useState("");
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Code input state (admin)
    const [codeInput, setCodeInput] = useState("");
    const [codeSearching, setCodeSearching] = useState(false);
    const [foundBooking, setFoundBooking] = useState<any | null>(null);
    const [codeError, setCodeError] = useState("");

    // Generated code state (mitra)
    const [generatedCode, setGeneratedCode] = useState("");
    const [codeCopied, setCodeCopied] = useState(false);

    // Availability state
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);
    const [isLoadingTimes, setIsLoadingTimes] = useState(false);

    // Data state
    const [bookings, setBookings] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<BookingTab>('direct');
    const supabase = createClient();

    const isAdmin = role === 'admin' || role === 'owner';

    const fetchBookings = async () => {
        setIsLoadingData(true);
        let query = supabase
            .from("bookings")
            .select("*, member:member_id(full_name, referral_code)")
            .order("created_at", { ascending: false })
            .limit(100);

        if (role === 'member' && profile?.id) {
            query = query.eq('member_id', profile.id);
        } else if (branchId && role !== 'owner') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;

        if (data) {
            setBookings(data);
        }
        setIsLoadingData(false);
    };

    const fetchBranches = async () => {
        const { data } = await supabase.from("branches").select("id, name");
        if (data) {
            const uniqueBranches = data.filter((branch, index, self) =>
                index === self.findIndex((t) => t.name === branch.name)
            );
            setBranches(uniqueBranches);
        }
    };

    useEffect(() => {
        fetchBookings();
        if (role === 'member') fetchBranches();
    }, [profile]);

    useEffect(() => {
        const fetchBookedTimes = async () => {
            if (!serviceDate) {
                setBookedTimes([]);
                return;
            }
            setIsLoadingTimes(true);
            const targetBranch = isAdmin ? branchId : selectedBranchId;
            let query = supabase
                .from("bookings")
                .select("service_time")
                .eq("service_date", serviceDate)
                .in("status", ["pending", "confirmed", "processing", "completed"]);
            if (targetBranch) query = query.eq("branch_id", targetBranch);

            const { data } = await query;
            if (data) setBookedTimes(data.map(b => b.service_time));
            setIsLoadingTimes(false);
        };
        fetchBookedTimes();
    }, [serviceDate, selectedBranchId, supabase]);

    // Generate booking code: BK-[CABANG]-[DDMM]-[URUTAN]
    const generateBookingCode = async (targetBranchId: string): Promise<string> => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');

        // Get branch abbreviation
        const branch = branches.find(b => b.id === targetBranchId);
        let prefix = 'XXX';
        if (branch) {
            const name = branch.name.toUpperCase().replace(/CABANG\s*/i, '').trim();
            prefix = name.substring(0, 3);
        }
        // Also handle admin's branch
        if (isAdmin && branchName) {
            const name = branchName.toUpperCase().replace(/CABANG\s*/i, '').trim();
            prefix = name.substring(0, 3);
        }

        // Count existing bookings today for this branch
        const todayStr = now.toISOString().split('T')[0];
        const { count } = await supabase
            .from("bookings")
            .select("*", { count: 'exact', head: true })
            .gte("created_at", todayStr + "T00:00:00")
            .lte("created_at", todayStr + "T23:59:59")
            .eq("branch_id", targetBranchId);

        const seq = String((count || 0) + 1).padStart(3, '0');
        return `BK-${prefix}-${dd}${mm}-${seq}`;
    };

    // Admin: search booking by code
    const handleCodeSearch = async () => {
        if (!codeInput.trim()) return;
        const cleanInput = codeInput.trim().toUpperCase();
        setCodeSearching(true);
        setCodeError("");
        setFoundBooking(null);

        // First attempt: exact match
        let { data, error } = await supabase
            .from("bookings")
            .select("*, member:member_id(full_name, referral_code)")
            .eq("booking_code", cleanInput)
            .maybeSingle();

        // Second attempt: if exact fails, try stripping hyphens
        if (!data && cleanInput.includes('BK')) {
            const searchCode = cleanInput.replace(/-/g, '');
            const { data: fuzzyData } = await supabase
                .from("bookings")
                .select("*, member:member_id(full_name, referral_code)")
                .ilike("booking_code", `%${searchCode.replace('BK', '')}%`)
                .limit(10);
            
            if (fuzzyData && fuzzyData.length > 0) {
                const match = fuzzyData.find(b => (b.booking_code || '').replace(/-/g, '') === searchCode);
                if (match) data = match;
            }
        }

        if (!data) {
            // Global search fallback
            const { data: globalData } = await supabase
                .rpc('search_booking_global', { target_code: cleanInput });
            
            if (globalData && globalData.length > 0) {
                data = globalData[0];
            }
        }

        if (!data) {
            let msg = "Kode booking tidak ditemukan. Pastikan kode sudah benar.";
            if (role !== 'owner' && role !== 'admin') {
                msg += ` (Pencarian terbatas untuk cabang ${branchName || 'Anda'})`;
            }
            setCodeError(msg);
        } else if (data.status !== 'pending') {
            setCodeError(`Booking ini sudah berstatus "${data.status}". Hanya booking pending yang bisa dikonfirmasi.`);
            setFoundBooking(data);
        } else {
            setFoundBooking(data);
        }
        setCodeSearching(false);
    };

    // Admin: confirm a mitra's booking
    const handleConfirmBooking = async (bookingId: string) => {
        setIsSaving(true);
        const { error } = await supabase
            .from("bookings")
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq("id", bookingId);

        if (!error) {
            // Auto-create a Draft transaction so it immediately appears in Antrian (Queue)
            const { data: bookingData } = await supabase.from("bookings").select("customer_name, branch_id").eq("id", bookingId).single();
            const { data: existingTxn } = await supabase
                .from("transactions")
                .select("id")
                .eq("booking_id", bookingId)
                .maybeSingle();

            if (!existingTxn && bookingData) {
                await supabase
                    .from("transactions")
                    .insert({
                        customer_name: bookingData.customer_name,
                        total_amount: 0,
                        branch_id: bookingData.branch_id,
                        payment_method: "Cash",
                        status: "Draft",
                        booking_id: bookingId
                    });
            }
        }

        setIsSaving(false);
        if (error) {
            alert(`Gagal konfirmasi: ${error.message}`);
        } else {
            // Langsung redirect ke POS dengan booking_id
            router.push(`/pos?booking_id=${bookingId}`);
        }
    };

    // Member: save booking with code
    const handleSaveBookingMember = async () => {
        if (!customerName || !customerPhone || !carModel || !licensePlate || !serviceDate || !serviceTime || !selectedBranchId) {
            alert("Harap lengkapi semua data termasuk cabang dan jadwal!");
            return;
        }
        if (!profile) {
            alert("Sesi tidak valid. Silakan login ulang.");
            return;
        }

        setIsSaving(true);
        const code = await generateBookingCode(selectedBranchId);

        const { error } = await supabase.from("bookings").insert([{
            customer_name: customerName,
            customer_phone: customerPhone,
            car_model: carModel,
            license_plate: licensePlate.toUpperCase(),
            service_date: serviceDate,
            service_time: serviceTime,
            member_id: profile.id,
            branch_id: selectedBranchId,
            booking_code: code,
            booking_type: 'referral',
            status: 'pending'
        }]);

        setIsSaving(false);
        if (error) {
            alert(`Gagal menyimpan: ${error.message}`);
        } else {
            setGeneratedCode(code);
            setCustomerName("");
            setCustomerPhone("");
            setCarModel("");
            setLicensePlate("");
            setServiceDate("");
            setServiceTime("");
            fetchBookings();
        }
    };

    // Admin: save direct booking
    const handleSaveBookingDirect = async () => {
        if (!customerName || !customerPhone || !carModel || !licensePlate || !serviceDate || !serviceTime) {
            alert("Harap lengkapi semua data form booking!");
            return;
        }
        if (!profile || !branchId) {
            alert("Sesi tidak valid. Silakan login ulang.");
            return;
        }

        setIsSaving(true);

        const { error } = await supabase.from("bookings").insert([{
            customer_name: customerName,
            customer_phone: customerPhone,
            car_model: carModel,
            license_plate: licensePlate.toUpperCase(),
            service_date: serviceDate,
            service_time: serviceTime,
            member_id: null,
            branch_id: branchId,
            booking_code: null,
            booking_type: 'direct',
            status: 'pending'
        }]);

        setIsSaving(false);
        if (error) {
            alert(`Gagal menyimpan: ${error.message}`);
        } else {
            alert(`✅ Booking direct berhasil!`);
            setShowForm(false);
            setCustomerName("");
            setCustomerPhone("");
            setCarModel("");
            setLicensePlate("");
            setServiceDate("");
            setServiceTime("");
            fetchBookings();
        }
    };

    const updateBookingStatus = async (id: string, newStatus: string) => {
        setIsSaving(true);
        const { error } = await supabase
            .from("bookings")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", id);

        setIsSaving(false);
        if (error) {
            alert(`Gagal update status: ${error.message}`);
        } else {
            alert(`✅ Status berhasil diubah menjadi ${newStatus}`);
            if (selectedBooking) setSelectedBooking({ ...selectedBooking, status: newStatus });
            fetchBookings();
        }
    };

    const handleReopenBooking = async (id: string) => {
        setIsSaving(true);
        try {
            // 1. Kembalikan status booking menjadi processing (agar tidak tertutup)
            await supabase
                .from("bookings")
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .eq("id", id);

            // 2. Cari transaksi yang terkait dengan booking ini
            const { data: txn, error: txnError } = await supabase
                .from("transactions")
                .select("id, status")
                .eq("booking_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            // 3. Jika tidak ada transaksi (kasus booking lama yang Selesai Tanpa POS), langsung ke POS
            if (txnError || !txn) {
                router.push(`/pos?booking_id=${id}`);
                return;
            }

            // 4. Jika ada dan transaksinya 'Paid' (Selesai), kembalikan ke 'Draft' dan pulihkan stok
            if (txn.status === "Paid") {
                const { data: items } = await supabase
                    .from("transaction_items")
                    .select("qty, catalog_id, catalog:catalog_id(category, stock)")
                    .eq("transaction_id", txn.id);

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

                await supabase
                    .from("transactions")
                    .update({ status: 'Draft' })
                    .eq("id", txn.id);
            }

            // 5. Buka kembali di POS dengan draft_id
            router.push(`/pos?draft_id=${txn.id}&booking_id=${id}`);
        } catch (error: any) {
            alert("Gagal membuka kembali booking: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    // Filter bookings
    const filteredBookings = bookings
        .filter(bk => {
            if (activeTab === 'direct') return bk.booking_type === 'direct' || !bk.member_id;
            if (activeTab === 'referral') return bk.booking_type === 'referral' || bk.member_id;
            return true;
        })
        .filter(bk =>
            bk.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bk.car_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bk.license_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bk.booking_code?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const statusVariant = (s: string) =>
        s === 'completed' ? 'success' : 
        s === 'confirmed' ? 'success' : 
        s === 'pending' ? 'warning' : 
        s === 'processing' ? 'info' : 'danger';

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">
                            {isAdmin ? 'Booking Member' : 'Pemesanan Servis'}
                        </h2>
                        <p className="text-slate-500 mt-1">
                            {isAdmin
                                ? `Kelola booking titipan member cabang ${branchName || ''}.`
                                : 'Daftarkan pelanggan dan dapatkan kode booking.'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {isAdmin && (
                            <Button
                                variant="outline"
                                onClick={() => { setShowCodeInput(!showCodeInput); setShowForm(false); }}
                                className="h-12 px-5"
                            >
                                <Hash size={18} className="mr-2" />
                                Konfirmasi Kode Member
                            </Button>
                        )}
                        <Button
                            onClick={() => { setShowForm(!showForm); setShowCodeInput(false); setGeneratedCode(""); }}
                            className="h-12 px-6"
                        >
                            <Plus size={20} className="mr-2" />
                            {isAdmin ? 'Booking Direct' : 'Buat Booking'}
                        </Button>
                    </div>
                </div>

                {/* Member: Generated Code Success */}
                {generatedCode && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6"
                    >
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 size={24} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-emerald-800 font-bold text-lg">Booking Berhasil!</p>
                                    <p className="text-emerald-600 text-sm">Kirim kode ini ke customer:</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-emerald-800 font-mono tracking-wider bg-emerald-100 px-5 py-2.5 rounded-xl">
                                    {generatedCode}
                                </span>
                                <Button
                                    variant="outline"
                                    className="h-11 px-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => copyCode(generatedCode)}
                                >
                                    {codeCopied ? <Check size={18} /> : <Copy size={18} />}
                                </Button>
                            </div>
                        </div>
                        <button
                            onClick={() => setGeneratedCode("")}
                            className="mt-3 text-xs font-bold text-emerald-500 hover:text-emerald-700"
                        >
                            Tutup
                        </button>
                    </motion.div>
                )}

                {/* Admin: Code Input Section */}
                {showCodeInput && isAdmin && (
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Hash className="text-blue-600" size={22} />
                                Konfirmasi Kode Booking Member
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Masukkan kode booking dari pelanggan member untuk memulai servis.</p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Contoh: BK-BSD-0403-001"
                                        className="input-field pl-4 py-3 w-full font-mono text-lg uppercase tracking-wider"
                                        value={codeInput}
                                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCodeSearch()}
                                    />
                                </div>
                                <Button onClick={handleCodeSearch} className="h-[50px] px-6" disabled={codeSearching || !codeInput.trim()}>
                                    {codeSearching ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
                                    Cari
                                </Button>
                            </div>

                            {codeError && (
                                <p className="text-red-600 text-sm font-bold mt-3 bg-red-50 px-4 py-2 rounded-xl">{codeError}</p>
                            )}

                            {foundBooking && foundBooking.status === 'pending' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 bg-white rounded-xl border border-blue-200 p-5"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge variant="success" className="text-xs">✅ Booking Ditemukan</Badge>
                                        <span className="font-mono text-xs font-bold text-slate-400">{foundBooking.booking_code}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Customer</p>
                                            <p className="font-bold text-slate-900">{foundBooking.customer_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Mobil</p>
                                            <p className="font-bold text-slate-900">{foundBooking.car_model} • {foundBooking.license_plate}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Member</p>
                                            <p className="font-bold text-blue-600">{foundBooking.member?.full_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Jadwal</p>
                                            <p className="font-bold text-slate-900">
                                                {new Date(foundBooking.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {foundBooking.service_time}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="success"
                                        className="w-full mt-4 h-11"
                                        onClick={() => handleConfirmBooking(foundBooking.id)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
                                        Konfirmasi & Mulai Kerjakan
                                    </Button>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Form Booking Baru */}
                {showForm && (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <h3 className="text-xl font-bold">
                                {isAdmin ? '📋 Booking Direct (Walk-in)' : '📋 Daftarkan Customer Baru'}
                            </h3>
                            {isAdmin && <p className="text-sm text-slate-500 mt-1">Customer langsung datang tanpa kode booking.</p>}
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold opacity-70">Nama Pelanggan</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="Contoh: Budi" className="input-field pl-10"
                                            value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold opacity-70">No. WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="0812..." className="input-field pl-10"
                                            value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold opacity-70">Merek/Tipe Mobil</label>
                                    <div className="relative">
                                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="Avanza, Civic, dll" className="input-field pl-10"
                                            value={carModel} onChange={(e) => setCarModel(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold opacity-70">Nomor Polisi</label>
                                    <div className="relative">
                                        <AppWindow className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="B 1234 CD" className="input-field pl-10 uppercase"
                                            value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
                                    </div>
                                </div>

                                {/* Member: pilih cabang */}
                                {!isAdmin && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold opacity-70">Pilih Cabang</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <select
                                                className="input-field pl-10 bg-white appearance-none"
                                                value={selectedBranchId}
                                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Cabang</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold opacity-70">Tanggal Kedatangan</label>
                                    <div className="relative">
                                        <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="date" className="input-field pl-10 cursor-pointer"
                                            value={serviceDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => { setServiceDate(e.target.value); setServiceTime(""); }}
                                            onClick={(e) => { if ('showPicker' in HTMLInputElement.prototype) (e.currentTarget as any).showPicker(); }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold opacity-70">Jam Kedatangan</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select className="input-field pl-10 bg-white appearance-none"
                                            value={serviceTime} onChange={(e) => setServiceTime(e.target.value)}
                                            disabled={!serviceDate || isLoadingTimes}
                                        >
                                            <option value="" disabled>Pilih Jam</option>
                                            {TIME_SLOTS.map(time => {
                                                const isBooked = bookedTimes.includes(time);
                                                return <option key={time} value={time} disabled={isBooked}>{time} {isBooked ? "(Penuh)" : ""}</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-end lg:col-span-3 justify-end mt-2">
                                    <Button className="w-full sm:w-auto px-8 h-11" variant="success"
                                        onClick={isAdmin ? handleSaveBookingDirect : handleSaveBookingMember}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                                        {isSaving ? "Menyimpan..." : isAdmin ? "Simpan Booking" : "Simpan & Dapatkan Kode"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tab Filter (Admin only) - Hiding for Booking Direct page */}
                {/* {isAdmin && (
                    <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit">
                        {([
                            { key: 'all' as BookingTab, label: 'Semua', icon: Users },
                            { key: 'direct' as BookingTab, label: 'Umum', icon: User },
                            { key: 'referral' as BookingTab, label: 'Member', icon: Users },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.key
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )} */}

                {/* Search + List */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Cari nama, mobil, plat, atau kode booking..."
                                className="input-field pl-12 py-3 w-full"
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={fetchBookings} className="h-[50px] px-4" title="Refresh Data">
                            <RefreshCw size={20} className={isLoadingData ? "animate-spin" : ""} />
                        </Button>
                    </div>

                    {isLoadingData ? (
                        <div className="py-10 flex justify-center items-center">
                            <Loader2 size={32} className="animate-spin text-slate-300" />
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-slate-500 font-medium">Belum ada data booking.</p>
                        </div>
                    ) : filteredBookings.map((bk) => (
                        <Card key={bk.id} className="p-0 overflow-hidden group">
                            <div className="flex flex-col md:flex-row items-stretch">
                                <div className="p-5 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                            <Car size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-lg text-slate-900 uppercase">{bk.car_model}</h4>
                                                <Badge variant="neutral" className="text-xs">{bk.license_plate}</Badge>
                                                {/* Type badge */}
                                                {bk.booking_type === 'direct' || !bk.member_id ? (
                                                    <Badge variant="neutral" className="text-[9px] bg-slate-200 text-slate-600">🏷️ UMUM</Badge>
                                                ) : (
                                                    <Badge variant="info" className="text-[9px]">
                                                        💎 {bk.member?.full_name || 'Member'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">{bk.customer_name} • {bk.customer_phone}</p>
                                            {bk.booking_code && (
                                                <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{bk.booking_code}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Jadwal</p>
                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-1 justify-end">
                                                <Calendar size={14} />
                                                {new Date(bk.service_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • {bk.service_time}
                                            </p>
                                        </div>
                                        <Badge variant={statusVariant(bk.status)}>
                                            {bk.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-4 flex items-center justify-center">
                                    <button className="text-xs font-bold text-primary hover:underline"
                                        onClick={() => setSelectedBooking(bk)}>
                                        LIHAT DETAIL
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Modal Detail Booking */}
                {selectedBooking && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden max-h-[calc(100vh-2rem)] sm:max-h-[85vh]">
                            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Car className="text-primary" />
                                        Detail Booking
                                    </h3>
                                    {selectedBooking.booking_code && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-slate-400 font-mono font-bold">{selectedBooking.booking_code}</p>
                                            <button onClick={() => copyCode(selectedBooking.booking_code)} className="text-slate-400 hover:text-blue-600">
                                                <Copy size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setSelectedBooking(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 min-h-0">
                                {/* Type + Status */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={statusVariant(selectedBooking.status)} className="px-3 py-1 text-sm">
                                        Status: {selectedBooking.status.toUpperCase()}
                                    </Badge>
                                    {selectedBooking.booking_type === 'direct' || !selectedBooking.member_id ? (
                                        <Badge variant="neutral" className="text-xs bg-slate-200 text-slate-600">🏷️ UMUM</Badge>
                                    ) : (
                                        <Badge variant="info" className="text-xs">💎 MEMBER LOYALTY</Badge>
                                    )}
                                </div>

                                {/* Jadwal */}
                                <div className="text-left sm:text-right bg-blue-50 rounded-xl p-4 border border-blue-100">
                                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Jadwal Kedatangan</p>
                                    <p className="text-sm font-semibold flex items-center gap-1.5">
                                        <Calendar size={14} className="text-blue-500 shrink-0" />
                                        {new Date(selectedBooking.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        &nbsp;• {selectedBooking.service_time} WIB
                                    </p>
                                </div>

                                {/* Customer */}
                                <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-xl p-4 sm:p-5">
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Pelanggan</p>
                                            <p className="font-bold text-slate-900 text-base sm:text-lg break-words">{selectedBooking.customer_name}</p>
                                            <p className="text-slate-600 font-medium mt-1 flex items-center gap-1.5 font-mono text-sm">
                                                <Phone size={14} className="text-primary shrink-0" />
                                                {selectedBooking.customer_phone}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle */}
                                <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-xl p-4 sm:p-5">
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                            <Car size={20} />
                                        </div>
                                        <div className="w-full min-w-0">
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Data Kendaraan</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-2">
                                                <p className="font-bold text-slate-900 text-base sm:text-lg truncate">{selectedBooking.car_model}</p>
                                                <Badge variant="neutral" className="font-mono text-xs sm:text-sm tracking-widest w-fit shrink-0">{selectedBooking.license_plate}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Member Info (if referral) */}
                                {selectedBooking.member_id && selectedBooking.member && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">Member Referral</p>
                                            <p className="font-bold text-emerald-800">{selectedBooking.member.full_name}</p>
                                            {selectedBooking.member.referral_code && (
                                                <p className="text-xs text-emerald-600 font-mono">Kode: {selectedBooking.member.referral_code}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Status Update Controls for Admin/Owner */}
                                {(profile?.role === 'admin' || profile?.role === 'owner') && selectedBooking.status !== 'cancelled' && (
                                    <div className="border-t border-slate-100 bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Update Progress Layanan</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {selectedBooking.status === 'pending' && (
                                                <Button variant="primary" className="w-full"
                                                    onClick={() => updateBookingStatus(selectedBooking.id, 'processing')} disabled={isSaving}>
                                                    {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                                                    Mulai Kerjakan
                                                </Button>
                                            )}
                                            {selectedBooking.status === 'processing' && (
                                                <>
                                                    <Button variant="success" className="w-full"
                                                        onClick={() => router.push(`/pos?booking_id=${selectedBooking.id}`)}>
                                                        <ArrowRight size={16} className="mr-2" />
                                                        Proses di POS
                                                    </Button>
                                                </>
                                            )}
                                            {selectedBooking.status === 'completed' && (
                                                <Button variant="warning" className="w-full"
                                                    onClick={() => { if (window.confirm("Buka kembali booking ini? Transaksi akan dikembalikan menjadi Draft untuk diedit.")) handleReopenBooking(selectedBooking.id); }} disabled={isSaving}>
                                                    {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Edit size={16} className="mr-2" />}
                                                    Edit Tagihan di POS
                                                </Button>
                                            )}
                                            <Button variant="danger" className="w-full"
                                                onClick={() => { if (window.confirm("Apakah anda yakin ingin membatalkan booking ini?")) updateBookingStatus(selectedBooking.id, 'cancelled'); }}
                                                disabled={isSaving || selectedBooking.status === 'completed'}>
                                                <X size={16} className="mr-2" />
                                                Batalkan
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
                                <Button className="w-full" variant="primary" onClick={() => setSelectedBooking(null)}>
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
