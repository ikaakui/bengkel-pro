"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    Hash, Search, Loader2, CheckCircle2, User, Car,
    Calendar, Phone, Zap, AlertCircle, ArrowRight, XCircle, Building2
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function KonfirmasiBookingPage() {
    const { branchId, branchName } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [codeInput, setCodeInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [foundBooking, setFoundBooking] = useState<any>(null);
    const [error, setError] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [success, setSuccess] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [pendingBookings, setPendingBookings] = useState<any[]>([]);
    const [fetchingPending, setFetchingPending] = useState(false);

    const { role } = useAuth();

    const fetchPendingBookings = async () => {
        const finalBranchId = branchId || selectedBranchId;
        if (!finalBranchId) return;

        setFetchingPending(true);
        try {
            const { data, error: fetchErr } = await supabase
                .from("bookings")
                .select("*, member:member_id(full_name, total_points)")
                .eq("branch_id", finalBranchId)
                .eq("status", "pending")
                .eq("booking_type", "online")
                .order("service_date", { ascending: true })
                .order("service_time", { ascending: true });
            
            if (data) setPendingBookings(data);
        } catch (err) {
            console.error("Error fetching pending bookings:", err);
        } finally {
            setFetchingPending(false);
        }
    };

    // Fetch branches if branchId is missing
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from("branches").select("*");
            if (data) {
                setBranches(data);
                if (branchId) {
                    setSelectedBranchId(branchId);
                } else if (role === 'admin_bsd') {
                    const bsd = data.find(b => b.name.includes('BSD'));
                    if (bsd) setSelectedBranchId(bsd.id);
                } else if (role === 'admin_depok') {
                    const depok = data.find(b => b.name.includes('Depok'));
                    if (depok) setSelectedBranchId(depok.id);
                }
            }
        };
        fetchBranches();
    }, [branchId, role, supabase]);

    useEffect(() => {
        if (selectedBranchId || branchId) {
            fetchPendingBookings();
            
            // Subscribe to real-time updates
            const channel = supabase
                .channel('pending_bookings_changes')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'bookings',
                    filter: `branch_id=eq.${branchId || selectedBranchId}`
                }, () => {
                    fetchPendingBookings();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedBranchId, branchId, supabase]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!codeInput.trim()) return;

        setLoading(true);
        setError("");
        setFoundBooking(null);
        setSuccess(false);

        try {
            const cleanInput = codeInput.trim().toUpperCase();
            
            // First attempt: exact match
            let { data, error: fetchError } = await supabase
                .from("bookings")
                .select("*, member:member_id(full_name, referral_code, phone_number, total_points)")
                .eq("booking_code", cleanInput)
                .maybeSingle();

            // Second attempt: if exact fails, try stripping hyphens if the input looks like a code
            if (!data && cleanInput.includes('BK')) {
                const searchCode = cleanInput.replace(/-/g, '');
                // Try searching for codes that match without hyphens (heuristic)
                const { data: fuzzyData } = await supabase
                    .from("bookings")
                    .select("*, member:member_id(full_name, referral_code, phone_number, total_points)")
                    .ilike("booking_code", `%${searchCode.replace('BK', '')}%`)
                    .limit(5);
                
                if (fuzzyData && fuzzyData.length > 0) {
                    // Try to find a exact alphanumeric match
                    const match = fuzzyData.find(b => (b.booking_code || '').replace(/-/g, '') === searchCode);
                    if (match) data = match;
                }
            }

            if (!data) {
                // Third attempt: Global search via RPC (bypasses RLS)
                const { data: globalData, error: rpcError } = await supabase
                    .rpc('search_booking_global', { target_code: cleanInput });
                
                if (rpcError) {
                    console.error("RPC Error:", rpcError);
                    setError(`Error Database: ${rpcError.message} (Code: ${rpcError.code}). Pastikan SQL sudah dijalankan di Supabase.`);
                    return;
                }
                
                if (globalData && globalData.length > 0) {
                    data = globalData[0];
                }
            }

            if (!data) {
                let msg = "Kode booking tidak ditemukan. Pastikan kode sudah benar.";
                if (role !== 'owner') {
                    msg += ` (Pencarian terbatas untuk cabang ${branchName || 'Anda'})`;
                }
                setError(msg);
                return;
            }

            if (data.status === 'completed') {
                setError("Booking ini sudah selesai diproses sebelumnya.");
                setFoundBooking(data);
                return;
            }

            if (data.status === 'processing') {
                setError("Booking ini sedang dalam proses pengerjaan.");
                setFoundBooking(data);
                return;
            }

            setFoundBooking(data);
        } catch (err: any) {
            setError("Terjadi kesalahan: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (bookingToConfirm?: any) => {
        const booking = bookingToConfirm || foundBooking;
        if (!booking) return;
        
        const finalBranchId = branchId || selectedBranchId;
        if (!finalBranchId) {
            alert("Harap pilih cabang terlebih dahulu.");
            return;
        }

        setConfirming(true);

        try {
            const { error: updateError } = await supabase
                .from("bookings")
                .update({
                    status: 'processing',
                    branch_id: finalBranchId,
                    updated_at: new Date().toISOString()
                })
                .eq("id", booking.id);

            if (updateError) throw updateError;

            // Auto-create a Draft transaction so it immediately appears in Antrian (Queue)
            const { data: existingTxn } = await supabase
                .from("transactions")
                .select("id")
                .eq("booking_id", booking.id)
                .maybeSingle();

            if (!existingTxn) {
                await supabase
                    .from("transactions")
                    .insert({
                        customer_name: booking.customer_name,
                        total_amount: 0,
                        branch_id: finalBranchId,
                        payment_method: "Cash",
                        status: "Draft",
                        booking_id: booking.id
                    });
            }

            if (bookingToConfirm) {
                // If it was from the list, we don't necessarily show the "Success" screen 
                // but just refresh the list and show a small notification or just let real-time handle it
                fetchPendingBookings();
            } else {
                setSuccess(true);
            }
        } catch (err: any) {
            alert("Gagal konfirmasi: " + err.message);
        } finally {
            setConfirming(false);
        }
    };

    const handleGoToPOS = () => {
        router.push(`/pos?booking_id=${foundBooking.id}`);
    };

    const handleReset = () => {
        setCodeInput("");
        setFoundBooking(null);
        setError("");
        setSuccess(false);
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["admin", "admin_depok", "admin_bsd", "owner", "spv"]}>
                <div className="max-w-4xl mx-auto space-y-8 pb-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                    <Hash size={28} />
                                </div>
                                Konfirmasi Booking
                            </h2>
                            <p className="text-slate-500 mt-2 font-medium ml-[52px]">
                                Konfirmasi pendaftaran member via aplikasi.
                            </p>
                        </div>
                        
                        {!branchId && branches.length > 0 && (
                            <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-2xl border border-amber-100">
                                <Building2 size={16} className="text-amber-600" />
                                <select 
                                    className="bg-transparent border-none text-xs font-bold text-amber-900 focus:ring-0 outline-none"
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                >
                                    <option value="">Pilih Cabang Anda</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Search & Detail Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Search Card */}
                            <Card className="p-2 rounded-[2rem] border-none shadow-2xl shadow-slate-200">
                                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Cari Kode Booking..."
                                            className="w-full h-16 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-300 outline-none text-lg font-black uppercase tracking-widest placeholder:text-slate-300 placeholder:font-medium placeholder:text-sm placeholder:tracking-normal"
                                            value={codeInput}
                                            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading || !codeInput.trim()}
                                        className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <><Search size={18} className="mr-2" /> Cari</>}
                                    </Button>
                                </form>
                            </Card>

                            {/* Result Display */}
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600"
                                    >
                                        <XCircle size={24} />
                                        <span className="font-bold">{error}</span>
                                    </motion.div>
                                )}

                                {foundBooking && !success && foundBooking.status === 'pending' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-8 text-white">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Badge variant="success" className="bg-white/20 border-none text-white text-xs mb-3">✅ BOOKING DITEMUKAN</Badge>
                                                        <h3 className="text-2xl font-black">{foundBooking.customer_name}</h3>
                                                        <p className="text-blue-200 font-mono text-sm font-bold mt-1">{foundBooking.booking_code}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <CardContent className="p-8 space-y-6">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Car size={18} /></div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kendaraan</p>
                                                            <p className="font-bold text-slate-900">{foundBooking.car_model}</p>
                                                            <p className="text-xs text-slate-500 font-mono font-bold">{foundBooking.license_plate}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Phone size={18} /></div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon</p>
                                                            <p className="font-bold text-slate-900">{foundBooking.customer_phone}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={() => handleConfirm()}
                                                    disabled={confirming}
                                                    className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest shadow-xl"
                                                >
                                                    {confirming ? <Loader2 size={20} className="animate-spin mr-2" /> : <><Zap size={20} className="mr-2" /> Konfirmasi & Mulai Proses</>}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {success && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                        <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center text-white">
                                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <CheckCircle2 size={40} />
                                                </div>
                                                <h3 className="text-2xl font-black">Booking Dikonfirmasi!</h3>
                                                <p className="text-emerald-100 mt-2">Kendaraan siap diproses.</p>
                                            </div>
                                            <CardContent className="p-8">
                                                <div className="flex gap-3">
                                                    <Button variant="outline" onClick={handleReset} className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest">Lainnya</Button>
                                                    <Button onClick={handleGoToPOS} className="flex-[2] h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-white">Lanjut ke POS</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Pending List Column */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-600" />
                                    Booking Online
                                </h3>
                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold">
                                    {pendingBookings.length} Total
                                </Badge>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {fetchingPending && pendingBookings.length === 0 ? (
                                    <div className="py-20 text-center space-y-3">
                                        <Loader2 className="animate-spin text-slate-300 mx-auto" size={32} />
                                        <p className="text-xs font-bold text-slate-400">Memuat data...</p>
                                    </div>
                                ) : pendingBookings.length > 0 ? (
                                    pendingBookings.map((b) => (
                                        <motion.div
                                            key={b.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="group relative bg-white border border-slate-100 p-4 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{b.customer_name}</p>
                                                        <p className="text-[10px] font-mono font-bold text-slate-400">{b.booking_code}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-indigo-600">{b.service_time}</p>
                                                        <p className="text-[9px] font-bold text-slate-400">{new Date(b.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 py-2 border-y border-slate-50">
                                                    <div className="flex items-center gap-1">
                                                        <Car size={10} className="text-slate-300" />
                                                        <p className="text-[10px] font-bold text-slate-500">{b.car_model}</p>
                                                    </div>
                                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                    <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">{b.license_plate}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleConfirm(b)}
                                                    size="sm"
                                                    className="w-full h-10 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                                                >
                                                    Konfirmasi
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <p className="text-xs font-bold text-slate-400">Tidak ada booking online pending.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
