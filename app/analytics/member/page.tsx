"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    Users2,
    Trophy,
    Wallet,
    TrendingUp,
    ArrowUpRight,
    Search,
    Filter
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function MemberAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [mitraCount, setMitraCount] = useState(0);
    const [pendingWD, setPendingWD] = useState(0);
    const [mitraRevenueShare, setMitraRevenueShare] = useState({ mitra: 0, direct: 0 });
    const [mitraMVP, setMitraMVP] = useState<any[]>([]);

    const { role } = useAuth();
    const supabase = createClient();

    const fetchMitraData = async () => {
        setLoading(true);
        try {
            const [
                { count: mCount },
                { count: pWD },
                { data: transactionsData },
                { data: profilesData }
            ] = await Promise.all([
                supabase.from("profiles").select("id", { count: 'exact', head: true }).eq("role", "member"),
                supabase.from("withdrawals").select("id", { count: 'exact', head: true }).eq("status", "pending"),
                supabase.from("transactions").select("total_amount, status, mitra_id").eq('status', 'Paid'),
                supabase.from("profiles").select("id, full_name").eq("role", "member")
            ]);

            const paidTransactions = transactionsData || [];

            // Revenue Share
            const mitraRev = paidTransactions.filter(t => t.mitra_id).reduce((acc, t) => acc + Number(t.total_amount), 0);
            const directRev = paidTransactions.filter(t => !t.mitra_id).reduce((acc, t) => acc + Number(t.total_amount), 0);
            setMitraRevenueShare({ mitra: mitraRev, direct: directRev });

            // MVP Leaderboard
            const mitraMap = new Map<string, { revenue: number, visits: number }>();
            paidTransactions.forEach(t => {
                if (t.mitra_id) {
                    const existing = mitraMap.get(t.mitra_id) || { revenue: 0, visits: 0 };
                    mitraMap.set(t.mitra_id, {
                        revenue: existing.revenue + Number(t.total_amount),
                        visits: existing.visits + 1
                    });
                }
            });

            setMitraMVP(Array.from(mitraMap.entries())
                .map(([id, stats]) => ({
                    name: profilesData?.find(p => p.id === id)?.full_name || 'Mitra',
                    ...stats
                }))
                .sort((a, b) => b.revenue - a.revenue));

            setMitraCount(mCount || 0);
            setPendingWD(pWD || 0);

        } catch (error) {
            console.error("Error fetching mitra analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'owner') fetchMitraData();
    }, [role]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 mt-4 font-medium italic">memetakan performa mitra...</p>
            </div>
        );
    }

    const totalRevenue = mitraRevenueShare.mitra + mitraRevenueShare.direct;
    const mitraPct = Math.round((mitraRevenueShare.mitra / (totalRevenue || 1)) * 100);

    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users2 className="text-emerald-600" /> Analisis Member
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">Monitoring kontribusi member terhadap pertumbuhan bisnis.</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <Users2 size={24} />
                            </div>
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">+12%</span>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{mitraCount}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Total Member Terdaftar</p>
                        </div>
                    </Card>

                    <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                <Wallet size={24} />
                            </div>
                            <TrendingUp size={16} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{pendingWD}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Pending Withdrawals</p>
                        </div>
                    </Card>

                    <Card className="p-6 border-none shadow-xl bg-blue-600 text-white lg:col-span-2 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-4">Total Revenue Mitra</p>
                            <div className="flex items-end justify-between">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Rp {mitraRevenueShare.mitra.toLocaleString('id-ID')}</h3>
                                    <p className="text-xs text-blue-200 font-bold mt-1">Kontribusi {mitraPct}% dari total omset</p>
                                </div>
                                <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center font-black text-lg italic">
                                    {mitraPct}%
                                </div>
                            </div>
                        </div>
                        <Users2 size={120} className="absolute -right-10 -bottom-10 text-white/10" />
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Mitra MVP Table */}
                    <Card className="xl:col-span-2 border-none shadow-2xl bg-white p-0 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shadow-sm">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Member MVP Leaderboard</h3>
                                    <p className="text-xs text-slate-500 font-medium">Member dengan performa terbaik berdasarkan revenue.</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Mitra</th>
                                        <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral</th>
                                        <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {mitraMVP.map((mvp, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                                                    i === 0 ? "bg-amber-100 text-amber-600 shadow-sm" :
                                                        i === 1 ? "bg-slate-100 text-slate-600" :
                                                            i === 2 ? "bg-orange-50 text-orange-600" : "text-slate-400"
                                                )}>
                                                    {i + 1}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{mvp.name}</p>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black">{mvp.visits} Unit</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <p className="font-black text-slate-900 tracking-tight italic">Rp {mvp.revenue.toLocaleString('id-ID')}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Revenue Breakdown */}
                    <Card className="border-none shadow-2xl bg-white p-8">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Kanal Pendapatan</h3>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Direct (Non-Mitra)</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">Rp {mitraRevenueShare.direct.toLocaleString('id-ID')}</p>
                                    </div>
                                    <span className="text-xl font-black text-indigo-500 italic">{100 - mitraPct}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${100 - mitraPct}%` }}
                                        className="h-full bg-indigo-500 rounded-full"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Jaringan Mitra</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">Rp {mitraRevenueShare.mitra.toLocaleString('id-ID')}</p>
                                    </div>
                                    <span className="text-xl font-black text-emerald-500 italic">{mitraPct}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${mitraPct}%` }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-50">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-sm font-black text-slate-900 uppercase mb-2">💡 Insight</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        {mitraPct > 50
                                            ? "Jaringan mitra mendominasi omset. Pertahankan hubungan baik dan pastikan pembayaran komisi tepat waktu."
                                            : "Pendapatan direct masih stabil. Tingkatkan program insentif mitra untuk mendongkrak penjualan lebih jauh."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
