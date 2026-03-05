"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    TrendingUp,
    TrendingDown,
    Loader2,
    BarChart3,
    ArrowRight,
    Trophy,
    DollarSign,
    Target,
    Zap,
    Clock,
    Car,
    CheckCircle2,
    CalendarClock,
    Timer,
    UserPlus,
    RotateCcw,
    PackageSearch,
    Wrench,
} from "lucide-react";
import SalesChart from "./SalesChart";

type SalesPeriod = '7d' | '1m' | '1y';

const PERIOD_OPTIONS: { key: SalesPeriod; label: string }[] = [
    { key: '7d', label: '7 Hari' },
    { key: '1m', label: '1 Bulan' },
    { key: '1y', label: '1 Tahun' },
];

interface VehicleInProgress {
    id: string;
    customer_name: string;
    car_model: string;
    license_plate: string;
    status: string;
    created_at: string;
    updated_at: string;
    duration: string;
    durationMinutes: number;
}

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [todayBookingsIn, setTodayBookingsIn] = useState(0);
    const [todayProcessing, setTodayProcessing] = useState(0);
    const [todayCompleted, setTodayCompleted] = useState(0);
    const [todayRevenue, setTodayRevenue] = useState(0);
    const [branchTarget, setBranchTarget] = useState(250000000);
    const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
    const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
    const [salesHistory, setSalesHistory] = useState<{ label: string; value: number }[]>([]);
    const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('7d');
    const [vehiclesInProgress, setVehiclesInProgress] = useState<VehicleInProgress[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [retentionStats, setRetentionStats] = useState({ new: 0, repeat: 0 });
    const [avgServiceTime, setAvgServiceTime] = useState({ value: 0, label: '0m' });
    const [topServices, setTopServices] = useState<{ name: string; count: number; color: string }[]>([]);
    const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number }[]>([]);

    const { branchId, branchName } = useAuth();
    const supabase = createClient();

    const formatDuration = (ms: number): string => {
        const minutes = Math.round(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours < 24) return `${hours}j ${remainingMinutes}m`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}h ${remainingHours}j`;
    };

    const fetchDashboardData = async () => {
        if (!branchId) return;
        setLoading(true);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Fetch all bookings for this branch
        const { data: allBookings } = await supabase
            .from("bookings")
            .select("*")
            .eq("branch_id", branchId);

        // Fetch transactions for this branch
        const { data: allTransactions } = await supabase
            .from("transactions")
            .select("*")
            .eq("branch_id", branchId);

        const paidTransactions = allTransactions?.filter(t => t.status === 'Paid') || [];

        // === TODAY STATS ===
        const todayBookings = (allBookings || []).filter(b => {
            const bDate = new Date(b.created_at || b.service_date);
            return bDate.toISOString().split('T')[0] === todayStr;
        });

        setTodayBookingsIn(todayBookings.length);
        setTodayProcessing(todayBookings.filter(b => b.status === "processing").length);
        setTodayCompleted(todayBookings.filter(b => b.status === "completed").length);

        const todayTx = paidTransactions.filter(t =>
            new Date(t.created_at).toISOString().split('T')[0] === todayStr
        );
        setTodayRevenue(todayTx.reduce((acc, t) => acc + Number(t.total_amount), 0));

        // === BRANCH TARGET ===
        const { data: targetSetting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'branch_targets')
            .single();

        if (targetSetting?.value) {
            try {
                const targetMap = JSON.parse(targetSetting.value);
                if (targetMap[branchId]) {
                    setBranchTarget(targetMap[branchId].target || 250000000);
                }
            } catch (e) { }
        }

        // === MONTHLY REVENUE ===
        const thisMonthRevenue = paidTransactions
            .filter(t => new Date(t.created_at) >= firstDayThisMonth)
            .reduce((acc, t) => acc + Number(t.total_amount), 0);

        const prevMonthRevenue = paidTransactions
            .filter(t => {
                const tDate = new Date(t.created_at);
                return tDate >= firstDayLastMonth && tDate <= lastDayLastMonth;
            })
            .reduce((acc, t) => acc + Number(t.total_amount), 0);

        setCurrentMonthRevenue(thisMonthRevenue);
        setLastMonthRevenue(prevMonthRevenue);

        // === SALES CHART ===
        const today = new Date();
        const AVG_PRICE = paidTransactions.length > 0
            ? paidTransactions.reduce((acc, t) => acc + Number(t.total_amount), 0) / paidTransactions.length
            : 500000;

        const salesData = generateSalesData(salesPeriod, paidTransactions, AVG_PRICE, today);
        setSalesHistory(salesData);

        // === VEHICLES IN PROGRESS (duration tracking) ===
        const processingBookings = (allBookings || []).filter(b => b.status === "processing");
        const completedToday = (allBookings || []).filter(b =>
            b.status === "completed" &&
            new Date(b.updated_at).toISOString().split('T')[0] === todayStr
        );

        const vehiclesList: VehicleInProgress[] = [...processingBookings, ...completedToday].map(b => {
            const start = new Date(b.created_at).getTime();
            const end = b.status === "completed"
                ? new Date(b.updated_at).getTime()
                : Date.now();
            const durationMs = end - start;
            return {
                id: b.id,
                customer_name: b.customer_name,
                car_model: b.car_model || '-',
                license_plate: b.license_plate || '-',
                status: b.status,
                created_at: b.created_at,
                updated_at: b.updated_at,
                duration: formatDuration(durationMs),
                durationMinutes: Math.round(durationMs / 60000),
            };
        }).sort((a, b) => {
            // Processing first, then completed
            if (a.status === 'processing' && b.status !== 'processing') return -1;
            if (a.status !== 'processing' && b.status === 'processing') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setVehiclesInProgress(vehiclesList);

        // === RECENT BOOKINGS ===
        const { data: recent } = await supabase
            .from("bookings")
            .select("*")
            .eq("branch_id", branchId)
            .order("created_at", { ascending: false })
            .limit(5);

        if (recent) setRecentBookings(recent);

        // === CUSTOMER RETENTION ===
        const phoneCounts = new Map<string, number>();
        (allBookings || []).forEach(b => {
            if (b.customer_phone) {
                phoneCounts.set(b.customer_phone, (phoneCounts.get(b.customer_phone) || 0) + 1);
            }
        });
        const totalCustomers = phoneCounts.size || 1;
        const repeatCustomers = Array.from(phoneCounts.values()).filter(count => count > 1).length;
        setRetentionStats({ new: totalCustomers - repeatCustomers, repeat: repeatCustomers });

        // === AVG SERVICE TIME ===
        const completedBookings = (allBookings || []).filter(b => b.status === "completed");
        const serviceTimesInMs = completedBookings
            .map(b => {
                const start = new Date(b.created_at).getTime();
                const end = new Date(b.updated_at).getTime();
                return end - start;
            })
            .filter(t => t > 0);

        const avgMs = serviceTimesInMs.length > 0
            ? serviceTimesInMs.reduce((a, b) => a + b, 0) / serviceTimesInMs.length
            : 0;

        const avgMinutes = Math.round(avgMs / 60000);
        setAvgServiceTime({
            value: avgMinutes,
            label: avgMinutes > 60 ? `${Math.floor(avgMinutes / 60)}j ${avgMinutes % 60}m` : `${avgMinutes}m`
        });

        // === TOP SERVICES ===
        const serviceColors = ['#2563eb', '#059669', '#7c3aed', '#f59e0b', '#ef4444'];
        const serviceCounts = new Map<string, number>();
        (allBookings || []).forEach(b => {
            const svc = b.service_type || b.service || 'Lainnya';
            serviceCounts.set(svc, (serviceCounts.get(svc) || 0) + 1);
        });
        const topSvcList = Array.from(serviceCounts.entries())
            .map(([name, count], i) => ({ name, count, color: serviceColors[i % serviceColors.length] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        setTopServices(topSvcList);

        // === LOW STOCK / INVENTORY RISK ===
        const { data: lowStock } = await supabase
            .from("catalog")
            .select("name, stock")
            .eq("category", "Spare Part")
            .lt("stock", 5)
            .limit(5);
        if (lowStock) setLowStockItems(lowStock);

        setLoading(false);
    };

    const generateSalesData = (
        period: SalesPeriod,
        transactions: any[],
        avgPrice: number,
        today: Date
    ): { label: string; value: number }[] => {
        let points: number;
        let getDate: (i: number) => Date;
        let getLabel: (d: Date) => string;

        switch (period) {
            case '7d':
                points = 7;
                getDate = (i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { weekday: 'short' });
                break;
            case '1m':
                points = 30;
                getDate = (i) => { const d = new Date(today); d.setDate(today.getDate() - (29 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { day: 'numeric' });
                break;
            case '1y':
                points = 12;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (11 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short' });
                break;
        }

        return Array.from({ length: points }).map((_, i) => {
            const date = getDate(i);
            const dateStr = date.toISOString().split('T')[0];

            let realSales = 0;
            if (period === '7d' || period === '1m') {
                realSales = transactions.filter(t => {
                    return new Date(t.created_at).toISOString().split('T')[0] === dateStr;
                }).reduce((acc, t) => acc + Number(t.total_amount), 0);
            } else if (period === '1y') {
                const month = date.getMonth();
                const year = date.getFullYear();
                realSales = transactions.filter(t => {
                    const tDate = new Date(t.created_at);
                    return tDate.getMonth() === month && tDate.getFullYear() === year;
                }).reduce((acc, t) => acc + Number(t.total_amount), 0);
            }

            return { label: getLabel(date), value: realSales };
        });
    };

    useEffect(() => {
        fetchDashboardData();
    }, [salesPeriod, branchId]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="text-slate-500 mt-4 font-medium italic">Memuat data cabang...</p>
            </div>
        );
    }

    const targetPct = Math.round((currentMonthRevenue / (branchTarget || 1)) * 100);

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        Dashboard Admin
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">
                        Monitoring cabang <span className="text-blue-600 font-black">{branchName || 'Cabang'}</span> secara real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live</span>
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                </div>
            </div>

            {/* ===== SECTION 1: Today Stats ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Mobil Masuk */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-6 group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all overflow-hidden relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Car size={22} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Masuk Hari Ini</p>
                    </div>
                    <div className="mt-6 relative z-10">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">{todayBookingsIn}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Unit kendaraan</p>
                    </div>
                </Card>

                {/* Sedang Dikerjakan */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-6 group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all overflow-hidden relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Zap size={22} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Dikerjakan</p>
                    </div>
                    <div className="mt-6 relative z-10">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">{todayProcessing}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Sedang proses</p>
                    </div>
                </Card>

                {/* Selesai */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-6 group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all overflow-hidden relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <CheckCircle2 size={22} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Selesai</p>
                    </div>
                    <div className="mt-6 relative z-10">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">{todayCompleted}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Hari ini</p>
                    </div>
                </Card>

                {/* Pendapatan Hari Ini */}
                <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-6 text-white group relative overflow-hidden ring-4 ring-indigo-50/50">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-lg rounded-2xl">
                            <DollarSign size={22} />
                        </div>
                        <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.15em]">Hari Ini</p>
                    </div>
                    <div className="mt-6 relative z-10">
                        <h3 className="text-2xl font-black tracking-tighter">
                            Rp {todayRevenue.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-[10px] text-indigo-200 mt-1 font-bold">Pendapatan</p>
                    </div>
                    <DollarSign size={120} className="absolute -right-8 -bottom-8 text-white/5 transform -rotate-12" />
                </Card>
            </div>

            {/* ===== SECTION 2: Target Bulanan & Revenue ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Target Cabang */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-8 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Target size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Target Bulanan</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em]">Pencapaian</p>
                                <p className="text-2xl font-black tracking-tight mt-1">
                                    Rp {currentMonthRevenue.toLocaleString('id-ID')}
                                </p>
                                <p className="text-[10px] text-indigo-200 font-bold mt-0.5">
                                    dari Rp {branchTarget.toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black tracking-tighter italic">{targetPct}%</p>
                                <p className="text-[9px] text-indigo-200 font-black uppercase tracking-widest mt-1">tercapai</p>
                            </div>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(targetPct, 100)}%` }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className={cn(
                                    "h-full rounded-full",
                                    targetPct >= 100 ? "bg-emerald-400" : "bg-gradient-to-r from-blue-300 to-indigo-200"
                                )}
                            />
                        </div>
                        {(() => {
                            let insight = "Bulan baru dimulai, ayo mulai kejar target! 🚀";
                            const daysPassed = new Date().getDate();
                            if (targetPct >= 100) insight = "Luar biasa! Target bulan ini sudah tercapai! 🏆";
                            else if (targetPct >= 70) insight = "Tinggal sedikit lagi, pertahankan! 📈";
                            else if (daysPassed > 15 && targetPct < 40) insight = "Perlu effort lebih, target masih jauh ⚠️";
                            else if (daysPassed > 5 && targetPct > 0) insight = "Terus konsisten, ritme sudah bagus 🏁";
                            return (
                                <p className="text-[10px] text-indigo-100 font-bold mt-3 bg-white/10 w-fit px-3 py-1 rounded-full">
                                    💡 {insight}
                                </p>
                            );
                        })()}
                    </div>
                </Card>

                {/* Revenue Bulan Ini */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-8 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Revenue Cabang</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Bulan ini vs bulan lalu
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bulan Ini</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">
                                    Rp {currentMonthRevenue.toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="text-right">
                                {lastMonthRevenue > 0 ? (
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl",
                                        currentMonthRevenue >= lastMonthRevenue
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-rose-50 text-rose-600"
                                    )}>
                                        {currentMonthRevenue >= lastMonthRevenue
                                            ? <TrendingUp size={16} />
                                            : <TrendingDown size={16} />
                                        }
                                        <span className="text-sm font-black">
                                            {(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400">N/A</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulan Lalu</p>
                                <p className="text-lg font-black text-slate-600 tracking-tight mt-0.5">
                                    Rp {lastMonthRevenue.toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selisih</p>
                                <p className={cn(
                                    "text-lg font-black tracking-tight mt-0.5",
                                    currentMonthRevenue >= lastMonthRevenue ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {currentMonthRevenue >= lastMonthRevenue ? "+" : ""}
                                    Rp {(currentMonthRevenue - lastMonthRevenue).toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ===== SECTION 3: Sales Chart ===== */}
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-0 overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-slate-100">
                <CardHeader className="p-8 border-b border-slate-50 bg-gradient-to-br from-white via-white to-blue-50/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
                                <BarChart3 size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Tren Pendapatan</h3>
                                <p className="text-sm text-slate-500 font-medium leading-none mt-1">
                                    Data pendapatan cabang {branchName} — {PERIOD_OPTIONS.find(p => p.key === salesPeriod)?.label}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl ring-1 ring-slate-200/50">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSalesPeriod(opt.key)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95",
                                        salesPeriod === opt.key
                                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-[300px] w-full">
                        <SalesChart data={salesHistory} height={300} color="#2563eb" />
                    </div>
                </CardContent>
            </Card>

            {/* ===== SECTION 4: Durasi Pengerjaan Mobil ===== */}
            <Card className="border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Timer size={20} className="text-amber-600" />
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Durasi Pengerjaan Mobil</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">
                        {vehiclesInProgress.length} kendaraan
                    </span>
                </div>
                <CardContent className="p-0">
                    {vehiclesInProgress.length === 0 ? (
                        <div className="p-10 text-center">
                            <CalendarClock size={40} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold">Belum ada kendaraan yang dikerjakan hari ini</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {vehiclesInProgress.map((v) => (
                                <div key={v.id} className="flex items-center justify-between p-5 px-8 hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-5 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            v.status === 'processing'
                                                ? 'bg-amber-50 text-amber-600'
                                                : 'bg-emerald-50 text-emerald-600'
                                        )}>
                                            {v.status === 'processing' ? <Zap size={18} /> : <CheckCircle2 size={18} />}
                                        </div>
                                        <div className="truncate">
                                            <p className="font-black text-base text-slate-900 truncate leading-none mb-1">
                                                {v.customer_name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                                {v.car_model} • {v.license_plate}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                                            v.status === 'processing'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                        )}>
                                            {v.status === 'processing' ? '⚡ Proses' : '✅ Selesai'}
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black",
                                            v.status === 'processing'
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                        )}>
                                            <Clock size={12} />
                                            {v.duration}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ===== SECTION 5: Recent Bookings ===== */}
            <Card className="border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Booking Terbaru</h4>
                    <Link href="/bookings">
                        <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                            Lihat Semua <ArrowRight size={12} />
                        </button>
                    </Link>
                </div>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                        {recentBookings.map((bk) => (
                            <div key={bk.id} className="flex items-center justify-between p-5 px-8 hover:bg-slate-50 transition-all group">
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="w-2 h-10 bg-slate-50 rounded-full group-hover:bg-blue-100 transition-colors" />
                                    <div className="truncate">
                                        <p className="font-black text-base text-slate-900 truncate leading-none mb-1">{bk.customer_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                            {bk.car_model} • {bk.license_plate || '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em]",
                                        bk.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            bk.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                    )}>
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            bk.status === 'completed' ? 'bg-emerald-500' :
                                                bk.status === 'processing' ? 'bg-blue-500' :
                                                    'bg-slate-400'
                                        )} />
                                        {bk.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {recentBookings.length === 0 && (
                            <div className="p-10 text-center">
                                <p className="text-sm text-slate-400 font-bold">Belum ada booking</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ===== SECTION 6: Top Services & Inventory Risk ===== */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Top Services */}
                <Card className="border-none shadow-2xl bg-white p-8 ring-1 ring-slate-100">
                    <div className="flex items-center gap-4 mb-8">
                        <Trophy size={24} className="text-amber-500" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Top Services</h3>
                    </div>
                    {topServices.length > 0 ? (
                        <div className="space-y-6">
                            {topServices.map((service) => (
                                <div key={service.name} className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight truncate mr-4">{service.name}</span>
                                        <span className="text-xs font-black text-slate-900 flex-shrink-0">{service.count} unit</span>
                                    </div>
                                    <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(service.count / Math.max(...topServices.map(s => s.count))) * 100}%` }}
                                            transition={{ duration: 1.5 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: service.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Wrench size={36} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold">Belum ada data servis</p>
                        </div>
                    )}
                </Card>

                {/* Inventory Risk */}
                <Card className="border-none shadow-2xl bg-rose-50/30 p-8 border-t-8 border-rose-500">
                    <div className="flex items-center gap-4 mb-8">
                        <PackageSearch size={24} className="text-rose-500" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Inventory Risk</h3>
                    </div>
                    <div className="space-y-4">
                        {lowStockItems.map(item => (
                            <div key={item.name} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.name}</span>
                                <Badge variant="danger" className="text-xs font-black">Sisa {item.stock}</Badge>
                            </div>
                        ))}
                        {lowStockItems.length === 0 && (
                            <div className="text-center py-8">
                                <CheckCircle2 size={36} className="text-emerald-300 mx-auto mb-3" />
                                <p className="text-center text-emerald-600 font-black uppercase text-xs">Semua Stok Aman</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ===== SECTION 7: Analytics ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
                {/* Customer Retention */}
                <Card className="border-none shadow-2xl bg-white p-8 ring-1 ring-slate-100">
                    <div className="flex items-center gap-3 mb-8">
                        <RotateCcw size={22} className="text-blue-600" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer Retention</h3>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs font-black text-slate-900 uppercase">Repeat Rate</p>
                            <span className="text-3xl font-black text-blue-600 italic">
                                {Math.round((retentionStats.repeat / (retentionStats.new + retentionStats.repeat || 1)) * 100)}%
                            </span>
                        </div>
                        <div className="h-4 w-full bg-white rounded-full overflow-hidden flex p-1 border border-slate-200">
                            <div
                                className="h-full bg-emerald-500 rounded-l-full transition-all"
                                style={{ width: `${(retentionStats.new / (retentionStats.new + retentionStats.repeat || 1)) * 100}%` }}
                            />
                            <div
                                className="h-full bg-blue-500 rounded-r-full transition-all"
                                style={{ width: `${(retentionStats.repeat / (retentionStats.new + retentionStats.repeat || 1)) * 100}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Baru ({retentionStats.new})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Repeat ({retentionStats.repeat})
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Avg Handling Time */}
                <Card className="border-none shadow-2xl bg-slate-900 p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <Clock size={22} className="text-slate-400" />
                            <h3 className="text-xl font-black tracking-tight">Avg. Handling Time</h3>
                        </div>
                        <div className="flex flex-col items-center justify-center py-8">
                            <h4 className="text-7xl font-black italic text-emerald-400 tracking-tighter">
                                {avgServiceTime.label}
                            </h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">
                                Rata-rata waktu pengerjaan
                            </p>
                        </div>
                    </div>
                    <Clock size={180} className="absolute -right-12 -bottom-12 text-white/[0.03] transform rotate-12" />
                </Card>
            </div>
        </div>
    );
}
