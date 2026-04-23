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
    BarChart3,
    ArrowRight,
    DollarSign,
    Target,
    Zap,
    Car,
    CheckCircle2,
    CalendarClock,
    Timer,
    Bot,
    UserPlus,
    Wrench,
    Activity,
    Check,
} from "lucide-react";

interface VehicleInProgress {
    id: string;
    customer_name: string;
    car_model: string;
    license_plate: string;
    status: string;
    created_at: string;
    updated_at: string;
    duration: string;
}

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [todayStats, setTodayStats] = useState({
        in: 0,
        processing: 0,
        completed: 0,
        revenue: 0
    });
    const [branchTarget, setBranchTarget] = useState(250000000);
    const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
    const [vehiclesInProgress, setVehiclesInProgress] = useState<VehicleInProgress[]>([]);

    const { branchId, branchName } = useAuth();
    const supabase = useMemo(() => createClient(), []);

    const formatDuration = (ms: number): string => {
        const minutes = Math.round(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}j ${remainingMinutes}m`;
    };

    const fetchAdminOverview = useCallback(async () => {
        if (!branchId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        try {
            const [
                { data: bookings },
                { data: transactions },
                { data: targetSetting }
            ] = await Promise.all([
                supabase.from("bookings").select("*").eq("branch_id", branchId).gte('created_at', startOfMonth),
                supabase.from("transactions").select("total_amount, status, created_at").eq("branch_id", branchId).gte('created_at', startOfMonth),
                supabase.from('app_settings').select('value').eq('key', 'branch_targets').single()
            ]);

            const monthBookings = bookings || [];
            const todayBookings = monthBookings.filter(b => b.created_at?.startsWith(todayStr));
            const paidTxs = (transactions || []).filter(t => t.status === 'Paid');

            setTodayStats({
                in: todayBookings.length,
                processing: todayBookings.filter(b => b.status === 'processing').length,
                completed: todayBookings.filter(b => b.status === 'completed').length,
                revenue: paidTxs.filter(t => t.created_at?.startsWith(todayStr)).reduce((acc, t) => acc + Number(t.total_amount), 0)
            });

            setCurrentMonthRevenue(paidTxs.reduce((acc, t) => acc + Number(t.total_amount), 0));

            if (targetSetting?.value) {
                try {
                    const targetMap = JSON.parse(targetSetting.value);
                    if (targetMap[branchId]) setBranchTarget(targetMap[branchId].target || 250000000);
                } catch (e) { }
            }

            // Real-time List
            const activeList = monthBookings
                .filter(b => b.status === 'processing' || (b.status === 'completed' && b.updated_at?.startsWith(todayStr)))
                .map(b => {
                    const durationMs = (b.status === 'completed' ? new Date(b.updated_at).getTime() : Date.now()) - new Date(b.created_at).getTime();
                    return {
                        id: b.id, customer_name: b.customer_name, car_model: b.car_model || '-', license_plate: b.license_plate || '-',
                        status: b.status, created_at: b.created_at, updated_at: b.updated_at,
                        duration: formatDuration(durationMs)
                    };
                }).sort((a, b) => (a.status === 'processing' ? -1 : 1));

            setVehiclesInProgress(activeList);

        } catch (error) {
            console.error("Admin overview error:", error);
        } finally {
            setLoading(false);
        }
    }, [branchId, supabase]);

    useEffect(() => {
        fetchAdminOverview();
    }, [fetchAdminOverview]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <Activity size={40} className="animate-spin text-primary" />
                <p className="text-slate-500 mt-4 font-medium italic">status cabang terkini...</p>
            </div>
        );
    }

    const targetPct = Math.round((currentMonthRevenue / (branchTarget || 1)) * 100);

    return (
        <div className="space-y-10 pb-20">
            {/* Admin Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Status {branchName} 🏁</h2>
                    <p className="text-slate-500 mt-1 font-medium">Overview operasional dan pencapaian hari ini.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/analytics/operations" className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        Monitor Live <Bot size={14} className="text-blue-600" />
                    </Link>
                </div>
            </div>

            {/* Today Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between hover:shadow-2xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Car size={22} />
                        </div>
                        <Badge variant="neutral" className="font-black text-[8px]">In</Badge>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{todayStats.in}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Mobil Masuk Hari Ini</p>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between hover:shadow-2xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Zap size={22} />
                        </div>
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{todayStats.processing}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Sedang Dikerjakan</p>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-xl bg-white flex flex-col justify-between hover:shadow-2xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <CheckCircle2 size={22} />
                        </div>
                        <Check size={14} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{todayStats.completed}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Selesai Hari Ini</p>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-2xl bg-white flex flex-col justify-between hover:shadow-emerald-50/50 transition-all border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <DollarSign size={22} />
                        </div>
                        <TrendingUp size={14} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">Rp {todayStats.revenue.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Pendapatan Hari Ini</p>
                    </div>
                </Card>
            </div>

            {/* Monthly Target Mini Card */}
            <Card className="border-none shadow-2xl bg-white p-8 overflow-hidden relative group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Target size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Target Cabang Bulan Ini</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                Rp {currentMonthRevenue.toLocaleString('id-ID')}
                                <span className="text-sm font-bold text-slate-400 ml-2">/ Rp {branchTarget.toLocaleString('id-ID')}</span>
                            </h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-5xl font-black text-indigo-600 tracking-tighter italic">{targetPct}%</p>
                        <Link href="/analytics/finance" className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-end gap-1 mt-1 hover:underline">
                            Detail Keuangan <ArrowRight size={10} />
                        </Link>
                    </div>
                </div>
                <div className="mt-8 h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(targetPct, 100)}%` }}
                        transition={{ duration: 1.5 }}
                        className={cn(
                            "h-full rounded-full",
                            targetPct >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                        )}
                    />
                </div>
                <Target size={150} className="absolute -left-10 -bottom-10 text-slate-50 opacity-50 transform -rotate-12" />
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Active Workshop Tracking */}
                <Card className="xl:col-span-2 border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                                <Timer size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Workshop Monitor</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kendaraan aktif & durasi pengerjaan</p>
                            </div>
                        </div>
                        <Link href="/antrian">
                            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Antrean Full</button>
                        </Link>
                    </CardHeader>
                    <div className="divide-y divide-slate-50">
                        {vehiclesInProgress.length === 0 ? (
                            <div className="p-20 text-center text-slate-400 italic">Tidak ada kendaraan aktif saat ini.</div>
                        ) : (
                            vehiclesInProgress.slice(0, 5).map(v => (
                                <div key={v.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-2 h-10 rounded-full",
                                            v.status === 'processing' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-emerald-400'
                                        )} />
                                        <div>
                                            <p className="font-black text-slate-900 uppercase tracking-tight">{v.customer_name} <span className="text-slate-300 mx-2 tracking-normal font-medium">|</span> {v.license_plate}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{v.car_model}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 tabular-nums italic">{v.duration}</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">Waktu Kerja</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Quick Actions & Short Menu */}
                <div className="space-y-6">
                    <Link href="/pos" className="block">
                        <div className="p-8 bg-white rounded-3xl shadow-xl flex items-center justify-between hover:bg-slate-50 transition-all border border-slate-50 active:scale-95 group">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Buka POS</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sistem Kasir Utama</p>
                                </div>
                            </div>
                            <ArrowRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/staff" className="block">
                        <div className="p-8 bg-white rounded-3xl shadow-xl flex items-center justify-between hover:bg-slate-50 transition-all border border-slate-50 active:scale-95 group">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Wrench size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Karyawan</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manajemen Tim</p>
                                </div>
                            </div>
                            <ArrowRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
