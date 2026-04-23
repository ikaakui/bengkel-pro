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

interface Reward {
    id: string;
    name: string;
    points_required: number;
    reward_type: 'discount' | 'item';
    discount_value: number | null;
    description: string | null;
    is_active: boolean;
}

export default function RewardsMemberPage() {
    const { profile, refreshProfile } = useAuth();
    const supabase = createClient();

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchRewards = async () => {
            const { data } = await supabase
                .from("rewards")
                .select("*")
                .eq("is_active", true)
                .order("points_required", { ascending: true });
            if (data) setRewards(data);
            setLoading(false);
        };
        fetchRewards();
    }, []);

    const handleRedeem = async (reward: Reward) => {
        if (!profile || (profile.total_points || 0) < reward.points_required) {
            alert("Poin Anda tidak mencukupi.");
            return;
        }

        if (!confirm(`Tukarkan ${reward.points_required} poin untuk "${reward.name}"?`)) return;

        setIsRedeeming(reward.id);
        try {
            // 1. Log the redemption (using a generic audit or transactions table if needed, for now just updating points)
            // Ideally we have a 'redemptions' table.
            
            // 2. Update member points
            const { error } = await supabase
                .from("profiles")
                .update({ total_points: (profile.total_points || 0) - reward.points_required })
                .eq("id", profile.id);

            if (error) throw error;

            await refreshProfile();
            setRedeemSuccess(reward.name);
            setTimeout(() => setRedeemSuccess(null), 5000);
        } catch (err: any) {
            alert("Gagal menukarkan reward: " + err.message);
        } finally {
            setIsRedeeming(null);
        }
    };

    const points = profile?.total_points || 0;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    {/* Header with Points Balance */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Katalog Reward</h1>
                            <p className="text-slate-500 mt-1">Tukarkan poin Anda dengan berbagai penawaran menarik.</p>
                        </div>

                        <Card className="border-amber-100 bg-amber-50/50 p-4 flex items-center gap-4 min-w-[240px] shadow-lg shadow-amber-500/5">
                            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Coins size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Poin Tersedia</p>
                                <p className="text-3xl font-black text-amber-700 tracking-tight">{points.toLocaleString()}</p>
                            </div>
                        </Card>
                    </div>

                    {/* Success Message */}
                    <AnimatePresence>
                        {redeemSuccess && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-800"
                            >
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                    <Trophy size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold">Berhasil Ditukarkan!</p>
                                    <p className="text-sm">Reward <strong>{redeemSuccess}</strong> berhasil diklaim. Silakan tunjukkan ke petugas saat servis berikutnya.</p>
                                </div>
                                <button onClick={() => setRedeemSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
                                    <X size={20} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reward Grid */}
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <Loader2 size={40} className="animate-spin text-slate-300" />
                        </div>
                    ) : rewards.length === 0 ? (
                        <Card className="py-20 text-center border-dashed border-2 border-slate-100">
                            <Gift size={64} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-xl font-bold text-slate-400">Belum ada reward tersedia saat ini.</p>
                            <p className="text-sm text-slate-400">Nantikan promo menarik dari kami segera!</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {rewards.map((reward) => {
                                const canAfford = points >= reward.points_required;
                                return (
                                    <motion.div
                                        key={reward.id}
                                        whileHover={{ y: -8 }}
                                        className="group"
                                    >
                                        <Card className={cn(
                                            "h-full flex flex-col p-0 overflow-hidden border-2 transition-all duration-500",
                                            canAfford 
                                                ? "border-slate-100 hover:border-amber-200 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-amber-500/10" 
                                                : "border-slate-50 opacity-80 grayscale-[0.3]"
                                        )}>
                                            {/* Card Image/Icon Header */}
                                            <div className={cn(
                                                "p-8 flex items-center justify-center relative overflow-hidden h-44",
                                                reward.reward_type === 'discount' ? "bg-amber-50" : "bg-blue-50"
                                            )}>
                                                {/* Decorative background blobs */}
                                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/50 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700" />
                                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/30 rounded-full blur-2xl" />
                                                
                                                <div className={cn(
                                                    "w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                                                    reward.reward_type === 'discount' 
                                                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30" 
                                                        : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-blue-500/30"
                                                )}>
                                                    {reward.reward_type === 'discount' ? <Ticket size={48} /> : <Gift size={48} />}
                                                </div>

                                                {/* Point Badge - Floating */}
                                                <div className="absolute top-4 right-4 z-20">
                                                    <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none shadow-lg px-4 py-2 rounded-full font-black text-xs flex items-center gap-2">
                                                        <Coins size={14} className="text-amber-500" />
                                                        {reward.points_required} POIN
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-8 flex-1 flex flex-col">
                                                <div className="mb-4">
                                                    <h3 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-amber-600 transition-colors">{reward.name}</h3>
                                                    <div className="h-1 w-12 bg-amber-200 mt-2 rounded-full transition-all group-hover:w-20" />
                                                </div>
                                                
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1">
                                                    {reward.description || "Tukarkan poin Anda dengan reward spesial ini."}
                                                </p>

                                                <div className="space-y-4">
                                                    {!canAfford ? (
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-end">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Poin</p>
                                                                <p className="text-xs font-black text-slate-600">{points} / {reward.points_required}</p>
                                                            </div>
                                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min((points / reward.points_required) * 100, 100)}%` }}
                                                                    className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full" 
                                                                />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
                                                                Butuh {reward.points_required - points} Poin lagi
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleRedeem(reward)}
                                                            disabled={isRedeeming === reward.id}
                                                            className="w-full h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95 group/btn flex flex-col items-center justify-center gap-0"
                                                        >
                                                            {isRedeeming === reward.id ? (
                                                                <Loader2 size={24} className="animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <span className="uppercase tracking-widest text-xs opacity-80 mb-1">Klaim Sekarang</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <Gift size={20} className="group-hover/btn:rotate-12 transition-transform" />
                                                                        TUKARKAN POIN
                                                                    </div>
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Info Card */}
                    <Card className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-primary opacity-10 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center shrink-0">
                                <Sparkles size={40} className="text-primary" />
                            </div>
                            <div className="text-center md:text-left space-y-2">
                                <h3 className="text-2xl font-black tracking-tight">Kumpulkan Poin Lebih Banyak!</h3>
                                <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
                                    Dapatkan poin dari setiap transaksi servis dan pembelian sparepart. Semakin sering servis, semakin banyak reward yang bisa Anda nikmati.
                                </p>
                            </div>
                            <div className="md:ml-auto">
                                <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="h-14 px-8 rounded-2xl font-black bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95">
                                    TUKARKAN POIN SEKARANG
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
