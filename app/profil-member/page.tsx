"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
    User, 
    Phone, 
    Car, 
    MapPin, 
    Calendar, 
    ShieldCheck, 
    Edit3, 
    Save, 
    X,
    Plus,
    Trash2,
    Loader2,
    Star,
    Award,
    Gem,
    Crown,
    CreditCard
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TIERS = [
    { name: 'Bronze', color: 'from-amber-700 to-amber-900', icon: Award },
    { name: 'Silver', color: 'from-slate-400 to-slate-600', icon: Star },
    { name: 'Gold', color: 'from-amber-400 to-yellow-500', icon: Crown },
    { name: 'Platinum', color: 'from-violet-500 to-purple-700', icon: Gem },
];

export default function ProfilMemberPage() {
    const { profile, refreshProfile } = useAuth();
    const supabase = createClient();

    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [loading, setLoading] = useState(false);
    
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ brand_model: "", license_plate: "", year: "" });

    const fetchVehicles = useCallback(async () => {
        if (!profile?.id) return;
        setLoadingVehicles(true);
        const { data } = await supabase
            .from("member_vehicles")
            .select("*")
            .eq("member_id", profile.id)
            .order("is_primary", { ascending: false });
        if (data) setVehicles(data);
        setLoadingVehicles(false);
    }, [profile?.id, supabase]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    const handleUpdateProfile = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName, phone: phone })
                .eq("id", profile.id);

            if (error) throw error;
            await refreshProfile();
            setIsEditing(false);
        } catch (err: any) {
            alert("Gagal memperbarui profil: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddVehicle = async () => {
        if (!profile?.id || !newVehicle.brand_model || !newVehicle.license_plate) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("member_vehicles")
                .insert([{
                    member_id: profile.id,
                    brand_model: newVehicle.brand_model,
                    license_plate: newVehicle.license_plate.toUpperCase(),
                    year: parseInt(newVehicle.year) || null,
                    is_primary: vehicles.length === 0
                }]);
            if (error) throw error;
            setNewVehicle({ brand_model: "", license_plate: "", year: "" });
            setIsAddingVehicle(false);
            fetchVehicles();
        } catch (err: any) {
            alert("Gagal menambah kendaraan: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!confirm("Hapus kendaraan ini dari garasi?")) return;
        try {
            const { error } = await supabase.from("member_vehicles").delete().eq("id", id);
            if (error) throw error;
            fetchVehicles();
        } catch (err: any) {
            alert("Gagal menghapus: " + err.message);
        }
    };

    const points = profile?.total_points || 0;
    const currentTier = points >= 5000 ? TIERS[3] : points >= 2000 ? TIERS[2] : points >= 500 ? TIERS[1] : TIERS[0];
    const TierIcon = currentTier.icon;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-5xl mx-auto space-y-10 pb-20">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profil Akun Member</h1>
                        <Button 
                            variant={isEditing ? "outline" : "primary"}
                            onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                            className="rounded-2xl gap-2 font-bold"
                        >
                            {isEditing ? <X size={18} /> : <Edit3 size={18} />}
                            {isEditing ? "BATAL" : "EDIT PROFIL"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Membership Card Section */}
                        <div className="lg:col-span-1 space-y-6">
                            <motion.div 
                                initial={{ rotateY: -10, opacity: 0 }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                className={cn(
                                    "relative h-64 rounded-[2.5rem] p-8 text-white shadow-2xl bg-gradient-to-br overflow-hidden",
                                    currentTier.color
                                )}
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><TierIcon size={24} /></div>
                                            <span className="font-black tracking-[0.2em] text-[10px] uppercase opacity-80">INKA OTOSERVICE</span>
                                        </div>
                                        <CreditCard size={24} className="opacity-40" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Nama Member</p>
                                        <p className="text-2xl font-black tracking-tight truncate">{profile?.full_name}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Status Tier</p>
                                            <Badge className="bg-white/20 border-0 text-white font-black">{currentTier.name.toUpperCase()}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Poin</p>
                                            <p className="text-lg font-black">{points.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <Card className="border-slate-100 text-center space-y-4">
                                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-amber-50">
                                    <Star size={40} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-slate-900">{points.toLocaleString()}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Poin Loyalitas</p>
                                </div>
                                <Button variant="outline" className="w-full rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => window.location.href = '/rewards-member'}>
                                    TUKAR POIN
                                </Button>
                            </Card>
                        </div>

                        {/* Details Section */}
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="border-slate-100 p-8">
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-2"><ShieldCheck className="text-primary" size={24} />Informasi Personal</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                                        {isEditing ? (
                                            <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                        ) : (
                                            <p className="text-lg font-bold text-slate-900 px-2 flex items-center gap-3"><User size={18} className="text-slate-400" />{profile?.full_name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                                        {isEditing ? (
                                            <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                        ) : (
                                            <p className="text-lg font-bold text-slate-900 px-2 flex items-center gap-3"><Phone size={18} className="text-slate-400" />{profile?.phone || "-"}</p>
                                        )}
                                    </div>
                                </div>
                                {isEditing && (
                                    <div className="mt-10 flex justify-end">
                                        <Button disabled={loading} onClick={handleUpdateProfile} className="h-14 px-10 rounded-2xl shadow-xl shadow-primary/20 gap-2 font-black">
                                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}SIMPAN
                                        </Button>
                                    </div>
                                )}
                            </Card>

                            {/* Garage Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Car className="text-primary" size={24} />Garasi (Kendaraan)</h3>
                                    <Button variant="ghost" className="text-primary font-bold gap-1" onClick={() => setIsAddingVehicle(true)}>
                                        <Plus size={18} />TAMBAH MOBIL
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {loadingVehicles ? (
                                        <div className="col-span-2 py-10 flex justify-center"><Loader2 className="animate-spin text-slate-200" /></div>
                                    ) : vehicles.length === 0 ? (
                                        <button onClick={() => setIsAddingVehicle(true)} className="col-span-2 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-primary hover:text-primary transition-all group">
                                            <Plus size={24} /> <span className="font-bold">Daftarkan Mobil Pertama Anda</span>
                                        </button>
                                    ) : (
                                        vehicles.map((v) => (
                                            <Card key={v.id} className="border-slate-100 p-6 flex flex-col justify-between group hover:border-primary transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center"><Car size={24} /></div>
                                                    {v.is_primary && <Badge variant="success">UTAMA</Badge>}
                                                </div>
                                                <div className="mt-6">
                                                    <p className="text-lg font-black text-slate-900">{v.brand_model}</p>
                                                    <p className="text-sm font-bold text-slate-400 font-mono tracking-widest mt-1">{v.license_plate}</p>
                                                </div>
                                                <div className="mt-6 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-400">{v.year || '-'}</span>
                                                    <button onClick={() => handleDeleteVehicle(v.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Vehicle Modal */}
                <AnimatePresence>
                    {isAddingVehicle && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6">
                                <h3 className="text-2xl font-black text-slate-900">Tambah Kendaraan</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Merek & Tipe</label>
                                        <input type="text" placeholder="e.g. Toyota Avanza" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold" value={newVehicle.brand_model} onChange={(e) => setNewVehicle({...newVehicle, brand_model: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Nomor Polisi</label>
                                        <input type="text" placeholder="e.g. B 1234 ABC" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold uppercase" value={newVehicle.license_plate} onChange={(e) => setNewVehicle({...newVehicle, license_plate: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Tahun (Opsional)</label>
                                        <input type="number" placeholder="e.g. 2022" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold" value={newVehicle.year} onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})} />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <Button variant="outline" className="flex-1 rounded-2xl font-bold" onClick={() => setIsAddingVehicle(false)}>BATAL</Button>
                                    <Button disabled={loading || !newVehicle.brand_model || !newVehicle.license_plate} onClick={handleAddVehicle} className="flex-1 rounded-2xl font-black">{loading ? <Loader2 className="animate-spin" /> : "SIMPAN"}</Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </RoleGuard>
        </DashboardLayout>
    );
}
