"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    TrendingUp,
    Users,
    Building2,
    ArrowRight,
    Trophy,
    Target,
    Zap,
    Medal,
    Clock3,
    Check,
    X,
    Pencil,
    ShieldCheck,
    ArrowLeftRight
} from "lucide-react";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";

interface BranchTarget {
    branchId: string;
    branchName: string;
    target: number;
    revenue: number;
}

export default function OwnerDashboard() {
    const [loading, setLoading] = useState(true);
    const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
    const [monthlyTarget, setMonthlyTarget] = useState(0);
    const [branchTargets, setBranchTargets] = useState<BranchTarget[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [quickStats, setQuickStats] = useState({ member: 0, pendingWD: 0 });
    const [branchComparison, setBranchComparison] = useState<{ labels: string[], branches: any[] }>({ labels: [], branches: [] });

    const { profile } = useAuth();
    const supabase = useMemo(() => createClient(), []);

    const fetchOverviewData = useCallback(async () => {
        setLoading(true);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        try {
            const [
                { data: branches },
                { data: transactionsData },
                { data: targetSetting },
                { count: mCount },
                { count: pWD },
                { data: recent }
            ] = await Promise.all([
                supabase.from("branches").select("id, name").order("name"),
                supabase.from("transactions").select("total_amount, branch_id").eq('status', 'Paid').gte('created_at', startOfMonth),
                supabase.from('app_settings').select('value').eq('key', 'branch_targets').single(),
                supabase.from("profiles").select("id", { count: 'exact', head: true }).eq("role", "member"),
                supabase.from("withdrawals").select("id", { count: 'exact', head: true }).eq("status", "pending"),
                supabase.from("bookings").select("id, customer_name, car_model, branch_id, status").order("created_at", { ascending: false }).limit(5)
            ]);

            const paidTransactions = transactionsData || [];
            const revenueSum = paidTransactions.reduce((acc: number, t: any) => acc + Number(t.total_amount), 0);
            setCurrentMonthRevenue(revenueSum);

            let targetMap: Record<string, { name: string; target: number }> = {};
            if (targetSetting?.value) {
                try { targetMap = JSON.parse(targetSetting.value); } catch (e) { }
            }
            setMonthlyTarget(Object.values(targetMap).reduce((acc: number, t: any) => acc + t.target, 0) || 500000000);

            if (branches) {
                // Deduplicate branches by name to prevent double data display
                const uniqueBranches = branches.filter((br: any, index: number, self: any[]) =>
                    index === self.findIndex((t: any) => t.name === br.name)
                );

                setBranchTargets(uniqueBranches.map((br: any) => ({
                    branchId: br.id,
                    branchName: br.name,
                    target: targetMap[br.id]?.target || 250000000,
                    revenue: paidTransactions.filter((t: any) => t.branch_id === br.id).reduce((acc: number, t: any) => acc + Number(t.total_amount), 0)
                })));

                if (recent) {
                    setRecentBookings(recent.map((r: any) => ({
                        ...r,
                        branch_name: branches.find((b: any) => b.id === r.branch_id)?.name || 'Unknown'
                    })));
                }
            }

            setQuickStats({ member: mCount || 0, pendingWD: pWD || 0 });

            // Fetch Comparison Data (Last 6 Months)
            if (uniqueBranches.length > 0) {
                const months = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    months.push({
                        start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
                        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
                        label: d.toLocaleDateString('id-ID', { month: 'short' })
                    });
                }

                const branchesComparisonData = await Promise.all(uniqueBranches.map(async (br: any) => {
                    const branchMonthlyData = await Promise.all(months.map(async (m) => {
                        const { data } = await supabase
                            .from("transactions")
                            .select("total_amount")
                            .eq('status', 'Paid')
                            .eq('branch_id', br.id)
                            .gte('created_at', m.start)
                            .lte('created_at', m.end);

                        return (data || []).reduce((acc: number, t: any) => acc + Number(t.total_amount), 0);
                    }));

                    return {
                        name: br.name,
                        data: branchMonthlyData
                    };
                }));

                setBranchComparison({
                    labels: months.map(m => m.label),
                    branches: branchesComparisonData
                });
            }

        } catch (error) {
            console.error("Overview error:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchOverviewData();
    }, [fetchOverviewData]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 mt-4 font-medium italic">menyiapkan ringkasan...</p>
            </div>
        );
    }

    const overallPct = Math.round((currentMonthRevenue / (monthlyTarget || 1)) * 100);

    return (
        <div className="space-y-10 pb-20">
            {/* Simple Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Halo, {profile?.full_name?.split(' ')[0]}! <motion.span initial={{ rotate: 0 }} animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>👋</motion.span>
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Berikut adalah ringkasan bisnis Anda hari ini.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/analytics/branches" className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        Analisa Detail <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {/* Top Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">Rp {currentMonthRevenue.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Revenue Bulan Ini</p>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{quickStats.member}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Total Jaringan Member</p>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Target size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{overallPct}%</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Pencapaian Global</p>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between hover:shadow-blue-50/50 transition-all border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <ShieldCheck size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{quickStats.pendingWD}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Pending Withdrawals</p>
                    </div>
                </Card>
            </div>

            {/* Target Progress Bar Container */}
            <Card className="border-none shadow-2xl bg-gradient-to-r from-blue-700 to-indigo-800 p-8 sm:p-10 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Target Konsolidasi Bulanan</p>
                            <h3 className="text-4xl font-black tracking-tighter">
                                Rp {currentMonthRevenue.toLocaleString('id-ID')}
                                <span className="text-xl font-bold text-blue-300 ml-3">/ Rp {monthlyTarget.toLocaleString('id-ID')}</span>
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-6xl font-black tracking-tighter italic opacity-90">{overallPct}%</p>
                        </div>
                    </div>
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner p-1">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(overallPct, 100)}%` }}
                            transition={{ duration: 1.5 }}
                            className={cn(
                                "h-full rounded-full shadow-lg",
                                overallPct >= 100 ? "bg-emerald-400" : "bg-gradient-to-r from-blue-300 to-white"
                            )}
                        />
                    </div>
                </div>
                <Building2 size={240} className="absolute -right-20 -bottom-20 text-white/5 transform rotate-12" />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                {/* Branch Quick Cards */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Cabang Utama</h4>
                        <Link href="/analytics/branches" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Lihat Detail</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {branchTargets.map(bt => (
                            <Card key={bt.branchId} className="p-6 border-none shadow-xl bg-white hover:shadow-2xl transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase tracking-tight">{bt.branchName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{Math.round((bt.revenue / bt.target) * 100)}% Target</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-xl font-black text-slate-900 italic">Rp {bt.revenue.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                        <div className="h-full bg-blue-600" style={{ width: `${Math.min((bt.revenue / bt.target) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Recent Activities */}
                <Card className="border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Terakhir</h4>
                        <Zap size={14} className="text-amber-500 animate-pulse" />
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentBookings.map(rb => (
                            <div key={rb.id} className="p-4 hover:bg-slate-50 transition-all group">
                                <p className="font-black text-slate-900 uppercase text-xs truncate">{rb.customer_name}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{rb.car_model}</p>
                                    <Badge variant={rb.status === 'completed' ? 'success' : 'neutral'} className="text-[8px] px-2 py-0">
                                        {rb.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href="/bookings" className="block w-full text-center p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors border-t border-slate-50">
                        Lihat Semua Booking
                    </Link>
                </Card>
            </div>

            {/* Comparison Chart Section */}
            {branchComparison.branches.length > 0 && (
                <Card className="border-none shadow-2xl bg-white p-8">
                    <CardHeader className="px-0 pt-0 mb-8 border-b border-slate-50 pb-6 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-inner">
                                <ArrowLeftRight size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Perbandingan Antar Cabang</h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">Visualisasi performa real-time antar lokasi bengkel.</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0">
                        <div className="h-[400px]">
                            <BranchComparisonChart branches={branchComparison.branches} labels={branchComparison.labels} height={400} />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
