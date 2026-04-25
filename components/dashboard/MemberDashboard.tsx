import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
    Star,
    Gift,
    Clock,
    Car,
    TrendingUp,
    ChevronRight,
    Loader2,
    Bot,
    Sparkles,
    Crown,
    Gem,
    Award,
    Calendar,
    Wrench,
    MapPin,
    MessageSquarePlus,
    CalendarPlus
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Tier definitions
const TIERS = [
    { name: 'Bronze', min: 0, max: 499, color: 'from-amber-700 to-amber-900', textColor: 'text-amber-800', bgColor: 'bg-amber-50', icon: Award, borderColor: 'border-amber-200' },
    { name: 'Silver', min: 500, max: 1999, color: 'from-slate-400 to-slate-600', textColor: 'text-slate-600', bgColor: 'bg-slate-50', icon: Star, borderColor: 'border-slate-300' },
    { name: 'Gold', min: 2000, max: 4999, color: 'from-amber-400 to-yellow-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50', icon: Crown, borderColor: 'border-amber-300' },
    { name: 'Platinum', min: 5000, max: Infinity, color: 'from-violet-500 to-purple-700', textColor: 'text-violet-700', bgColor: 'bg-violet-50', icon: Gem, borderColor: 'border-violet-300' },
];

function getTier(points: number) {
    return TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0];
}

function getNextTier(points: number) {
    const currentIndex = TIERS.findIndex(t => points >= t.min && points <= t.max);
    if (currentIndex < TIERS.length - 1) return TIERS[currentIndex + 1];
    return null;
}

export default function MemberDashboard() {
    const { profile } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [recentServices, setRecentServices] = useState<any[]>([]);
    const [rewards, setRewards] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalServices: 0,
        totalSpent: 0,
        thisMonthServices: 0,
        pointsEarned: 0,
    });

    const fetchData = useCallback(async () => {
        if (!profile?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            const [
                { data: transactions },
                rewardsRes,
                catalogRes
            ] = await Promise.all([
                supabase
                    .from("transactions")
                    .select("id, total, status, created_at, customer_name, car_type, license_plate, branch:branch_id(name)")
                    .eq("member_id", profile.id)
                    .eq("status", "Paid")
                    .order("created_at", { ascending: false })
                    .limit(20),
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

            if (transactions) {
                const now = new Date();
                const thisMonth = transactions.filter(t => {
                    const d = new Date(t.created_at);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });

                setStats({
                    totalServices: transactions.length,
                    totalSpent: transactions.reduce((acc, t) => acc + (Number(t.total) || 0), 0),
                    thisMonthServices: thisMonth.length,
                    pointsEarned: profile.total_points || 0,
                });

                setRecentServices(transactions.slice(0, 5));
            }

            const rewardsList = rewardsRes.data || [];
            const catalogList = (catalogRes.data || []).map(item => ({
                ...item,
                reward_type: item.category === 'Service' ? 'free_service' : 'item'
            }));

            const combined = [...rewardsList, ...catalogList]
                .sort((a, b) => a.points_required - b.points_required)
                .slice(0, 4);
            
            setRewards(combined);
        } catch (err) {
            console.error("Error fetching member dashboard:", err);
        } finally {
            setLoading(false);
        }
    }, [profile?.id, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const points = profile?.total_points || 0;
    const currentTier = getTier(points);
    const nextTier = getNextTier(points);
    const TierIcon = currentTier.icon;
    const progress = nextTier ? ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

    if (loading && !profile) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Welcome + Tier Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Welcome Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2"
                >
                    <div className={cn(
                        "relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl bg-gradient-to-br",
                        currentTier.color
                    )}>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="absolute top-6 right-6 opacity-10">
                            <TierIcon size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <TierIcon size={28} />
                                </div>
                                <Badge className="bg-white/20 border-0 text-white text-xs font-black uppercase tracking-widest">
                                    {currentTier.name} Member
                                </Badge>
                            </div>

                            <h2 className="text-3xl font-black mt-4">
                                Halo, {profile?.full_name?.split(' ')[0] || 'Member'}! 👋
                            </h2>
                            <p className="text-white/70 mt-1 text-sm font-medium">
                                Selamat datang kembali di Inka Otoservice.
                            </p>

                            {/* Points Display */}
                            <div className="mt-8 flex items-end gap-6">
                                <div>
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Total Poin Anda</p>
                                    <p className="text-5xl font-black mt-1 tracking-tight">{points.toLocaleString()}</p>
                                    <p className="text-white/50 text-xs font-bold mt-1">PTS</p>
                                </div>

                                {nextTier && (
                                    <div className="flex-1 max-w-xs mb-2">
                                        <div className="flex justify-between text-xs font-bold text-white/60 mb-2">
                                            <span>{currentTier.name}</span>
                                            <span>{nextTier.name} ({nextTier.min} PTS)</span>
                                        </div>
                                        <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(progress, 100)}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-white rounded-full"
                                            />
                                        </div>
                                        <p className="text-white/50 text-[10px] font-bold mt-1.5">
                                            {nextTier.min - points} poin lagi ke {nextTier.name}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="h-full border-slate-100 flex flex-col">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">
                            <Sparkles size={14} className="inline mr-2 text-amber-500" />
                            Menu Cepat
                        </h3>
                        <div className="space-y-3 flex-1">
                            {[
                                { label: 'Booking Servis', icon: CalendarPlus, href: '/booking-online', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                                { label: 'Tukar Reward', icon: Gift, href: '/rewards-member', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                                { label: 'Montir AI', icon: Bot, href: '/montir-ai', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                                { label: 'Riwayat Servis', icon: Clock, href: '/riwayat-servis', color: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
                                { label: 'Kritik & Saran', icon: MessageSquarePlus, href: '/complain', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => router.push(item.href)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                        item.color
                                    )}
                                >
                                    <item.icon size={18} />
                                    <span className="text-sm font-bold flex-1 text-left">{item.label}</span>
                                    <ChevronRight size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Servis', value: stats.totalServices, suffix: 'kali', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Bulan Ini', value: stats.thisMonthServices, suffix: 'servis', icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Total Transaksi', value: formatPrice(stats.totalSpent), suffix: '', icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
                    { label: 'Poin Terkumpul', value: points.toLocaleString(), suffix: 'PTS', icon: Star, color: 'text-amber-600 bg-amber-50' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                    >
                        <Card className="border-slate-100">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.color)}>
                                <stat.icon size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
                            {stat.suffix && <p className="text-xs text-slate-400 font-bold">{stat.suffix}</p>}
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Services */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="text-primary" size={24} />
                            Servis Terakhir
                        </h3>
                        <button
                            onClick={() => router.push('/riwayat-servis')}
                            className="text-sm font-bold text-primary hover:underline"
                        >
                            Lihat Semua
                        </button>
                    </div>

                    <Card className="p-0 overflow-hidden border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Kendaraan</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Cabang</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Total</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentServices.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">
                                                <Car className="mx-auto mb-2 text-slate-300" size={32} />
                                                Belum ada riwayat servis.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentServices.map((svc) => (
                                            <tr key={svc.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900">{svc.car_type || '-'}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{svc.license_plate || '-'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600 flex items-center gap-1">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        {(svc.branch as any)?.name || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {formatPrice(svc.total || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {new Date(svc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Available Rewards */}
                    <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Gift className="text-amber-500" size={20} />
                                Reward Tersedia
                            </h3>
                            <button
                                onClick={() => router.push('/rewards-member')}
                                className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline"
                            >
                                Lihat Semua
                            </button>
                        </div>
                        <div className="space-y-3">
                            {rewards.length === 0 ? (
                                <p className="text-sm text-slate-400 py-4 text-center">Belum ada reward tersedia.</p>
                            ) : (
                                rewards.map((reward) => (
                                    <div
                                        key={reward.id}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                            points >= reward.points_required
                                                ? "bg-white border-amber-200 shadow-sm"
                                                : "bg-slate-50/50 border-slate-100 opacity-60"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                            points >= reward.points_required ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                                        )}>
                                            <Gift size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{reward.name}</p>
                                            <p className="text-xs text-amber-600 font-bold">{reward.points_required} PTS</p>
                                        </div>
                                        {points >= reward.points_required && (
                                            <Badge className="bg-amber-500 text-white border-0 text-[9px] shrink-0">
                                                BISA DITUKAR
                                            </Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Promo Card */}
                    <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5">
                            <Sparkles size={100} />
                        </div>
                        <h3 className="font-bold text-lg mb-2">💡 Tips Member</h3>
                        <ul className="space-y-3 text-sm text-slate-600 relative z-10">
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0">1</span>
                                Servis rutin untuk kumpulkan poin lebih banyak.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0">2</span>
                                Tukar poin dengan diskon atau produk gratis.
                            </li>

                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
}
