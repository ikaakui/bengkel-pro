"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    User, Phone, Car, AppWindow, Loader2, CheckCircle2,
    CalendarClock, ArrowRight, Wrench, Search, Users2, Hash, Building2,
    X, AlertTriangle, AlertCircle, PhoneCall
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function WalkInPage() {
    const { profile, branchId, branchName, role } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [carModel, setCarModel] = useState("");
    const [licensePlate, setLicensePlate] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    // Duplicate check
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [isConfirmedDuplicate, setIsConfirmedDuplicate] = useState(false);

    const [selectedMember, setSelectedMember] = useState<any>(null);

    // Member search
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState<any[]>([]);
    const [isSearchingMember, setIsSearchingMember] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Modern Feedback State
    const [saveFeedback, setSaveFeedback] = useState<{
        show: boolean;
        type: 'success' | 'warning' | 'info' | 'error';
        title: string;
        message: string;
    }>({ show: false, type: 'success', title: '', message: '' });

    const showFeedback = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
        setSaveFeedback({ show: true, type, title, message });
        setTimeout(() => setSaveFeedback(prev => ({ ...prev, show: false })), 4000);
    };

    // Fetch branches if branchId is missing
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from("branches").select("*");
            if (data) {
                setBranches(data);
                // Auto-select if branchId exists in auth
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

    // Search for existing member
    useEffect(() => {
        const searchMember = async () => {
            if (!memberSearch || memberSearch.length < 3) {
                setMemberResults([]);
                setHasSearched(false);
                return;
            }
            setIsSearchingMember(true);
            const pattern = `%${memberSearch}%`;
            const { data } = await supabase
                .from("profiles")
                .select("id, full_name, phone_number, total_points")
                .eq("role", "member")
                .or(`full_name.ilike.${pattern},phone_number.ilike.${pattern}`)
                .limit(5);
            
            if (data) setMemberResults(data);
            setIsSearchingMember(false);
            setHasSearched(true);
        };
        const timer = setTimeout(searchMember, 400);
        return () => clearTimeout(timer);
    }, [memberSearch, supabase]);

    const handleSelectMember = (member: any) => {
        setSelectedMember(member);
        setCustomerName(member.full_name || "");
        setCustomerPhone(member.phone_number || "");
        setMemberSearch("");
        setMemberResults([]);
    };

    const handleSubmit = async () => {
        if (isSaving) return;

        if (!customerName || !customerPhone || !carModel || !licensePlate) {
            showFeedback('warning', 'Data Belum Lengkap', 'Harap isi semua kolom wajib yang bertanda bintang (*).');
            return;
        }

        // Robust Branch Detection Fallback
        let finalBranchId = branchId || selectedBranchId;
        
        // If still missing, try to detect from role (last resort)
        if (!finalBranchId && role) {
            if (role.includes('bsd')) {
                const bsdBranch = branches.find(b => b.name.toLowerCase().includes('bsd'));
                if (bsdBranch) finalBranchId = bsdBranch.id;
            } else if (role.includes('depok')) {
                const depokBranch = branches.find(b => b.name.toLowerCase().includes('depok'));
                if (depokBranch) finalBranchId = depokBranch.id;
            }
        }

        if (!finalBranchId) {
            console.error("Critical: Branch ID not found for registration", { role, branchId, selectedBranchId });
            showFeedback('error', 'Gagal Mendeteksi Cabang', 'Sistem tidak dapat menentukan cabang Anda. Silakan refresh halaman.');
            return;
        }

        setIsSaving(true);
        try {
            // Cek apakah sudah ada antrian dengan plat nomor ini yang masih aktif hari ini
            if (!isConfirmedDuplicate) {
                const today = new Date().toISOString().split('T')[0];
                const { data: existing } = await supabase
                    .from("bookings")
                    .select("id, customer_name, car_model")
                    .eq("license_plate", licensePlate.toUpperCase())
                    .eq("service_date", today)
                    .in("status", ["pending", "processing"])
                    .maybeSingle();

                if (existing) {
                    setShowDuplicateModal(true);
                    setIsSaving(false);
                    return;
                }
            }

            // Create booking entry for walk-in
            const { data: booking, error: bookingError } = await supabase
                .from("bookings")
                .insert({
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    car_model: carModel,
                    license_plate: licensePlate.toUpperCase(),
                    service_date: new Date().toISOString().split('T')[0],
                    service_time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    branch_id: finalBranchId,
                    member_id: selectedMember?.id || null,
                    booking_type: 'direct',
                    status: 'processing',
                })
                .select()
                .single();

            if (bookingError) {
                console.error("Supabase Error:", bookingError);
                throw bookingError;
            }

            setCreatedBookingId(booking.id);
            setSuccess(true);
        } catch (err: any) {
            showFeedback('error', 'Gagal mendaftarkan!', err?.message || "Terjadi kesalahan sistem keamanan database.");
        } finally {
            setIsSaving(false);
            setIsConfirmedDuplicate(false);
        }
    };

    const handleConfirmDuplicate = () => {
        setShowDuplicateModal(false);
        setIsConfirmedDuplicate(true);
    };

    // Trigger submit after confirmation
    useEffect(() => {
        if (isConfirmedDuplicate) {
            handleSubmit();
        }
    }, [isConfirmedDuplicate]);

    const handleReset = () => {
        setCustomerName("");
        setCustomerPhone("");
        setCarModel("");
        setLicensePlate("");
        setSelectedMember(null);
        setSuccess(false);
        setCreatedBookingId(null);
    };

    const handleGoToPOS = () => {
        if (createdBookingId) {
            router.push(`/pos?booking_id=${createdBookingId}`);
        }
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["admin", "admin_depok", "admin_bsd", "owner", "spv"]}>
                <div className="max-w-2xl mx-auto space-y-8 pb-10">
                    {/* Header */}
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <Wrench size={28} />
                            </div>
                            Daftar Service Walk-in
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium ml-[52px]">
                            Daftarkan pelanggan yang datang langsung ke {branchName || "bengkel"}.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center text-white">
                                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black">Pelanggan Terdaftar!</h3>
                                        <p className="text-emerald-100 mt-2 font-medium">Data sudah masuk ke sistem antrian.</p>
                                    </div>
                                    <CardContent className="p-8 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</p>
                                                <p className="font-bold text-slate-900">{customerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobil</p>
                                                <p className="font-bold text-slate-900">{carModel} • {licensePlate}</p>
                                            </div>
                                            {selectedMember && (
                                                <div className="col-span-2">
                                                    <Badge variant="info" className="text-xs">💎 Member — {selectedMember.total_points || 0} Poin</Badge>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <Button variant="outline" onClick={handleReset} className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest">
                                                Daftarkan Lagi
                                            </Button>
                                            <Button onClick={handleGoToPOS} className="flex-[2] h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-white">
                                                <ArrowRight size={18} className="mr-2" />
                                                Lanjut ke POS
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white">
                                    {/* Premium Member search */}
                                    <div className="relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent" />
                                        
                                        <div className="relative p-8 sm:p-10">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Loyalty Integration</p>
                                                    <h3 className="text-xl font-black text-white tracking-tight">Cari Member Terdaftar</h3>
                                                </div>
                                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                                    <Users2 className="text-blue-400" size={24} />
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="Ketik nama atau No. WhatsApp member..."
                                                    className="w-full pl-14 pr-12 py-5 bg-white/10 border border-white/10 rounded-[1.25rem] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/15 transition-all font-medium text-lg"
                                                    value={memberSearch}
                                                    onChange={(e) => setMemberSearch(e.target.value)}
                                                />
                                                {isSearchingMember && (
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                        <Loader2 size={20} className="animate-spin text-blue-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* No Results found notice */}
                                            {hasSearched && memberResults.length === 0 && !isSearchingMember && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mt-3 px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3"
                                                >
                                                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                                                    <p className="text-xs font-bold text-amber-200/80">
                                                        Member tidak ditemukan. Silakan isi data manual di bawah.
                                                    </p>
                                                </motion.div>
                                            )}

                                            {memberResults.length > 0 && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="absolute left-8 right-8 mt-3 bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-50 border border-slate-100"
                                                >
                                                    {memberResults.map(m => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => handleSelectMember(m)}
                                                            className="w-full flex items-center justify-between p-5 hover:bg-blue-50 transition-all text-left border-b border-slate-50 last:border-none group"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                                    <User size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-slate-900 group-hover:text-blue-700">{m.full_name}</p>
                                                                    <p className="text-xs text-slate-500 font-bold tracking-tight">{m.phone_number}</p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="neutral" className="bg-slate-100 text-slate-600 font-black">{m.total_points || 0} PTS</Badge>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}

                                            <AnimatePresence>
                                                {selectedMember && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-6 flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[1.25rem] backdrop-blur-sm"
                                                    >
                                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                            <CheckCircle2 size={24} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Member Terpilih</p>
                                                            <p className="text-white font-black text-lg">{selectedMember.full_name}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => setSelectedMember(null)} 
                                                            className="p-2 text-emerald-300 hover:text-white transition-colors"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <CardContent className="p-8 sm:p-10 space-y-8 bg-white">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nama Pelanggan *</label>
                                                <div className="relative group">
                                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                                    <input type="text" placeholder="Nama lengkap"
                                                        className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 outline-none transition-all font-bold text-slate-900"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">No. WhatsApp *</label>
                                                <div className="relative group">
                                                    <PhoneCall className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                                    <input type="text" placeholder="08xx..."
                                                        className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all font-bold text-slate-900"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Merek / Tipe Mobil *</label>
                                                <div className="relative group">
                                                    <Car className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                                    <input type="text" placeholder="Avanza, Civic, dll"
                                                        className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 outline-none transition-all font-bold text-slate-900"
                                                        value={carModel}
                                                        onChange={(e) => setCarModel(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nomor Polisi *</label>
                                                <div className="relative group">
                                                    <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                                    <input type="text" placeholder="B 1234 CD"
                                                        className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 outline-none transition-all font-black text-slate-900 uppercase tracking-widest"
                                                        value={licensePlate}
                                                        onChange={(e) => setLicensePlate(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                                                    <CalendarClock size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Pendaftaran</p>
                                                    <p className="text-sm font-bold text-slate-700">
                                                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cabang Aktif</p>
                                                <p className="text-sm font-black text-blue-600 uppercase italic">{branchName}</p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSaving}
                                            className="w-full h-20 rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-base uppercase tracking-[0.2em] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] transition-all active:scale-95 group overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {isSaving ? (
                                                <><Loader2 size={24} className="animate-spin mr-3" /> Memproses...</>
                                            ) : (
                                                <><CheckCircle2 size={24} className="mr-3" /> Daftarkan Walk-in</>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Modern Feedback Banner */}
                {saveFeedback.show && (
                    <div className={cn(
                        "fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-fit max-w-[90%] sm:min-w-[400px] shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-8 border-2 transition-all duration-300",
                        saveFeedback.type === 'success' && "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-emerald-500/10",
                        saveFeedback.type === 'warning' && "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-amber-500/10",
                        saveFeedback.type === 'info' && "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-blue-500/10",
                        saveFeedback.type === 'error' && "bg-gradient-to-r from-rose-50 to-red-50 border-rose-200 shadow-rose-500/10"
                    )}>
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            saveFeedback.type === 'success' && "bg-emerald-100 text-emerald-600",
                            saveFeedback.type === 'warning' && "bg-amber-100 text-amber-600",
                            saveFeedback.type === 'info' && "bg-blue-100 text-blue-600",
                            saveFeedback.type === 'error' && "bg-rose-100 text-rose-600"
                        )}>
                            {saveFeedback.type === 'success' && <CheckCircle2 size={20} />}
                            {saveFeedback.type === 'warning' && <AlertTriangle size={20} />}
                            {saveFeedback.type === 'info' && <Search size={20} />}
                            {saveFeedback.type === 'error' && <AlertCircle size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-sm font-black truncate",
                                saveFeedback.type === 'success' && "text-emerald-700",
                                saveFeedback.type === 'warning' && "text-amber-700",
                                saveFeedback.type === 'info' && "text-blue-700",
                                saveFeedback.type === 'error' && "text-rose-700"
                            )}>
                                {saveFeedback.title}
                            </p>
                            <p className={cn(
                                "text-xs truncate",
                                saveFeedback.type === 'success' && "text-emerald-600",
                                saveFeedback.type === 'warning' && "text-amber-600",
                                saveFeedback.type === 'info' && "text-blue-600",
                                saveFeedback.type === 'error' && "text-rose-600"
                            )}>
                                {saveFeedback.message}
                            </p>
                        </div>
                        <button
                            onClick={() => setSaveFeedback(prev => ({ ...prev, show: false }))}
                            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Duplicate Confirmation Modal */}
                <AnimatePresence>
                    {showDuplicateModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
                            >
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                                        <Hash size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight">Plat Nomor Terdeteksi Ganda</h3>
                                    <p className="text-slate-500 mt-4 font-medium px-4">
                                        Kendaraan dengan plat <span className="text-slate-900 font-black">"{licensePlate.toUpperCase()}"</span> sudah ada dalam antrian aktif hari ini.
                                    </p>
                                    <div className="mt-8 space-y-3">
                                        <Button 
                                            onClick={handleConfirmDuplicate}
                                            className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-200"
                                        >
                                            Tetap Daftarkan
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            onClick={() => setShowDuplicateModal(false)}
                                            className="w-full h-14 rounded-2xl border-2 border-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs"
                                        >
                                            Batalkan
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </RoleGuard>
        </DashboardLayout>
    );
}
