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
    CalendarClock, ArrowRight, Wrench, Search, Users2, Hash, Building2
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function WalkInPage() {
    const { profile, branchId, branchName } = useAuth();
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

    // Member search
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState<any[]>([]);
    const [isSearchingMember, setIsSearchingMember] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);

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
        if (!customerName || !customerPhone || !carModel || !licensePlate) {
            alert("Harap lengkapi semua data!");
            return;
        }

        const finalBranchId = branchId || selectedBranchId;
        if (!finalBranchId) {
            alert("Harap pilih cabang terlebih dahulu.");
            return;
        }

        setIsSaving(true);
        try {
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

            if (bookingError) throw bookingError;

            setCreatedBookingId(booking.id);
            setSuccess(true);
        } catch (err: any) {
            alert("Gagal mendaftarkan: " + (err?.message || "Unknown error"));
        } finally {
            setIsSaving(false);
        }
    };

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
                                <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                    {/* Member search */}
                                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cari Member (Opsional)</p>
                                        <div className="relative">
                                            <Users2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Ketik nama atau no HP member..."
                                                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                                                value={memberSearch}
                                                onChange={(e) => setMemberSearch(e.target.value)}
                                            />
                                            {isSearchingMember && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                                        </div>
                                        {memberResults.length > 0 && (
                                            <div className="mt-2 bg-white rounded-xl overflow-hidden shadow-lg">
                                                {memberResults.map(m => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => handleSelectMember(m)}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-none"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-slate-900">{m.full_name}</p>
                                                            <p className="text-xs text-slate-500">{m.phone_number}</p>
                                                        </div>
                                                        <Badge variant="info" className="text-[10px]">{m.total_points || 0} Poin</Badge>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {selectedMember && (
                                            <div className="mt-3 flex items-center gap-2 bg-blue-500/20 text-blue-200 px-4 py-2 rounded-xl">
                                                <CheckCircle2 size={16} />
                                                <span className="text-sm font-bold">Member: {selectedMember.full_name} ({selectedMember.total_points || 0} poin)</span>
                                                <button onClick={() => setSelectedMember(null)} className="ml-auto text-blue-300 hover:text-white text-xs font-bold">Hapus</button>
                                            </div>
                                        )}
                                    </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Branch Selection if missing */}
                                            {!branchId && branches.length > 0 && (
                                                <div className="col-span-full space-y-2">
                                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                                        <Building2 size={10} /> Cabang *
                                                    </label>
                                                    <select 
                                                        className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-900 focus:border-blue-400 outline-none transition-all"
                                                        value={selectedBranchId}
                                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                                    >
                                                        <option value="">Pilih Cabang</option>
                                                        {branches.map(b => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pelanggan *</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input type="text" placeholder="Nama lengkap"
                                                        className="input-field pl-11"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. WhatsApp *</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input type="text" placeholder="08xx..."
                                                        className="input-field pl-11"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merek / Tipe Mobil *</label>
                                                <div className="relative">
                                                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input type="text" placeholder="Avanza, Civic, dll"
                                                        className="input-field pl-11"
                                                        value={carModel}
                                                        onChange={(e) => setCarModel(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Polisi *</label>
                                                <div className="relative">
                                                    <AppWindow className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input type="text" placeholder="B 1234 CD"
                                                        className="input-field pl-11 uppercase"
                                                        value={licensePlate}
                                                        onChange={(e) => setLicensePlate(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-slate-400 bg-slate-50 rounded-xl p-4">
                                            <CalendarClock size={16} />
                                            <span className="text-xs font-bold">
                                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {branchName}
                                            </span>
                                        </div>

                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSaving}
                                            className="w-full h-16 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl"
                                        >
                                            {isSaving ? (
                                                <><Loader2 size={20} className="animate-spin mr-2" /> Mendaftarkan...</>
                                            ) : (
                                                <><CheckCircle2 size={20} className="mr-2" /> Daftarkan & Masuk Antrian</>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
