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

    const { role } = useAuth();

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
                
                if (globalData && globalData.length > 0) {
                    data = globalData[0];
                    // Since RPC doesn't join by default, we might need to fetch member manually or just accept basic data
                    // For confirmation, basic data is usually enough as it will be linked to a transaction later
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

    const handleConfirm = async () => {
        if (!foundBooking) return;
        
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
                .eq("id", foundBooking.id);

            if (updateError) throw updateError;

            // Auto-create a Draft transaction so it immediately appears in Antrian (Queue)
            const { data: existingTxn } = await supabase
                .from("transactions")
                .select("id")
                .eq("booking_id", foundBooking.id)
                .maybeSingle();

            if (!existingTxn) {
                await supabase
                    .from("transactions")
                    .insert({
                        customer_name: foundBooking.customer_name,
                        total_amount: 0,
                        branch_id: finalBranchId,
                        payment_method: "Cash",
                        status: "Draft",
                        booking_id: foundBooking.id
                    });
            }

            setSuccess(true);
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
                <div className="max-w-2xl mx-auto space-y-8 pb-10">
                    {/* Header */}
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <Hash size={28} />
                            </div>
                            Konfirmasi Booking
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium ml-[52px]">
                            Masukkan kode booking dari member yang mendaftar via aplikasi.
                        </p>
                    </div>

                    {/* Search Card */}
                    <Card className="p-2 rounded-[2rem] border-none shadow-2xl shadow-slate-200">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Masukkan Kode Booking (BK-XXX-XXXX-XXX)"
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-300 outline-none text-lg font-black uppercase tracking-widest placeholder:text-slate-300 placeholder:font-medium placeholder:text-sm placeholder:tracking-normal"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    autoFocus
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

                    {/* Result */}
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
                                            {foundBooking.member && (
                                                <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Poin Member</p>
                                                    <p className="text-2xl font-black">{foundBooking.member.total_points || 0}</p>
                                                </div>
                                            )}
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
                                            <div className="flex items-start gap-3">
                                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Calendar size={18} /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jadwal</p>
                                                    <p className="font-bold text-slate-900">
                                                        {new Date(foundBooking.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {foundBooking.service_time}
                                                    </p>
                                                </div>
                                            </div>
                                            {foundBooking.member && (
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500"><User size={18} /></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Member</p>
                                                        <p className="font-bold text-blue-700">{foundBooking.member.full_name}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Branch Selection if missing from session */}
                                        {!branchId && branches.length > 0 && (
                                            <div className="space-y-2 bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                                    <Building2 size={12} /> Konfirmasi Cabang Pengerjaan *
                                                </label>
                                                <select 
                                                    className="w-full h-14 bg-white border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-900 focus:border-indigo-400 outline-none transition-all"
                                                    value={selectedBranchId}
                                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                                >
                                                    <option value="">Pilih Cabang</option>
                                                    {branches.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 font-medium italic">* Sesi cabang Anda tidak terdeteksi otomatis, harap pilih manual.</p>
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleConfirm}
                                            disabled={confirming}
                                            className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest shadow-xl"
                                        >
                                            {confirming ? (
                                                <><Loader2 size={20} className="animate-spin mr-2" /> Memproses...</>
                                            ) : (
                                                <><Zap size={20} className="mr-2" /> Konfirmasi & Mulai Proses</>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center text-white">
                                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black">Booking Dikonfirmasi!</h3>
                                        <p className="text-emerald-100 mt-2">Kendaraan siap diproses di {branchName}.</p>
                                    </div>
                                    <CardContent className="p-8">
                                        <div className="flex gap-3">
                                            <Button variant="outline" onClick={handleReset} className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest">
                                                Konfirmasi Lain
                                            </Button>
                                            <Button onClick={handleGoToPOS} className="flex-[2] h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-white">
                                                <ArrowRight size={18} className="mr-2" />
                                                Lanjut ke POS
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {!foundBooking && !loading && !error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                                    <Search size={48} />
                                </div>
                                <p className="text-xl font-bold text-slate-300 uppercase tracking-widest">Menunggu Input Kode</p>
                                <p className="text-sm text-slate-400 mt-2">Minta kode booking dari pelanggan member.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
