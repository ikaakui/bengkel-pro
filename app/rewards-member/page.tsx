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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rewards.map((reward) => {
                                const canAfford = points >= reward.points_required;
                                return (
                                    <motion.div
                                        key={reward.id}
                                        whileHover={{ y: -5 }}
                                        className="h-full"
                                    >
                                        <Card className={cn(
                                            "h-full flex flex-col p-0 overflow-hidden border-slate-100 transition-all hover:shadow-2xl hover:shadow-slate-200/50",
                                            !canAfford && "grayscale-[0.5]"
                                        )}>
                                            <div className={cn(
                                                "p-6 flex items-center justify-center relative overflow-hidden h-40",
                                                reward.reward_type === 'discount' ? "bg-amber-50" : "bg-blue-50"
                                            )}>
                                                {/* Background decoration */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
                                                
                                                <div className={cn(
                                                    "w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl relative z-10 transition-transform group-hover:scale-110",
                                                    reward.reward_type === 'discount' ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-blue-500 text-white shadow-blue-500/20"
                                                )}>
                                                    {reward.reward_type === 'discount' ? <Ticket size={40} /> : <Gift size={40} />}
                                                </div>
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant={reward.reward_type === 'discount' ? 'warning' : 'info'} className="text-[10px] font-black uppercase tracking-widest">
                                                        {reward.reward_type === 'discount' ? 'Diskon' : 'Produk'}
                                                    </Badge>
                                                    <div className="flex items-center gap-1 text-amber-500 font-black">
                                                        <Star size={14} fill="currentColor" />
                                                        <span className="text-sm">{reward.points_required} PTS</span>
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{reward.name}</h3>
                                                <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1">{reward.description || "Tukarkan poin Anda dengan reward spesial ini."}</p>

                                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
                                                    {!canAfford ? (
                                                        <div className="flex-1 space-y-2">
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-slate-300 rounded-full" style={{ width: `${(points / reward.points_required) * 100}%` }} />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                Kurang {reward.points_required - points} Poin lagi
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            onClick={() => handleRedeem(reward)}
                                                            disabled={isRedeeming === reward.id}
                                                            className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg shadow-slate-900/10 gap-2"
                                                        >
                                                            {isRedeeming === reward.id ? <Loader2 className="animate-spin" /> : "TUKARKAN SEKARANG"}
                                                            <ChevronRight size={18} />
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
