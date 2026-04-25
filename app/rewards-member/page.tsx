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
    image_url: string | null;
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
            try {
                setLoading(true);
                // Fetch from both tables in parallel
                const [rewardsRes, catalogRes] = await Promise.all([
                    supabase
                        .from("rewards")
                        .select("*")
                        .eq("is_active", true),
                    supabase
                        .from("catalog")
                        .select("*")
                        .gt("points_required", 0)
                        .eq("is_active", true)
                ]);

                if (rewardsRes.error) console.error("Error fetching rewards:", rewardsRes.error);
                if (catalogRes.error) console.error("Error fetching catalog rewards:", catalogRes.error);

                const rewardsList = rewardsRes.data || [];
                const catalogList = (catalogRes.data || []).map(item => ({
                    ...item,
                    reward_type: item.category === 'Service' ? 'free_service' : 'item'
                }));

                const combined = [...rewardsList, ...catalogList].sort((a, b) => a.points_required - b.points_required);
                setRewards(combined);
            } catch (err) {
                console.error("Unexpected error fetching rewards:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRewards();
    }, [supabase]);

    const handleRedeem = async (reward: any) => {
        if (!profile || (profile.total_points || 0) < reward.points_required) {
            alert("Poin Anda tidak mencukupi untuk menukar reward ini.");
            return;
        }

        if (!confirm(`Tukarkan ${reward.points_required} poin untuk "${reward.name}"?`)) return;

        setIsRedeeming(reward.id);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ total_points: (profile.total_points || 0) - reward.points_required })
                .eq("id", profile.id);

            if (error) throw error;

            // Log point transaction
            await supabase.from("point_transactions").insert({
                member_id: profile.id,
                points: -reward.points_required,
                type: 'redeem',
                description: `Redeemed: ${reward.name}`
            });

            await refreshProfile();
            setRedeemSuccess(reward.name);
            setTimeout(() => setRedeemSuccess(null), 5000);
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
                    {/* Header with Points Balance */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Katalog Reward</h1>
                            <p className="text-slate-500 mt-1 font-medium">Tukarkan poin Anda dengan berbagai produk pilihan.</p>
                        </div>

                        <Card className="border-none bg-gradient-to-br from-amber-400 to-orange-500 p-0 overflow-hidden min-w-[260px] shadow-2xl shadow-amber-500/20 rounded-[2rem]">
                            <div className="p-6 flex items-center gap-5 text-white">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                                    <Coins size={32} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Poin Tersedia</p>
                                    <p className="text-4xl font-black tracking-tighter leading-none">{points.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Success Message */}
                    <AnimatePresence>
                        {redeemSuccess && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex items-center gap-5 text-emerald-800 shadow-xl shadow-emerald-500/5"
                            >
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                                    <Trophy size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-lg">Berhasil Ditukarkan!</p>
                                    <p className="text-sm font-medium opacity-80">Reward <strong>{redeemSuccess}</strong> berhasil diklaim. Silakan tunjukkan ke petugas saat servis berikutnya.</p>
                                </div>
                                <button onClick={() => setRedeemSuccess(null)} className="p-2 hover:bg-emerald-100 rounded-xl transition-colors">
                                    <X size={20} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reward Grid */}
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <Loader2 size={40} className="animate-spin text-amber-500" />
                        </div>
                    ) : rewards.length === 0 ? (
                        <Card className="py-24 text-center border-dashed border-4 border-slate-100 rounded-[3rem]">
                            <Gift size={80} className="mx-auto text-slate-100 mb-6" />
                            <p className="text-2xl font-black text-slate-300 uppercase tracking-widest">Belum ada reward</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {rewards.map((reward) => {
                                const canAfford = points >= reward.points_required;
                                return (
                                    <motion.div
                                        key={reward.id}
                                        whileHover={{ y: -10 }}
                                        className="relative group"
                                    >
                                        <Card className={cn(
                                            "h-full flex flex-col p-6 overflow-hidden rounded-[2.5rem] border-none shadow-2xl transition-all duration-500",
                                            canAfford 
                                                ? "bg-white shadow-slate-200/60 hover:shadow-amber-500/10" 
                                                : "bg-slate-50/50 grayscale-[0.8] opacity-80"
                                        )}>
                                            {/* Product Icon Container (Yellow Box Style) */}
                                            <div className="relative aspect-square mb-6 rounded-[2rem] border-[3px] border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100 p-8 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-amber-300">
                                                {/* Decorative background circle */}
                                                <div className="absolute inset-4 bg-white/40 rounded-[1.5rem] blur-xl" />
                                                
                                                <div className="relative z-10 text-amber-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                                                    {reward.reward_type === 'discount' ? <Ticket size={80} strokeWidth={1.5} /> : <Gift size={80} strokeWidth={1.5} />}
                                                </div>

                                                {/* Sparkles decoration */}
                                                <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Sparkles className="text-amber-400 animate-pulse" size={20} />
                                                </div>
                                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Sparkles className="text-amber-400 animate-pulse" size={20} />
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            <div className="text-center space-y-3 mb-8">
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none group-hover:text-amber-600 transition-colors">
                                                    {reward.name}
                                                </h3>
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-amber-400 shadow-inner flex items-center justify-center">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                                                    </div>
                                                    <span className="text-lg font-bold text-slate-600">
                                                        {reward.points_required.toLocaleString()} Poin
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="mt-auto">
                                                {!canAfford ? (
                                                    <div className="space-y-3 p-4 bg-slate-100/50 rounded-2xl">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <span>Progres Poin</span>
                                                            <span>{Math.round((points / reward.points_required) * 100)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                                                            <motion.div 
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min((points / reward.points_required) * 100, 100)}%` }}
                                                                className="h-full bg-slate-300 rounded-full"
                                                            />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter">
                                                            Kurang { (reward.points_required - points).toLocaleString() } poin lagi
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        onClick={() => handleRedeem(reward)}
                                                        disabled={isRedeeming === reward.id}
                                                        className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95 flex items-center justify-center gap-3"
                                                    >
                                                        {isRedeeming === reward.id ? (
                                                            <Loader2 size={20} className="animate-spin" />
                                                        ) : (
                                                            <>
                                                                TUKARKAN POIN
                                                                <ChevronRight size={18} />
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
