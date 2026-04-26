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
    MapPin, 
    Calendar, 
    ShieldCheck, 
    Edit3, 
    Save, 
    X,
    Loader2,
    Star,
    Award,
    Gem,
    Crown,
    CreditCard,
    Mail,
    Car,
    Hash
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TIERS = [
    { name: 'Bronze', color: 'from-amber-700 to-amber-900', icon: Award },
    { name: 'Silver', color: 'from-slate-400 to-slate-600', icon: Star },
    { name: 'Gold', color: 'from-amber-400 to-yellow-500', icon: Crown },
    { name: 'Platinum', color: 'from-violet-500 to-purple-700', icon: Gem },
];

export default function ProfilMemberPage() {
    const { user, profile, refreshProfile } = useAuth();
    const supabase = createClient();

    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [email, setEmail] = useState(user?.email || "");
    const [brandModel, setBrandModel] = useState("");
    const [licensePlate, setLicensePlate] = useState("");
    const [vehicleId, setVehicleId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setPhone(profile.phone || "");
        }
        if (user) {
            setEmail(user.email || "");
        }
    }, [profile, user]);

    useEffect(() => {
        const fetchVehicle = async () => {
            if (!profile?.id) return;
            const { data } = await supabase
                .from("member_vehicles")
                .select("*")
                .eq("member_id", profile.id)
                .order("is_primary", { ascending: false })
                .limit(1)
                .single();
            if (data) {
                setBrandModel(data.brand_model || "");
                setLicensePlate(data.license_plate || "");
                setVehicleId(data.id);
            }
        };
        fetchVehicle();
    }, [profile?.id, supabase]);

    const handleUpdateProfile = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName, phone: phone })
                .eq("id", profile.id);

            if (error) throw error;
            
            if (vehicleId) {
                await supabase
                    .from("member_vehicles")
                    .update({ brand_model: brandModel, license_plate: licensePlate.toUpperCase() })
                    .eq("id", vehicleId);
            } else if (brandModel || licensePlate) {
                const { data } = await supabase
                    .from("member_vehicles")
                    .insert([{
                        member_id: profile.id,
                        brand_model: brandModel,
                        license_plate: licensePlate.toUpperCase(),
                        is_primary: true
                    }])
                    .select()
                    .single();
                if (data) setVehicleId(data.id);
            }

            await refreshProfile();
            setIsEditing(false);
        } catch (err: any) {
            alert("Gagal memperbarui profil: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const maskText = (text: string, type: 'email' | 'phone' | 'text') => {
        if (!text) return "-";
        if (type === 'email') {
            const [name, domain] = text.split('@');
            if (!domain) return text;
            if (name.length <= 2) return `${name}****@${domain}`;
            return `${name.charAt(0)}****${name.charAt(name.length - 1)}@${domain}`;
        }
        if (type === 'phone') {
            if (text.length <= 4) return text;
            return `${text.slice(0, 4)}-****-${text.slice(-3)}`;
        }
        if (type === 'text') {
            if (text.length <= 2) return text;
            const words = text.split(' ');
            if (words.length > 1) {
                return words.map(w => w.length > 2 ? `${w.charAt(0)}***` : w).join(' ');
            }
            return `${text.charAt(0)}****${text.charAt(text.length - 1)}`;
        }
        return text;
    };

    const maskPlate = (text: string) => {
        if (!text) return "-";
        const parts = text.split(' ');
        if (parts.length >= 2) {
             return `${parts[0]} **** ${parts[parts.length-1] || ''}`;
        }
        return `${text.charAt(0)} **** ${text.charAt(text.length - 1)}`;
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
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
                                        {isEditing ? (
                                            <input type="email" disabled title="Email tidak dapat diubah di sini" className="w-full px-5 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl focus:outline-none transition-all font-bold text-slate-500 cursor-not-allowed" value={email} />
                                        ) : (
                                            <p className="text-lg font-bold text-slate-900 px-2 flex items-center gap-3"><Mail size={18} className="text-slate-400" />{maskText(email, 'email')}</p>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                                        {isEditing ? (
                                            <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                        ) : (
                                            <p className="text-lg font-bold text-slate-900 px-2 flex items-center gap-3"><Phone size={18} className="text-slate-400" />{maskText(profile?.phone || "", 'phone')}</p>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Merek & Tipe Kendaraan</label>
                                        {isEditing ? (
                                            <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold" value={brandModel} onChange={(e) => setBrandModel(e.target.value)} placeholder="Contoh: Toyota Avanza" />
                                        ) : (
                                            <p className="text-lg font-bold text-slate-900 px-2 flex items-center gap-3"><Car size={18} className="text-slate-400" />{maskText(brandModel, 'text')}</p>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Plat Nomor</label>
                                        {isEditing ? (
                                            <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold uppercase" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="B 1234 ABC" />
                                        ) : (
                                            <p className="text-lg font-bold text-slate-900 px-2 flex items-center gap-3"><Hash size={18} className="text-slate-400 uppercase" />{maskPlate(licensePlate)}</p>
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


                        </div>
                    </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
