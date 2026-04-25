"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
    Gift, 
    Ticket, 
    Coins, 
    CheckCircle2, 
    Loader2, 
    Star, 
    Sparkles, 
    Info,
    ChevronRight,
    Trophy,
    X
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { QRCodeSVG } from "qrcode.react";

interface Reward {
    id: string;
    name: string;
    points_required: number;
    reward_type: 'discount' | 'item' | 'free_service';
    discount_value: number | null;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
}

interface Voucher {
    id: string;
    reward_name: string;
    voucher_code: string;
    status: 'active' | 'used' | 'expired';
    created_at: string;
}

export default function RewardsMemberPage() {
    const { profile, refreshProfile } = useAuth();
    const supabase = createClient();

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
    const [activeTab, setActiveTab] = useState<"catalog" | "my-vouchers">("catalog");
    const [loading, setLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [newVoucher, setNewVoucher] = useState<Voucher | null>(null);

    const fetchData = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            // Fetch Rewards
            const [rewardsRes, catalogRes, vouchersRes] = await Promise.all([
                supabase.from("rewards").select("*").eq("is_active", true),
                supabase.from("catalog").select("*").gt("points_required", 0).eq("is_active", true),
                supabase.from("reward_vouchers").select("*").eq("member_id", profile.id).order("created_at", { ascending: false })
            ]);

            const rewardsList = rewardsRes.data || [];
            const catalogList = (catalogRes.data || []).map(item => ({
                ...item,
                reward_type: item.category === 'Service' ? 'free_service' : 'item'
            }));

            setRewards([...rewardsList, ...catalogList].sort((a, b) => a.points_required - b.points_required));
            setMyVouchers(vouchersRes.data || []);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [profile]);

    const generateVoucherCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1
        let code = 'BPRO-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleRedeem = async (reward: Reward) => {
        if (!profile || (profile.total_points || 0) < reward.points_required) {
            alert("Poin Anda tidak mencukupi.");
            return;
        }

        if (!confirm(`Tukarkan ${reward.points_required} poin untuk "${reward.name}"? Voucher akan berlaku di cabang BSD/Depok.`)) return;

        setIsRedeeming(reward.id);
        try {
            const voucherCode = generateVoucherCode();
            
            // 1. Create Voucher
            const { data: voucherData, error: vError } = await supabase
                .from("reward_vouchers")
                .insert({
                    member_id: profile.id,
                    reward_id: reward.id,
                    reward_name: reward.name,
                    voucher_code: voucherCode,
                    status: 'active'
                })
                .select()
                .single();

            if (vError) throw vError;

            // 2. Deduct Points
            const { error: pError } = await supabase
                .from("profiles")
                .update({ total_points: (profile.total_points || 0) - reward.points_required })
                .eq("id", profile.id);

            if (pError) throw pError;

            // 3. Log Transaction
            await supabase.from("point_transactions").insert({
                member_id: profile.id,
                points: -reward.points_required,
                type: 'redeem',
                description: `Tukar Voucher: ${reward.name} (${voucherCode})`
            });

            await refreshProfile();
            setNewVoucher(voucherData);
            fetchData();
        } catch (err: any) {
            alert(`Gagal menukar reward: ${err.message}`);
        } finally {
            setIsRedeeming(null);
        }
    };

    const points = profile?.total_points || 0;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-6xl mx-auto space-y-12 pb-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Katalog Reward</h1>
                            <p className="text-slate-500 mt-1 font-medium">Tukarkan poin Anda dengan voucher layanan pilihan.</p>
                        </div>

                        <Card className="border-slate-100 text-center space-y-3 p-6 min-w-[260px] shadow-sm rounded-3xl">
                            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                                <Star size={32} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{points.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Poin Loyalitas</p>
                            </div>
                        </Card>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-slate-100 pb-1">
                        <button 
                            onClick={() => setActiveTab("catalog")}
                            className={cn(
                                "pb-4 px-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                                activeTab === "catalog" ? "text-primary" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Katalog Reward
                            {activeTab === "catalog" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                        </button>
                        <button 
                            onClick={() => setActiveTab("my-vouchers")}
                            className={cn(
                                "pb-4 px-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                                activeTab === "my-vouchers" ? "text-primary" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Voucher Saya
                            {myVouchers.filter(v => v.status === 'active').length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{myVouchers.filter(v => v.status === 'active').length}</span>
                            )}
                            {activeTab === "my-vouchers" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === "catalog" ? (
                        loading ? (
                            <div className="py-20 flex justify-center"><Loader2 size={40} className="animate-spin text-amber-500" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {rewards.map((reward) => {
                                    const canAfford = points >= reward.points_required;
                                    return (
                                        <motion.div key={reward.id} whileHover={{ y: -10 }} className="relative group">
                                            <Card className={cn(
                                                "h-full flex flex-col p-6 overflow-hidden rounded-[2.5rem] border-none shadow-2xl transition-all duration-500",
                                                canAfford ? "bg-white shadow-slate-200/60" : "bg-slate-50/50 grayscale-[0.8] opacity-80"
                                            )}>
                                                <div className="relative aspect-square mb-6 rounded-[2rem] border-[3px] border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100 p-8 flex items-center justify-center">
                                                    <div className="relative z-10 text-amber-500">
                                                        {reward.reward_type === 'discount' ? <Ticket size={80} /> : <Gift size={80} />}
                                                    </div>
                                                </div>
                                                <div className="text-center space-y-3 mb-8">
                                                    <h3 className="text-2xl font-black text-slate-800">{reward.name}</h3>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Coins size={16} className="text-amber-500" />
                                                        <span className="text-lg font-bold text-slate-600">{reward.points_required.toLocaleString()} Poin</span>
                                                    </div>
                                                </div>
                                                <div className="mt-auto">
                                                    {!canAfford ? (
                                                        <div className="p-4 bg-slate-100/50 rounded-2xl text-center">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Kurang {(reward.points_required - points).toLocaleString()} poin lagi</p>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleRedeem(reward)}
                                                            disabled={isRedeeming === reward.id}
                                                            className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase shadow-xl"
                                                        >
                                                            {isRedeeming === reward.id ? <Loader2 size={20} className="animate-spin" /> : "TUKARKAN POIN"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="space-y-6">
                            {myVouchers.length === 0 ? (
                                <Card className="py-24 text-center border-dashed border-4 border-slate-100 rounded-[3rem]">
                                    <Ticket size={80} className="mx-auto text-slate-100 mb-6" />
                                    <p className="text-2xl font-black text-slate-300 uppercase tracking-widest">Belum ada voucher</p>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {myVouchers.map((voucher) => (
                                        <Card key={voucher.id} className={cn(
                                            "p-6 rounded-[2rem] border-2 flex items-center gap-6",
                                            voucher.status === 'active' ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100 bg-slate-50 opacity-60"
                                        )}>
                                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                                                {voucher.status === 'active' ? (
                                                    <QRCodeSVG value={voucher.voucher_code} size={64} />
                                                ) : (
                                                    <CheckCircle2 size={40} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-black text-lg text-slate-800">{voucher.reward_name}</h4>
                                                    <Badge variant={voucher.status === 'active' ? 'success' : 'secondary'}>
                                                        {voucher.status === 'active' ? 'SIAP PAKAI' : voucher.status === 'used' ? 'SUDAH TERPAKAI' : 'EXPIRED'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Kode: {voucher.voucher_code}</p>
                                                <p className="text-[10px] text-slate-400 mt-2 italic">Dibuat: {new Date(voucher.created_at).toLocaleDateString('id-ID')}</p>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setNewVoucher(voucher)}
                                                className="shrink-0"
                                            >
                                                <ChevronRight size={20} />
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Voucher Modal */}
                    <AnimatePresence>
                        {newVoucher && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNewVoucher(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
                                        <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                            <Trophy size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black">Voucher Anda</h3>
                                        <p className="text-sm opacity-80">Tunjukkan kode/QR ini ke Admin</p>
                                    </div>
                                    <div className="p-8 space-y-8 text-center">
                                        <div className="bg-white p-6 rounded-[2.5rem] border-4 border-slate-50 shadow-inner inline-block">
                                            <QRCodeSVG value={newVoucher.voucher_code} size={160} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kode Voucher</p>
                                            <p className="text-3xl font-black text-slate-900 tracking-widest">{newVoucher.voucher_code}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3 text-left">
                                            <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-medium text-slate-600">Berlaku di cabang <strong>BSD & Depok</strong>. Cukup tunjukkan layar ini ke petugas bengkel saat pendaftaran servis.</p>
                                        </div>
                                        <Button onClick={() => setNewVoucher(null)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black">TUTUP</Button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
