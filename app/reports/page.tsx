"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
    BarChart3, ArrowUp, ArrowDown, Download, Calendar, DollarSign,
    Package, Wrench, TrendingUp, TrendingDown,
    RefreshCw, AlertTriangle, Zap,
    Target, PieChart, Activity
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { motion } from "framer-motion";

// Types
type BranchOption = { id: string; name: string };

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getDateRangeFromMonthYear(month: number, year: number): { start: Date; end: Date } {
    return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59)
    };
}

function getPrevDateRangeFromMonthYear(month: number, year: number): { start: Date; end: Date } {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    return {
        start: new Date(prevYear, prevMonth, 1),
        end: new Date(prevYear, prevMonth + 1, 0, 23, 59, 59)
    };
}

function formatRp(n: number) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
    return n.toLocaleString('id-ID');
}

export default function ReportsPage() {
    const now = new Date();
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    // Current period data
    const [revenue, setRevenue] = useState(0);
    const [cogs, setCogs] = useState(0);
    const [commissionRate, setCommissionRate] = useState(5);
    const [expenses, setExpenses] = useState({ salaries: 0, utilities: 0, marketing: 0, others: 0 });

    // Previous period data (for trends)
    const [prevRevenue, setPrevRevenue] = useState(0);
    const [prevGrossMargin, setPrevGrossMargin] = useState(0);
    const [prevNetMargin, setPrevNetMargin] = useState(0);

    // Top items
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topServices, setTopServices] = useState<any[]>([]);

    // Monthly trend (6 months)
    const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; revenue: number; profit: number }[]>([]);

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch branches
            const { data: bData } = await supabase.from('branches').select('id, name').order('name');
            if (bData) setBranches(bData);

            // Fetch commission rate from app_settings
            const { data: settingsData } = await supabase.from('app_settings').select('value').eq('key', 'commission_rate').single();
            const rate = settingsData ? Number(settingsData.value) : 5;
            setCommissionRate(rate);

            const { start, end } = getDateRangeFromMonthYear(selectedMonth, selectedYear);
            const prev = getPrevDateRangeFromMonthYear(selectedMonth, selectedYear);

            // Helper: build query with optional date & branch filters
            const filterTrans = (query: any, s: Date, e: Date) => {
                let q = query.eq('status', 'Paid');
                q = q.gte('created_at', s.toISOString());
                q = q.lte('created_at', e.toISOString());
                if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
                return q;
            };

            // CURRENT PERIOD
            let transQ = supabase.from('transactions').select('id, total_amount, created_at, branch_id');
            transQ = filterTrans(transQ, start, end);
            const { data: transData } = await transQ;
            const totalRevenue = transData?.reduce((a, t) => a + Number(t.total_amount), 0) || 0;
            setRevenue(totalRevenue);

            // COGS
            const transIds = transData?.map(t => t.id) || [];
            let totalCogs = 0;
            if (transIds.length > 0) {
                const { data: itemsData } = await supabase
                    .from('transaction_items')
                    .select('cost_at_sale, price_at_sale, qty, transaction_id, catalog(name, category)')
                    .in('transaction_id', transIds);
                totalCogs = itemsData?.reduce((a, i) => a + (Number(i.cost_at_sale) * i.qty), 0) || 0;
                setCogs(totalCogs);

                // Top selling
                const itemMap: any = {};
                itemsData?.forEach((item: any) => {
                    const catalog = Array.isArray(item.catalog) ? item.catalog[0] : item.catalog;
                    const name = catalog?.name || 'Unknown';
                    const category = catalog?.category || 'Spare Part';
                    if (!itemMap[name]) itemMap[name] = { name, category, qty: 0, revenue: 0 };
                    itemMap[name].qty += item.qty || 0;
                    itemMap[name].revenue += (item.price_at_sale || 0) * (item.qty || 0);
                });
                const sorted = Object.values(itemMap).sort((a: any, b: any) => b.qty - a.qty);
                setTopProducts(sorted.filter((i: any) => i.category === 'Spare Part').slice(0, 3));
                setTopServices(sorted.filter((i: any) => i.category === 'Service').slice(0, 3));
            } else {
                setCogs(0);
                setTopProducts([]);
                setTopServices([]);
            }

            // EXPENSES
            let expQ = supabase.from('expenses').select('*');
            expQ = expQ.gte('expense_date', start.toISOString().split('T')[0]);
            expQ = expQ.lte('expense_date', end.toISOString().split('T')[0]);
            if (branchFilter !== 'all') expQ = expQ.eq('branch_id', branchFilter);
            const { data: expData } = await expQ;

            const sumCat = (cat: string) => (expData || []).filter(e => e.category === cat).reduce((a, c) => a + Number(c.amount), 0);
            const currentExp = {
                salaries: sumCat('gaji'),
                utilities: sumCat('listrik'),
                marketing: sumCat('pemasaran'),
                others: sumCat('lainnya') + sumCat('operasional') + sumCat('sewa'),
            };
            setExpenses(currentExp);

            // PREVIOUS PERIOD (for trend comparison)
            {
                let prevTransQ = supabase.from('transactions').select('id, total_amount, created_at, branch_id');
                prevTransQ = filterTrans(prevTransQ, prev.start, prev.end);
                const { data: prevTransData } = await prevTransQ;
                const pRevenue = prevTransData?.reduce((a, t) => a + Number(t.total_amount), 0) || 0;
                setPrevRevenue(pRevenue);

                const pTransIds = prevTransData?.map(t => t.id) || [];
                let pCogs = 0;
                if (pTransIds.length > 0) {
                    const { data: pItemsData } = await supabase
                        .from('transaction_items')
                        .select('cost_at_sale, qty')
                        .in('transaction_id', pTransIds);
                    pCogs = pItemsData?.reduce((a, i) => a + (Number(i.cost_at_sale) * i.qty), 0) || 0;
                }

                let pExpQ = supabase.from('expenses').select('amount, category');
                pExpQ = pExpQ.gte('expense_date', prev.start.toISOString().split('T')[0]);
                pExpQ = pExpQ.lte('expense_date', prev.end.toISOString().split('T')[0]);
                if (branchFilter !== 'all') pExpQ = pExpQ.eq('branch_id', branchFilter);
                const { data: pExpData } = await pExpQ;
                const pTotalExp = (pExpData || []).reduce((a, c) => a + Number(c.amount), 0);
                const pGross = pRevenue - pCogs;
                const pComm = pRevenue * (rate / 100);
                const pNet = pGross - pComm - pTotalExp;
                setPrevGrossMargin(pRevenue > 0 ? (pGross / pRevenue) * 100 : 0);
                setPrevNetMargin(pRevenue > 0 ? (pNet / pRevenue) * 100 : 0);
            }

            // MONTHLY TREND (6 months relative to selected period)
            const trendData: { month: string; revenue: number; profit: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const ms = new Date(selectedYear, selectedMonth - i, 1);
                const me = new Date(selectedYear, selectedMonth - i + 1, 0, 23, 59, 59);
                const label = ms.toLocaleDateString('id-ID', { month: 'short', year: ms.getFullYear() !== selectedYear ? '2-digit' : undefined });

                let mq = supabase.from('transactions').select('total_amount').eq('status', 'Paid')
                    .gte('created_at', ms.toISOString()).lte('created_at', me.toISOString());
                if (branchFilter !== 'all') mq = mq.eq('branch_id', branchFilter);
                const { data: mData } = await mq;
                const mRev = mData?.reduce((a, t) => a + Number(t.total_amount), 0) || 0;

                let meq = supabase.from('expenses').select('amount')
                    .gte('expense_date', ms.toISOString().split('T')[0])
                    .lte('expense_date', me.toISOString().split('T')[0]);
                if (branchFilter !== 'all') meq = meq.eq('branch_id', branchFilter);
                const { data: meData } = await meq;
                const mExp = meData?.reduce((a, c) => a + Number(c.amount), 0) || 0;
                const mProfit = mRev - (mRev * (rate / 100)) - mExp;

                trendData.push({ month: label, revenue: mRev, profit: mProfit });
            }
            setMonthlyTrend(trendData);

        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, branchFilter]);



    const handleDownloadReport = () => {
        const branchLabel = branchFilter === 'all' ? 'Semua Cabang' : branches.find(b => b.id === branchFilter)?.name || '';
        const periodStr = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

        let csvContent = "\uFEFF"; // Add BOM for Excel UTF-8 support

        // Helper function for CSV formatting
        const escapeCSV = (str: string) => `"${String(str).replace(/"/g, '""')}"`;

        // Headers and metadata
        csvContent += "Laporan Keuangan Bengkel\n";
        csvContent += `Periode,${escapeCSV(periodStr)}\n`;
        csvContent += `Cabang,${escapeCSV(branchLabel)}\n`;
        csvContent += `Status,${escapeCSV(health.label)}\n`;
        csvContent += `Gross Margin,${grossMargin.toFixed(1)}%\n`;
        csvContent += `Net Margin,${netMargin.toFixed(1)}%\n\n`;

        // Laba Rugi Table
        csvContent += "Keterangan,Jumlah (Rp)\n";
        csvContent += `Total Penjualan (Revenue),${revenue}\n`;
        csvContent += `Harga Pokok Penjualan (COGS),-${cogs}\n`;
        csvContent += `Laba Kotor (Gross Profit),${grossProfit}\n`;
        csvContent += `Estimasi Komisi Affiliate (${commissionRate}%),-${commissions}\n`;
        csvContent += `Gaji Mekanik & Karyawan,-${expenses.salaries}\n`;
        csvContent += `Listrik Air & Biaya Rutin,-${expenses.utilities}\n`;
        csvContent += `Marketing & Iklan,-${expenses.marketing}\n`;
        csvContent += `Sewa & Lainnya,-${expenses.others}\n`;
        csvContent += `NET PROFIT (Laba Bersih),${netProfit}\n\n`;

        // Produk & Jasa Terlaris Table
        if (topProducts.length > 0 || topServices.length > 0) {
            csvContent += "Produk & Jasa Terlaris\n";
            csvContent += "Nama,Tipe,Qty,Revenue (Rp)\n";
            topProducts.forEach(p => {
                csvContent += `${escapeCSV(p.name)},Sparepart,${p.qty},${p.revenue}\n`;
            });
            topServices.forEach(s => {
                csvContent += `${escapeCSV(s.name)},Jasa,${s.qty},${s.revenue}\n`;
            });
            csvContent += "\n";
        }

        // Insights
        csvContent += "Insight Bisnis\n";
        insights.forEach(ins => {
            csvContent += `${escapeCSV(ins.text)}\n`;
        });

        csvContent += `\nDicetak pada,${escapeCSV(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}\n`;

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Keuangan_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    // Calculations
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + Number(b), 0);
    const commissions = revenue * (commissionRate / 100);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - commissions - totalExpenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const opexRatio = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;

    // Real trend calculations
    const calcTrend = (current: number, previous: number) => {
        if (previous === 0 && current === 0) return { pct: '0%', isUp: true };
        if (previous === 0) return { pct: '+100%', isUp: true };
        const pct = ((current - previous) / Math.abs(previous)) * 100;
        return { pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, isUp: pct >= 0 };
    };

    const revenueTrend = calcTrend(revenue, prevRevenue);
    const gmTrend = calcTrend(grossMargin, prevGrossMargin);
    const nmTrend = calcTrend(netMargin, prevNetMargin);
    const prevNetProfitCalc = prevRevenue > 0 ? prevRevenue * (prevNetMargin / 100) : 0;
    const npTrend = calcTrend(netProfit, prevNetProfitCalc);

    // Health status
    const getHealth = () => {
        if (loading) return { label: "Memuat...", color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200" };
        if (revenue === 0) return { label: "Data Kosong", color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200" };
        if (netMargin > 20) return { label: "Sangat Sehat", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" };
        if (netMargin > 10) return { label: "Sehat", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" };
        if (netMargin > 0) return { label: "Pas-pasan", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" };
        return { label: "Kritis", color: "text-red-500", bg: "bg-red-50", border: "border-red-200" };
    };
    const health = getHealth();

    // Smart insights
    const insights = useMemo(() => {
        const list: { icon: any; text: string; type: 'success' | 'warning' | 'danger' | 'info' }[] = [];
        if (revenue === 0) return [{ icon: Activity, text: 'Belum ada data transaksi untuk periode ini.', type: 'info' as const }];
        if (netMargin >= 20) list.push({ icon: Zap, text: 'Bengkel beroperasi sangat efisien! Pertahankan performa ini.', type: 'success' });
        if (netMargin > 0 && netMargin < 10) list.push({ icon: AlertTriangle, text: 'Marjin bersih di bawah 10%. Pertimbangkan naikkan harga jasa atau kurangi biaya operasional.', type: 'warning' });
        if (netMargin <= 0) list.push({ icon: AlertTriangle, text: 'Bengkel sedang RUGI. Segera evaluasi biaya operasional vs pendapatan.', type: 'danger' });
        if (revenue > 0 && cogs / revenue > 0.6) list.push({ icon: Target, text: `HPP terlalu tinggi (${((cogs / revenue) * 100).toFixed(0)}%). Negosiasi harga supplier atau cari alternatif.`, type: 'warning' });
        if (revenue > 0 && expenses.salaries / revenue > 0.3) list.push({ icon: Target, text: `Porsi gaji terlalu besar (${((expenses.salaries / revenue) * 100).toFixed(0)}% dari revenue). Evaluasi efisiensi SDM.`, type: 'warning' });
        if (prevRevenue > 0 && revenue < prevRevenue * 0.8) list.push({ icon: TrendingDown, text: `Revenue turun ${(((prevRevenue - revenue) / prevRevenue) * 100).toFixed(0)}% dari periode sebelumnya. Pertimbangkan promo/akuisisi pelanggan.`, type: 'danger' });
        if (prevRevenue > 0 && revenue > prevRevenue * 1.2) list.push({ icon: TrendingUp, text: `Revenue naik signifikan! Pastikan stok dan kapasitas mekanik cukup.`, type: 'success' });
        if (list.length === 0) list.push({ icon: Activity, text: 'Performa bisnis stabil. Pantau terus secara berkala.', type: 'info' });
        return list;
    }, [revenue, cogs, netMargin, prevRevenue, expenses.salaries]);

    // Chart rendering
    const maxTrendVal = Math.max(...monthlyTrend.map(m => m.revenue), 1);

    const periodLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin"]}>
                <div className="space-y-8 pb-10 print:space-y-4">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="shrink-0">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-bold text-slate-900">Laporan Owner</h2>
                                <div className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 hidden md:flex", health.bg, health.color, health.border)}>
                                    <div className={cn("w-2 h-2 rounded-full animate-pulse", health.color.replace('text', 'bg'))} />
                                    Status: {health.label}
                                </div>
                            </div>
                            <p className="text-slate-500 mt-1">Laporan finansial bengkel — Periode: <b>{periodLabel}</b></p>
                        </div>
                        <div className="flex items-center gap-2 print:hidden overflow-x-auto pb-1 max-w-full w-full lg:w-auto scrollbar-hide">
                            {/* Month Filter */}
                            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 shrink-0">
                                <Calendar size={16} className="text-slate-400 hidden sm:block" />
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(Number(e.target.value))}
                                    className="px-1 py-1 text-sm font-medium bg-transparent outline-none cursor-pointer"
                                >
                                    {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(Number(e.target.value))}
                                    className="px-1 py-1 text-sm font-medium bg-transparent outline-none cursor-pointer border-l border-slate-200 ml-1 pl-2"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Branch Filter */}
                            {branches.length > 0 && (
                                <select
                                    value={branchFilter}
                                    onChange={e => setBranchFilter(e.target.value)}
                                    className="px-3 py-2 border border-slate-100 shadow-sm rounded-xl text-sm font-medium bg-white hover:bg-slate-50 transition-all outline-none cursor-pointer shrink-0"
                                >
                                    <option value="all">Semua Cabang</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            )}

                            <button onClick={handleDownloadReport}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm shadow-md shrink-0">
                                <Download size={16} /> Download
                            </button>

                            <button onClick={fetchData} disabled={loading} title="Refresh Data"
                                className="flex items-center justify-center px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-xl font-medium hover:bg-slate-50 transition-all text-sm disabled:opacity-50 text-slate-600 shrink-0">
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Loading Skeleton */}
                    {loading ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
                                        <div className="h-3 w-20 bg-slate-200 rounded mb-4" />
                                        <div className="h-7 w-32 bg-slate-200 rounded" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 animate-pulse space-y-4">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-5 bg-slate-100 rounded w-full" />)}
                                </div>
                                <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded" />)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Top Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <ReportStat label="Penjualan Kotor" value={revenue} trend={revenueTrend.pct} isUp={revenueTrend.isUp} />
                                <ReportStat label="Gross Margin" value={`${grossMargin.toFixed(1)}%`} trend={gmTrend.pct} isUp={gmTrend.isUp} isPercentage />
                                <ReportStat label="Net Margin" value={`${netMargin.toFixed(1)}%`} trend={nmTrend.pct} isUp={nmTrend.isUp} isPercentage />
                                <ReportStat label="Net Profit (Laba)" value={netProfit} trend={npTrend.pct} isUp={npTrend.isUp} isMain />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* P&L Breakdown */}
                                <Card className="lg:col-span-2 p-0 overflow-hidden border-slate-200/60 shadow-sm">
                                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <BarChart3 size={20} className="text-primary" />
                                            Rincian Laba Rugi
                                        </h3>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            <PLRow label="Total Penjualan (Revenue)" value={revenue} />
                                            <PLRow label="Harga Pokok Penjualan (COGS)" value={-cogs} isNeg />
                                            <div className="h-px bg-slate-100 w-full" />
                                            <PLRow label="Laba Kotor (Gross Profit)" value={grossProfit} isBold />

                                            <div className="pt-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Beban Operasional & Lainnya</p>
                                                <div className="space-y-3 pl-4 border-l-2 border-slate-100">
                                                    <PLRow label={`Estimasi Komisi Affiliate (${commissionRate}%)`} value={-commissions} isNeg isSub />
                                                    <PLRow label="Gaji Mekanik & Karyawan" value={-expenses.salaries} isNeg isSub />
                                                    <PLRow label="Listrik, Air & Biaya Rutin" value={-expenses.utilities} isNeg isSub />
                                                    <PLRow label="Marketing & Iklan" value={-expenses.marketing} isNeg isSub />
                                                    <PLRow label="Sewa & Lainnya" value={-expenses.others} isNeg isSub />
                                                </div>
                                            </div>

                                            {/* Net Profit Box */}
                                            <div className="mt-6 p-6 bg-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
                                                <div className="flex justify-between items-center relative z-10">
                                                    <div>
                                                        <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Net Profit (Laba Bersih Akhir)</p>
                                                        <h4 className={cn("text-4xl font-black mt-2", netProfit < 0 ? "text-red-400" : "text-white")}>
                                                            Rp {netProfit.toLocaleString('id-ID')}
                                                        </h4>
                                                    </div>
                                                    <DollarSign size={48} className="text-white/10" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Side Panels */}
                                <div className="space-y-6">
                                    {/* Top Sparepart */}
                                    <Card className="p-0 border-slate-200/60 overflow-hidden">
                                        <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/50">
                                            <h3 className="font-bold text-sm flex items-center gap-2">
                                                <Package size={16} className="text-emerald-500" />
                                                3 Sparepart Terlaris
                                            </h3>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-3">
                                            {topProducts.length > 0 ? topProducts.map((p, idx) => (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                                        <p className="text-xs text-slate-500">{p.qty} terjual</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">Rp {p.revenue.toLocaleString('id-ID')}</span>
                                                </div>
                                            )) : <p className="text-xs text-slate-400 italic">Belum ada data barang terjual</p>}
                                        </CardContent>
                                    </Card>

                                    {/* Top Services */}
                                    <Card className="p-0 border-slate-200/60 overflow-hidden">
                                        <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/50">
                                            <h3 className="font-bold text-sm flex items-center gap-2">
                                                <Wrench size={16} className="text-primary" />
                                                3 Jasa Servis Terlaris
                                            </h3>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-3">
                                            {topServices.length > 0 ? topServices.map((s, idx) => (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                                                        <p className="text-xs text-slate-500">{s.qty} kali</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">Rp {s.revenue.toLocaleString('id-ID')}</span>
                                                </div>
                                            )) : <p className="text-xs text-slate-400 italic">Belum ada data jasa</p>}
                                        </CardContent>
                                    </Card>

                                    {/* Efficiency Ratios */}
                                    <Card className="border-slate-200/60 bg-slate-50/30">
                                        <CardHeader className="p-5 border-b border-slate-50">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <PieChart size={18} />
                                                Rasio Efisiensi
                                            </h3>
                                        </CardHeader>
                                        <CardContent className="p-5 space-y-5">
                                            <RatioBar label="Net Profit Margin" value={netMargin} target={20} suffix="%" />
                                            <RatioBar label="Gross Margin" value={grossMargin} target={40} suffix="%" />
                                            <RatioBar label="OPEX Ratio" value={opexRatio} target={30} suffix="%" invert />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Monthly Trend Chart + Insights */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 p-0 overflow-hidden border-slate-200/60">
                                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <TrendingUp size={20} className="text-emerald-500" />
                                            Tren Revenue 6 Bulan
                                        </h3>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="flex items-end gap-3 h-48">
                                            {monthlyTrend.map((m, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <p className="text-[10px] font-bold text-slate-500">{formatRp(m.revenue)}</p>
                                                    <div className="w-full relative rounded-t-lg overflow-hidden" style={{ height: `${Math.max((m.revenue / maxTrendVal) * 140, 4)}px` }}>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-primary to-primary-light rounded-t-lg" />
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-600">{m.month}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Smart Insights */}
                                <Card className="p-0 overflow-hidden border-slate-200/60">
                                    <CardHeader className="p-5 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-transparent">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Zap size={18} className="text-primary" />
                                            Insight Bisnis
                                        </h3>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-3">
                                        {insights.map((ins, i) => (
                                            <div key={i} className={cn("p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5", {
                                                'bg-emerald-50 border-emerald-100 text-emerald-700': ins.type === 'success',
                                                'bg-amber-50 border-amber-100 text-amber-700': ins.type === 'warning',
                                                'bg-red-50 border-red-100 text-red-700': ins.type === 'danger',
                                                'bg-blue-50 border-blue-100 text-blue-700': ins.type === 'info',
                                            })}>
                                                <ins.icon size={14} className="shrink-0 mt-0.5" />
                                                <span>{ins.text}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </div>


            </RoleGuard>
        </DashboardLayout>
    );
}

// --- Sub Components ---

function PLRow({ label, value, isNeg, isBold, isSub }: { label: string; value: number; isNeg?: boolean; isBold?: boolean; isSub?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center", isSub ? "text-sm" : "py-2")}>
            <span className={cn(isBold ? "font-bold text-slate-900" : isSub ? "text-slate-500" : "font-medium text-slate-600")}>{label}</span>
            <span className={cn("font-bold", isNeg ? "text-red-500" : isBold ? "font-black text-slate-900" : "text-slate-900")}>
                {isNeg && value !== 0 ? "- " : ""}Rp {Math.abs(value).toLocaleString('id-ID')}
            </span>
        </div>
    );
}

function ReportStat({ label, value, trend, isUp, isMain, isPercentage }: any) {
    return (
        <Card noGlass={isMain} className={cn("p-5 transition-all hover:scale-[1.02] border-slate-200/60 shadow-sm print:shadow-none",
            isMain ? "bg-primary text-white border-transparent shadow-xl shadow-primary/30" : "")}>
            <p className={cn("font-bold uppercase tracking-widest text-[10px]", isMain ? "text-white/70" : "text-slate-400")}>{label}</p>
            <div className="flex items-end justify-between mt-3">
                <h4 className={cn("text-xl font-black", isMain ? "text-white" : "text-slate-900")}>
                    {!isPercentage && "Rp "}
                    {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                </h4>
                <div className={cn("flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg",
                    isMain ? "text-white bg-white/20" : (isUp ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"))}>
                    {isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {trend}
                </div>
            </div>
        </Card>
    );
}

function RatioBar({ label, value, target, suffix, invert }: { label: string; value: number; target: number; suffix: string; invert?: boolean }) {
    const isGood = invert ? value <= target : value >= target;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">{label} (Target {target}{suffix})</span>
                <span className={cn("font-bold", isGood ? "text-emerald-500" : "text-amber-500")}>{value.toFixed(1)}{suffix}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full", isGood ? "bg-emerald-500" : "bg-amber-500")} />
            </div>
        </div>
    );
}
