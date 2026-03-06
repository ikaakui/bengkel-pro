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
    Users,
    Wallet,
    Loader2,
    Building2,
    BarChart3,
    ArrowRight,
    History,
    PieChart,
    Trophy,
    Users2,
    DollarSign,
    Target,
    Zap,
    Medal,
    Clock3,
    PackageSearch,
    UserPlus,
    RotateCcw,
    Pencil,
    Check,
    X,
} from "lucide-react";
import SalesChart from "./SalesChart";
import BranchComparisonChart from "./BranchComparisonChart";

type SalesPeriod = '7d' | '1m' | '1y' | '2y' | '3y' | '4y' | '5y';

const PERIOD_OPTIONS: { key: SalesPeriod; label: string }[] = [
    { key: '7d', label: '7 Hari' },
    { key: '1m', label: '1 Bulan' },
    { key: '1y', label: '1 Tahun' },
    { key: '2y', label: '2 Tahun' },
    { key: '3y', label: '3 Tahun' },
    { key: '4y', label: '4 Tahun' },
    { key: '5y', label: '5 Tahun' },
];

interface BranchStat {
    id: string;
    name: string;
    bookingCount: number;
    completedCount: number;
    revenue: number;
}

interface BranchTarget {
    branchId: string;
    branchName: string;
    target: number;
    revenue: number;
}

export default function OwnerDashboard() {
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalBookings, setTotalBookings] = useState(0);
    const [mitraCount, setMitraCount] = useState(0);
    const [pendingWD, setPendingWD] = useState(0);
    const [branchStats, setBranchStats] = useState<BranchStat[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [salesHistory, setSalesHistory] = useState<{ label: string; value: number }[]>([]);
    const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('7d');
    const [salesTab, setSalesTab] = useState<'all' | 'comparison' | 'branch' | 'mix'>('all');
    const [comparisonPeriod, setComparisonPeriod] = useState<SalesPeriod>('7d');
    const [branchComparison, setBranchComparison] = useState<{
        labels: string[];
        branches: { name: string; color: string; values: number[] }[];
    }>({ labels: [], branches: [] });
    const [mitraRevenueShare, setMitraRevenueShare] = useState({ mitra: 0, direct: 0 });
    const [bestServices, setBestServices] = useState<{ name: string; count: number; color: string }[]>([]);
    const [todayOps, setTodayOps] = useState({
        processing: { total: 0, direct: 0, mitra: 0, branches: [] as { name: string; count: number }[] },
        completed: { total: 0, direct: 0, mitra: 0, branches: [] as { name: string; count: number }[] }
    });
    const [mitraMVP, setMitraMVP] = useState<{ name: string; revenue: number; visits: number }[]>([]);
    const [retentionStats, setRetentionStats] = useState({ new: 0, repeat: 0 });
    const [avgServiceTime, setAvgServiceTime] = useState({ value: 0, label: '0m' });
    const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number }[]>([]);
    const [monthlyTarget, setMonthlyTarget] = useState(500000000);
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState(500000000);
    const [branchTargets, setBranchTargets] = useState<BranchTarget[]>([]);
    const [editingBranchTarget, setEditingBranchTarget] = useState<string | null>(null);
    const [tempBranchTarget, setTempBranchTarget] = useState(0);
    const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
    const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [currentMonthExpenses, setCurrentMonthExpenses] = useState(0);
    const { role } = useAuth();
    const supabase = createClient();

    const saveBranchTargets = async (targets: Record<string, { name: string; target: number }>) => {
        await supabase.from('app_settings').upsert({
            key: 'branch_targets',
            value: JSON.stringify(targets),
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    };

    const fetchDashboardData = async () => {
        setLoading(true);

        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfThisMonth = firstDayThisMonth.toISOString();

        // Optimize: Determine start date based on salesPeriod to avoid fetching all-time data
        let historyStartDate = new Date();
        if (salesPeriod === '7d') historyStartDate.setDate(now.getDate() - 7);
        else if (salesPeriod === '1m') historyStartDate.setMonth(now.getMonth() - 1);
        else if (salesPeriod === '1y') historyStartDate.setFullYear(now.getFullYear() - 1);
        else {
            const years = parseInt(salesPeriod.replace('y', ''));
            historyStartDate.setFullYear(now.getFullYear() - years);
        }
        const historyStartDateStr = historyStartDate.toISOString();

        // Fetch all branches (small table, fine to fetch all)
        const { data: branches } = await supabase.from("branches").select("id, name").order("name");

        // Optimize: Fetch only necessary columns and filter by date where appropriate
        // For total counts we still need some data, but we can limit what we fetch
        const { data: recentBookingsData } = await supabase
            .from("bookings")
            .select("id, status, branch_id, customer_phone, created_at, car_model, customer_name, service_date, mitra_id")
            .gte('created_at', historyStartDateStr);

        const allBookings = recentBookingsData || [];
        const completedBookings = allBookings.filter(b => b.status === "completed") || [];

        // For total bookings count (all time), use head: true
        const { count: totalBookingsCount } = await supabase
            .from("bookings")
            .select("id", { count: 'exact', head: true });
        setTotalBookings(totalBookingsCount || 0);

        // Optimize: Fetch transactions with date filter
        const { data: transactionsData } = await supabase
            .from("transactions")
            .select("id, total_amount, status, created_at, branch_id, mitra_id")
            .gte('created_at', historyStartDateStr);

        const allTransactions = transactionsData || [];
        const paidTransactions = allTransactions.filter(t => t.status === 'Paid') || [];

        // Fetch all-time total revenue efficiently (ideally should be a summary table, but for now just sum what we have if needed)
        // If we really need all-time, we should use an RPC or just sum the filtered ones if that's what's meant.
        // Usually dashboards show "Total Revenue" as either all-time or this year.
        const { data: totalRevData } = await supabase.from("transactions").select("total_amount").eq('status', 'Paid');
        const realRevenue = totalRevData?.reduce((acc, t) => acc + Number(t.total_amount), 0) || 0;
        setTotalRevenue(realRevenue);

        // Load branch targets from app_settings
        const { data: targetSetting } = await supabase.from('app_settings').select('value').eq('key', 'branch_targets').single();
        let targetMap: Record<string, { name: string; target: number }> = {};
        if (targetSetting?.value) {
            try { targetMap = JSON.parse(targetSetting.value); } catch (e) { }
        }

        // Ensure all branches have targets
        let needSave = false;
        for (const br of branches || []) {
            if (!targetMap[br.id]) {
                targetMap[br.id] = { name: br.name, target: 250000000 };
                needSave = true;
            }
        }
        if (needSave) await saveBranchTargets(targetMap);

        const totalTargetSum = Object.values(targetMap).reduce((acc, t) => acc + t.target, 0);
        setMonthlyTarget(totalTargetSum);

        const today = new Date();
        const AVG_PRICE = realRevenue > 0 ? realRevenue / (paidTransactions.length || 1) : 500000;

        const salesData = generateSalesData(salesPeriod, paidTransactions, AVG_PRICE, today);
        setSalesHistory(salesData);

        // Fetch Mitra Count efficiently
        const { count: mCount } = await supabase.from("profiles").select("id", { count: 'exact', head: true }).eq("role", "mitra");
        setMitraCount(mCount || 0);

        // Fetch Pending Withdrawals efficiently
        const { count: pWD } = await supabase.from("withdrawals").select("id", { count: 'exact', head: true }).eq("status", "pending");
        setPendingWD(pWD || 0);

        // Fetch Expenses (Current Month only)
        const { data: currentMonthExpData } = await supabase
            .from("expenses")
            .select("amount")
            .gte('expense_date', startOfThisMonth);

        const currentMonthExp = currentMonthExpData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

        setTotalExpenses(currentMonthExp);
        setCurrentMonthExpenses(currentMonthExp);

        // Build per-branch stats using transactions
        let bStats: BranchStat[] = [];
        if (branches && branches.length > 0) {
            bStats = branches.map(br => {
                const brBookings = allBookings?.filter(b => b.branch_id === br.id) || [];
                const brCompleted = brBookings.filter(b => b.status === "completed");
                const brTransactions = paidTransactions.filter(t => t.branch_id === br.id);
                const brRevenue = brTransactions.reduce((acc, t) => acc + Number(t.total_amount), 0);

                const mockTrend = Array.from({ length: 5 }).map((_, j) => ({
                    label: "",
                    value: Math.floor(Math.random() * 5000000) + 1000000
                }));

                return {
                    id: br.id,
                    name: br.name,
                    bookingCount: brBookings.length,
                    completedCount: brCompleted.length,
                    revenue: brRevenue,
                    trend: mockTrend
                };
            });
            setBranchStats(bStats as any);
        }

        // Build branch targets list
        const brTargetsList: BranchTarget[] = (branches || []).map(br => {
            const brTransactions = paidTransactions.filter(t => t.branch_id === br.id && new Date(t.created_at) >= firstDayThisMonth);
            const brMonthRevenue = brTransactions.reduce((acc, t) => acc + Number(t.total_amount), 0);
            return {
                branchId: br.id,
                branchName: br.name,
                target: targetMap[br.id]?.target || 250000000,
                revenue: brMonthRevenue
            };
        });
        setBranchTargets(brTargetsList);

        // Build Depok vs BSD comparison data based on comparisonPeriod
        // Use bStats (locally computed) instead of branchStats (stale React state)
        const currentBranchStats = bStats.length > 0 ? bStats : branchStats;
        const depokBranch = currentBranchStats.find(b => b.name.toLowerCase().includes('depok'));
        const bsdBranch = currentBranchStats.find(b => b.name.toLowerCase().includes('bsd'));

        const compData = generateComparisonData(comparisonPeriod, today, paidTransactions, AVG_PRICE, depokBranch, bsdBranch);
        setBranchComparison(compData);

        // Calculate Mitra vs Direct using transactions
        const mitraTx = paidTransactions.filter(t => t.mitra_id !== null);
        const directTx = paidTransactions.filter(t => !t.mitra_id);
        setMitraRevenueShare({
            mitra: mitraTx.reduce((acc, t) => acc + Number(t.total_amount), 0),
            direct: directTx.reduce((acc, t) => acc + Number(t.total_amount), 0)
        });

        // Calculate Monthly Trends using transactions
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

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

        const thisMonthExp = currentMonthExpData?.filter(e => new Date(e.created_at) >= firstDayThisMonth)
            ?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        setCurrentMonthExpenses(thisMonthExp);


        // Mitra MVP Leaderboard calculation using transactions
        const mitraMap = new Map<string, { revenue: number, visits: number }>();
        const { data: mitraProfiles } = await supabase.from("profiles").select("id, full_name").eq("role", "mitra");

        paidTransactions.forEach(t => {
            if (t.mitra_id) {
                const existing = mitraMap.get(t.mitra_id) || { revenue: 0, visits: 0 };
                mitraMap.set(t.mitra_id, {
                    revenue: existing.revenue + Number(t.total_amount),
                    visits: existing.visits + 1
                });
            }
        });

        const mvpList = Array.from(mitraMap.entries())
            .map(([id, stats]) => ({
                name: mitraProfiles?.find(p => p.id === id)?.full_name || 'Mitra',
                ...stats
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        setMitraMVP(mvpList);

        // Customer Retention calculation
        const phoneCounts = new Map<string, number>();
        allBookings?.forEach(b => {
            phoneCounts.set(b.customer_phone, (phoneCounts.get(b.customer_phone) || 0) + 1);
        });
        const totalCustomers = phoneCounts.size || 1;
        const repeatCustomers = Array.from(phoneCounts.values()).filter(count => count > 1).length;
        setRetentionStats({
            new: totalCustomers - repeatCustomers,
            repeat: repeatCustomers
        });

        // Service Time calculation
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
            label: avgMinutes > 60 ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m` : `${avgMinutes}m`
        });

        // Low Stock Items
        const { data: lowStock } = await supabase
            .from("catalog")
            .select("name, stock")
            .eq("category", "Spare Part")
            .lt("stock", 5)
            .limit(5);
        if (lowStock) setLowStockItems(lowStock);

        // Mock Best Selling Services (since db doesn't have items yet)
        setBestServices([
            { name: 'Ganti Oli Shell Helix', count: 45, color: '#2563eb' },
            { name: 'Service Rutin 10rb KM', count: 32, color: '#059669' },
            { name: 'Tune Up & Carbon Clean', count: 28, color: '#7c3aed' },
            { name: 'Spooring & Balancing', count: 22, color: '#f59e0b' },
            { name: 'Detailing Interior', count: 15, color: '#ef4444' },
        ]);

        // Calculate Today Operations (Live Status)
        const isToday = (dateStr: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            const todayStr = new Date().toISOString().split('T')[0];
            return d.toISOString().split('T')[0] === todayStr;
        };

        const todayBookings = (allBookings || []).filter(b => isToday(b.created_at || b.service_date));
        const processingToday = todayBookings.filter(b => b.status === "processing");
        const completedToday = todayBookings.filter(b => b.status === "completed");

        const getBranchBreakdown = (list: any[]) => {
            const map = new Map<string, number>();
            list.forEach(b => {
                const bName = branches?.find(br => br.id === b.branch_id)?.name || 'Unknown';
                map.set(bName, (map.get(bName) || 0) + 1);
            });
            return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
        };

        setTodayOps({
            processing: {
                total: processingToday.length,
                direct: processingToday.filter(b => !b.mitra_id).length,
                mitra: processingToday.filter(b => b.mitra_id).length,
                branches: getBranchBreakdown(processingToday)
            },
            completed: {
                total: completedToday.length,
                direct: completedToday.filter(b => !b.mitra_id).length,
                mitra: completedToday.filter(b => b.mitra_id).length,
                branches: getBranchBreakdown(completedToday)
            }
        });

        // Recent Bookings with branch mapping
        const { data: recent } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(5);
        if (recent) {
            const enrichedRecent = recent.map(r => ({
                ...r,
                branch_name: branches?.find(b => b.id === r.branch_id)?.name || 'Unknown'
            }));
            setRecentBookings(enrichedRecent);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchDashboardData();
    }, [salesPeriod, comparisonPeriod]);

    // Generate comparison data for Depok vs BSD based on selected period
    const generateComparisonData = (
        period: SalesPeriod,
        today: Date,
        allBookings: any[],
        avgPrice: number,
        depokBranch: BranchStat | undefined,
        bsdBranch: BranchStat | undefined
    ) => {
        let points: number;
        let getDate: (i: number) => Date;
        let getLabel: (d: Date) => string;
        let depokBase: number;
        let bsdBase: number;

        switch (period) {
            case '7d':
                points = 7;
                getDate = (i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                depokBase = 4500000;
                bsdBase = 4000000;
                break;
            case '1m':
                points = 30;
                getDate = (i) => { const d = new Date(today); d.setDate(today.getDate() - (29 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { day: 'numeric' });
                depokBase = 4200000;
                bsdBase = 3800000;
                break;
            case '1y':
                points = 12;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (11 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short' });
                depokBase = 42000000;
                bsdBase = 38000000;
                break;
            case '2y':
                points = 2;
                getDate = (i) => { const d = new Date(today); d.setFullYear(today.getFullYear() - (1 - i)); return d; };
                getLabel = (d) => d.getFullYear().toString();
                depokBase = 420000000;
                bsdBase = 380000000;
                break;
            case '3y':
                points = 3;
                getDate = (i) => { const d = new Date(today); d.setFullYear(today.getFullYear() - (2 - i)); return d; };
                getLabel = (d) => d.getFullYear().toString();
                depokBase = 400000000;
                bsdBase = 360000000;
                break;
            case '4y':
                points = 4;
                getDate = (i) => { const d = new Date(today); d.setFullYear(today.getFullYear() - (3 - i)); return d; };
                getLabel = (d) => d.getFullYear().toString();
                depokBase = 380000000;
                bsdBase = 340000000;
                break;
            case '5y':
                points = 5;
                getDate = (i) => { const d = new Date(today); d.setFullYear(today.getFullYear() - (4 - i)); return d; };
                getLabel = (d) => d.getFullYear().toString();
                depokBase = 450000000;
                bsdBase = 400000000;
                break;
        }

        // Adjust growth factor based on aggregation level
        const isYearly = ['2y', '3y', '4y', '5y'].includes(period);
        const growthFactor = isYearly ? 1.15 : (1 + (0.012 * (points > 12 ? 1 : 0.5)));
        const labels = Array.from({ length: points }).map((_, i) => getLabel(getDate(i)));

        const generateBranchValues = (base: number, branch: BranchStat | undefined, seed: number) => {
            return Array.from({ length: points }).map((_, i) => {
                const date = getDate(i);
                const dateStr = date.toISOString().split('T')[0];

                // Try real data
                if (branch) {
                    if (period === '7d' || period === '1m') {
                        // Daily aggregation
                        const realSales = allBookings.filter(b =>
                            b.branch_id === branch.id && b.status === 'completed' &&
                            new Date(b.created_at || b.service_date).toISOString().split('T')[0] === dateStr
                        ).length * avgPrice;
                        if (realSales > 0) return realSales;
                    } else if (isYearly) {
                        // Yearly aggregation
                        const year = date.getFullYear();
                        const realSales = allBookings.filter(b => {
                            const bDate = new Date(b.created_at || b.service_date);
                            return b.branch_id === branch.id && b.status === 'completed' &&
                                bDate.getFullYear() === year;
                        }).length * avgPrice;
                        if (realSales > 0) return realSales;
                    }
                }

                // Mock data with realistic growth + variation
                const seasonalWave = Math.sin((i / points) * Math.PI * 2 + seed) * (isYearly ? 0.05 : 0.15);
                const randomJitter = Math.sin(i * 7.3 + seed * 13.7) * (isYearly ? 0.05 : 0.2);
                const growthMult = Math.pow(growthFactor, i);
                return Math.round(base * growthMult * (1 + seasonalWave + randomJitter));
            });
        };

        return {
            labels,
            branches: [
                { name: 'Depok', color: '#2563eb', values: generateBranchValues(depokBase, depokBranch, 1) },
                { name: 'BSD', color: '#059669', values: generateBranchValues(bsdBase, bsdBranch, 2) },
            ],
        };
    };

    // Generate sales data based on period
    const generateSalesData = (
        period: SalesPeriod,
        completedBookings: any[],
        avgPrice: number,
        today: Date
    ): { label: string; value: number }[] => {
        let points: number;
        let getDate: (i: number) => Date;
        let getLabel: (d: Date) => string;
        let baseMock: number;

        switch (period) {
            case '7d':
                points = 7;
                getDate = (i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { weekday: 'short' });
                baseMock = 5000000;
                break;
            case '1m':
                points = 30;
                getDate = (i) => { const d = new Date(today); d.setDate(today.getDate() - (29 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { day: 'numeric' });
                baseMock = 4500000;
                break;
            case '1y':
                points = 12;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (11 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short' });
                baseMock = 45000000;
                break;
            case '2y':
                points = 24;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (23 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                baseMock = 42000000;
                break;
            case '3y':
                points = 36;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (35 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                baseMock = 40000000;
                break;
            case '4y':
                points = 48;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (47 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                baseMock = 38000000;
                break;
            case '5y':
                points = 60;
                getDate = (i) => { const d = new Date(today); d.setMonth(today.getMonth() - (59 - i)); return d; };
                getLabel = (d) => d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                baseMock = 35000000;
                break;
        }

        // Generate with growth trend upwards
        const growthFactor = 1 + (0.015 * (points > 12 ? 1 : 0.5)); // monthly growth
        return Array.from({ length: points }).map((_, i) => {
            const date = getDate(i);
            // Try to use real transaction data
            const dateStr = date.toISOString().split('T')[0];
            let realSales = 0;
            if (period === '7d' || period === '1m') {
                realSales = completedBookings.filter(b => {
                    const bDate = new Date(b.created_at).toISOString().split('T')[0];
                    return bDate === dateStr;
                }).reduce((acc, t) => acc + Number(t.total_amount || avgPrice), 0);
            }

            // Mock data with realistic growth curve + seasonal variation
            const seasonalWave = Math.sin((i / points) * Math.PI * 2) * 0.15;
            const randomJitter = (Math.random() - 0.5) * 0.25;
            const growthMult = Math.pow(growthFactor, i);
            const mockValue = Math.round(baseMock * growthMult * (1 + seasonalWave + randomJitter));

            return {
                label: getLabel(date),
                value: realSales > 0 ? realSales : mockValue
            };
        });
    };

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="text-slate-500 mt-4 font-medium italic">Menghitung statistik bengkel...</p>
            </div>
        );
    }

    // Simple bar for branch chart
    const maxRevenue = Math.max(...branchStats.map(b => b.revenue), 1);

    return (
        <div className="space-y-10">
            {/* Welcome Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard Owner</h2>
                    <p className="text-slate-500 mt-1 font-medium">Monitoring seluruh cabang secara real-time.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
                {/* Total Mitra Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-8 group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all overflow-hidden relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Mitra</p>
                    </div>
                    <div className="mt-8 relative z-10">
                        <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">
                            {mitraCount}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-bold">Affiliate aktif</p>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors" />
                </Card>

                {/* Expenses Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-8 group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all overflow-hidden relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
                            <Wallet size={24} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expenses</p>
                    </div>
                    <div className="mt-8 relative z-10">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic truncate">
                            Rp {currentMonthExpenses.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Bulan Ini</p>
                    </div>
                    {/* Decoration */}
                    <TrendingDown size={140} className="absolute -right-10 -bottom-10 text-rose-50/50 transform rotate-12" />
                </Card>

                {/* Net Profit Card */}
                <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-8 text-white group relative overflow-hidden ring-4 ring-indigo-50/50">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3.5 bg-white/40 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Growth</p>
                            <span className="text-[10px] font-black text-emerald-300">
                                {lastMonthRevenue > 0
                                    ? `+${(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)}%`
                                    : "0%"}
                            </span>
                        </div>
                    </div>
                    <div className="mt-6 relative z-10">
                        <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em]">Net Profit (MoM)</p>
                        <p className="text-2xl font-black text-white mt-2 tracking-tight">Rp {(currentMonthRevenue - currentMonthExpenses).toLocaleString('id-ID')}</p>
                        <p className="text-xs text-indigo-200 mt-1">Laba bersih bulan ini</p>
                    </div>
                    <DollarSign size={160} className="absolute -right-12 -bottom-12 text-white/5 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                </Card>
            </div>

            {/* Per-Branch Target Monitor (Consolidated) */}
            {branchTargets.length > 0 && (
                <div className="mt-10">
                    <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-8 overflow-hidden">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-2">
                                <Target size={20} className="text-indigo-600" />
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Target Per Cabang</span>
                                <span className="text-[10px] font-bold text-slate-300 ml-2">
                                    ({new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})
                                </span>
                            </div>
                            {/* Growth Index inline */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bulan Lalu</span>
                                    <span className="text-xs font-black text-slate-700">Rp {lastMonthRevenue.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                    {currentMonthRevenue >= lastMonthRevenue ? (
                                        <TrendingUp size={14} className="text-emerald-500" />
                                    ) : (
                                        <TrendingDown size={14} className="text-rose-500" />
                                    )}
                                    <span className={cn(
                                        "text-xs font-black border-none",
                                        currentMonthRevenue >= lastMonthRevenue ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {lastMonthRevenue > 0
                                            ? `${(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)}%`
                                            : "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Total Combined Summary Content */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-8 text-white mb-10 shadow-xl shadow-indigo-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Total Target Gabungan</p>
                                    <h3 className="text-4xl font-black tracking-tighter mt-1 flex items-baseline gap-2">
                                        Rp {currentMonthRevenue.toLocaleString('id-ID')}
                                        <span className="text-lg font-bold text-indigo-200 ml-1">/ Rp {monthlyTarget.toLocaleString('id-ID')}</span>
                                    </h3>
                                    {(() => {
                                        const overallPct = Math.round((currentMonthRevenue / (monthlyTarget || 1)) * 100);
                                        const daysPassed = new Date().getDate();
                                        let insight = "Bulan baru, semangat baru! Mari mulai kumpulkan transaksi. 🚀";
                                        if (overallPct >= 100) insight = "Luar biasa! Target bulan ini sudah tercapai. 🏆";
                                        else if (overallPct >= 70) insight = "Performa sangat baik, selangkah lagi menuju target! 📈";
                                        else if (daysPassed > 15 && overallPct < 40) insight = "Waspada! Performa di bawah rata-rata untuk pertengahan bulan. ⚠️";
                                        else if (daysPassed > 5 && overallPct > 0) insight = "Terus konsisten, pertahankan ritme kerja cabang. 🏁";

                                        return <p className="text-[11px] text-indigo-100 font-black mt-2 tracking-wide opacity-90 flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/5">💡 {insight}</p>;
                                    })()}
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="relative p-2">
                                        <p className="text-5xl font-black tracking-tighter italic">
                                            {Math.round((currentMonthRevenue / (monthlyTarget || 1)) * 100)}%
                                        </p>
                                        <div className="absolute -top-1 -right-4 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow" />
                                    </div>
                                    <p className="text-[10px] text-indigo-100 font-extrabold uppercase tracking-widest mt-1">Global Achievement</p>
                                </div>
                            </div>
                            <div className="mt-8 h-3.5 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((currentMonthRevenue / (monthlyTarget || 1)) * 100, 100)}%` }}
                                    className={cn(
                                        "h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(255,255,255,0.2)]",
                                        currentMonthRevenue >= monthlyTarget ? "bg-emerald-400" : "bg-gradient-to-r from-blue-300 to-indigo-200"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Per Branch Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {branchTargets.map((bt, i) => {
                                const pct = Math.round((bt.revenue / (bt.target || 1)) * 100);
                                const daysPassed = new Date().getDate();

                                // Logic for Badge Status
                                let status: { label: string; bg: string } | null = null;
                                if (pct >= 100) status = { label: '🏆 JUARA', bg: 'bg-emerald-500 text-white' };
                                else if (pct >= 70) status = { label: '🟢 AMAN', bg: 'bg-blue-500 text-white' };
                                else if (pct < 40 && daysPassed > 5) status = { label: '⚠️ BAHAYA', bg: 'bg-rose-500 text-white' };

                                const colors = ['blue', 'emerald', 'purple', 'amber'];
                                const c = colors[i % colors.length];
                                return (
                                    <div key={bt.branchId} className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden">
                                        {/* Status Badge Positioned at Top Right */}
                                        {status && (
                                            <div className={cn(
                                                "absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black shadow-lg transform group-hover:scale-110 transition-transform",
                                                status.bg
                                            )}>
                                                {status.label}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mb-6 relative z-10">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white",
                                                c === 'blue' ? 'bg-blue-600' : c === 'emerald' ? 'bg-emerald-600' : c === 'purple' ? 'bg-purple-600' : 'bg-amber-600'
                                            )}>
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{bt.branchName}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{pct}% dari target</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-6 relative z-10">
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-2xl font-black text-slate-900">
                                                    Rp {bt.revenue.toLocaleString('id-ID')}
                                                </p>
                                                {editingBranchTarget !== bt.branchId && (
                                                    <button
                                                        onClick={() => { setEditingBranchTarget(bt.branchId); setTempBranchTarget(bt.target); }}
                                                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                                                        title="Ubah Target"
                                                    >
                                                        <Pencil size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>

                                            {editingBranchTarget === bt.branchId ? (
                                                <div className="flex items-center gap-2 bg-white ring-2 ring-blue-100 rounded-2xl p-2 px-4 shadow-xl">
                                                    <span className="text-xs font-black text-blue-600">Rp</span>
                                                    <input
                                                        type="number"
                                                        autoFocus
                                                        value={tempBranchTarget}
                                                        onChange={(e) => setTempBranchTarget(Number(e.target.value))}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'branch_targets').single();
                                                                const map = setting?.value ? JSON.parse(setting.value) : {};
                                                                map[bt.branchId] = { name: bt.branchName, target: tempBranchTarget };
                                                                await saveBranchTargets(map);
                                                                setEditingBranchTarget(null);
                                                                fetchDashboardData();
                                                            } else if (e.key === 'Escape') setEditingBranchTarget(null);
                                                        }}
                                                        className="bg-transparent border-none focus:ring-0 p-0 text-sm font-black text-slate-900 w-full"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={async () => {
                                                                const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'branch_targets').single();
                                                                const map = setting?.value ? JSON.parse(setting.value) : {};
                                                                map[bt.branchId] = { name: bt.branchName, target: tempBranchTarget };
                                                                await saveBranchTargets(map);
                                                                setEditingBranchTarget(null);
                                                                fetchDashboardData();
                                                            }}
                                                            className="p-1 px-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm"
                                                        >
                                                            <Check size={12} strokeWidth={3} />
                                                        </button>
                                                        <button onClick={() => setEditingBranchTarget(null)} className="p-1 px-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-3">
                                                    Target: Rp {bt.target.toLocaleString('id-ID')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="h-4 bg-white rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner relative z-10">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                                transition={{ duration: 1.2, ease: "easeOut" }}
                                                className={cn(
                                                    "h-full rounded-full transition-all group-hover:opacity-90",
                                                    pct >= 100 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                                                        pct >= 70 ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' :
                                                            pct < 40 && daysPassed > 5 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-slate-200'
                                                )}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* Consolidated Sales Analysis Card */}
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-0 overflow-hidden bg-white mt-12 ring-1 ring-slate-100">
                <CardHeader className="p-10 border-b border-slate-50 flex flex-col gap-6 bg-gradient-to-br from-white via-white to-blue-50/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
                                <BarChart3 size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Analisis Sales</h3>
                                <p className="text-sm text-slate-500 font-medium leading-none mt-1">
                                    {salesTab === 'all' ? 'Tren pendapatan konsolidasi' : salesTab === 'comparison' ? 'Perbandingan antar cabang' : 'Detail performa per cabang'} — {PERIOD_OPTIONS.find(p => p.key === salesPeriod)?.label}.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 rounded-2xl ring-1 ring-slate-200/50">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setSalesPeriod(opt.key); setComparisonPeriod(opt.key); }}
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
                    {/* Tab Bar */}
                    <div className="flex gap-1 p-1 bg-slate-100/60 rounded-2xl w-fit">
                        {[
                            { key: 'all' as const, label: 'All Cabang', icon: <History size={14} /> },
                            { key: 'comparison' as const, label: 'Perbandingan', icon: <Building2 size={14} /> },
                            { key: 'branch' as const, label: 'Per Cabang', icon: <BarChart3 size={14} /> },
                            { key: 'mix' as const, label: 'Revenue Mix', icon: <PieChart size={14} /> },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setSalesTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                    salesTab === tab.key
                                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-10">
                    {/* Tab: All Cabang */}
                    {salesTab === 'all' && (
                        <div className="h-[350px] w-full mt-2">
                            <SalesChart data={salesHistory} height={350} color="#2563eb" />
                        </div>
                    )}

                    {/* Tab: Perbandingan */}
                    {salesTab === 'comparison' && branchComparison.branches.length > 0 && (
                        <BranchComparisonChart
                            branches={branchComparison.branches}
                            labels={branchComparison.labels}
                            height={380}
                        />
                    )}

                    {/* Tab: Per Cabang */}
                    {salesTab === 'branch' && branchStats.length > 0 && (
                        <div className="divide-y divide-slate-50 -mx-4">
                            {branchStats.map((br: any, i: number) => (
                                <div key={br.id} className="p-6 hover:bg-slate-50 transition-all group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                                i === 0 ? "bg-blue-600 text-white shadow-blue-200" :
                                                    i === 1 ? "bg-emerald-600 text-white shadow-emerald-200" :
                                                        "bg-purple-600 text-white shadow-purple-200"
                                            )}>
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900">{br.name}</h4>
                                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    <span>{br.bookingCount} Booking</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-600">Rp {br.revenue.toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-40 h-12 hidden sm:block">
                                            <SalesChart
                                                data={br.trend}
                                                height={48}
                                                color={i === 0 ? "#2563eb" : i === 1 ? "#059669" : "#7c3aed"}
                                                showGrid={false}
                                                showLabels={false}
                                            />
                                        </div>

                                        <div className="flex flex-col items-end gap-2 w-48">
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max((br.revenue / maxRevenue) * 100, 5)}%` }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        i === 0 ? "bg-blue-600" : i === 1 ? "bg-emerald-600" : "bg-purple-600"
                                                    )}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                Performance: {Math.round((br.revenue / maxRevenue) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab: Revenue Mix */}
                    {salesTab === 'mix' && (
                        <div className="flex flex-col md:flex-row items-center gap-14 mt-4">
                            <div className="relative flex justify-center items-center flex-shrink-0">
                                <svg className="w-56 h-56 transform -rotate-90">
                                    {(() => {
                                        let total = branchStats.reduce((acc, b) => acc + b.revenue, 0) || 1;
                                        let offset = 0;
                                        return branchStats.map((br, i) => {
                                            const percentage = (br.revenue / total) * 100;
                                            const currentOffset = offset;
                                            offset += percentage;
                                            return (
                                                <circle
                                                    key={br.id}
                                                    cx="28" cy="28" r="18"
                                                    fill="transparent"
                                                    stroke={['#2563eb', '#059669', '#7c3aed', '#f59e0b'][i % 4]}
                                                    strokeWidth="6"
                                                    strokeDasharray={`${percentage} 100`}
                                                    strokeDashoffset={-currentOffset}
                                                    pathLength="100"
                                                    className="transition-all duration-1000 ease-out"
                                                    viewBox="0 0 56 56"
                                                />
                                            );
                                        });
                                    })()}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                                    <span className="text-2xl font-black text-slate-900 leading-none">
                                        {(totalRevenue / 1000000).toFixed(0)}jt
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 w-full flex flex-col gap-10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
                                    {branchStats.map((br, i) => (
                                        <div key={br.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#2563eb', '#059669', '#7c3aed', '#f59e0b'][i % 4] }} />
                                                <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{br.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-900 leading-none">
                                                    Rp {br.revenue.toLocaleString('id-ID')}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                    {Math.round((br.revenue / (totalRevenue || 1)) * 100)}% Share
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-6 border-t-2 border-slate-50 border-dashed">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users2 size={16} className="text-blue-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Sources Share</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/30">
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5 px-0.5">Via Mitra</p>
                                            <p className="text-2xl font-black text-blue-900 tabular-nums">
                                                {Math.round((mitraRevenueShare.mitra / (totalRevenue || 1)) * 100)}%
                                            </p>
                                        </div>
                                        <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/30">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1.5 px-0.5">Direct Orders</p>
                                            <p className="text-2xl font-black text-emerald-900 tabular-nums">
                                                {Math.round((mitraRevenueShare.direct / (totalRevenue || 1)) * 100)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Live Operations Tracker */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                            <div className="w-3 h-3 bg-rose-500 rounded-full absolute inset-0" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Live Bengkel Status</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border px-3 py-1.5 rounded-xl border-slate-100 bg-white">
                            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <Link href="/bookings">
                            <button className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                Semua Booking
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Processing Card */}
                    <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-10 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-[11px] font-black text-blue-100 uppercase tracking-[0.25em]">Sedang Dikerjakan</span>
                                <Zap size={24} className="text-blue-200 animate-pulse" />
                            </div>
                            <div className="flex items-baseline gap-3">
                                <h4 className="text-7xl font-black tracking-tighter italic">
                                    {todayOps.processing.total}
                                </h4>
                                <span className="text-xl font-black text-blue-200 uppercase tracking-widest">Mobil</span>
                            </div>
                            <div className="mt-4 mb-10 flex flex-wrap gap-2">
                                {todayOps.processing.branches.length > 0 ? todayOps.processing.branches.map((br) => (
                                    <span key={br.name} className="flex items-center gap-2 text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                                        {br.count} {br.name}
                                    </span>
                                )) : (
                                    <span className="text-[11px] font-black text-blue-200 italic opacity-60">No active processings...</span>
                                )}
                            </div>
                            <div className="flex items-center gap-12 pt-6 border-t border-white/10">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest opacity-70">Direct</p>
                                    <p className="text-2xl font-black">{todayOps.processing.direct}</p>
                                </div>
                                <div className="w-px h-10 bg-white/10" />
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest opacity-70">Via Mitra</p>
                                    <p className="text-2xl font-black">{todayOps.processing.mitra}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Completed Card */}
                    <Card className="border-none shadow-2xl bg-white p-10 border-l-8 border-emerald-500 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Selesai & Bayar</span>
                                <Trophy size={24} className="text-emerald-500" />
                            </div>
                            <div className="flex items-baseline gap-3">
                                <h4 className="text-7xl font-black tracking-tighter text-slate-900 tabular-nums">
                                    {todayOps.completed.total}
                                </h4>
                                <span className="text-xl font-black text-slate-400 uppercase tracking-widest">Mobil</span>
                            </div>
                            <div className="mt-4 mb-10 flex flex-wrap gap-2">
                                {todayOps.completed.branches.map((br) => (
                                    <span key={br.name} className="flex items-center gap-2 text-[10px] font-black bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {br.count} {br.name}
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-center gap-12 pt-6 border-t border-slate-50">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direct</p>
                                    <p className="text-2xl font-black text-slate-800">{todayOps.completed.direct}</p>
                                </div>
                                <div className="w-px h-10 bg-slate-50" />
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Via Mitra</p>
                                    <p className="text-2xl font-black text-slate-800">{todayOps.completed.mitra}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Recent Bookings List */}
                <Card className="border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                    <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Daftar Aktivitas Terkini</h4>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {recentBookings.map((bk) => (
                                <div key={bk.id} className="flex items-center justify-between p-6 px-10 hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-6 min-w-0">
                                        <div className="w-2 h-10 bg-slate-50 rounded-full group-hover:bg-blue-100 transition-colors" />
                                        <div className="truncate">
                                            <p className="font-black text-lg text-slate-900 truncate leading-none mb-1.5">{bk.customer_name}</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest truncate">
                                                {bk.car_model} <span className="mx-2 opacity-30">•</span> <span className="text-blue-600 font-black">{bk.branch_name}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em]",
                                            bk.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                        )}>
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                bk.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                                            )} />
                                            {bk.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reports Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-12 mb-20">
                <Card className="border-none shadow-2xl bg-white p-10 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <Trophy size={24} className="text-amber-500" />
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Top Services</h3>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {bestServices.map((service) => (
                            <div key={service.name} className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-sm font-black text-slate-700 uppercase tracking-tight truncate mr-6">{service.name}</span>
                                    <span className="text-xs font-black text-slate-900">{service.count} unit</span>
                                </div>
                                <div className="w-full bg-slate-50 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(service.count / Math.max(...bestServices.map(s => s.count))) * 100}%` }}
                                        transition={{ duration: 1.5 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: service.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-14 pt-10 border-t-2 border-slate-50 border-dashed">
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Avg. Transaction</p>
                            <h4 className="text-5xl font-black italic tracking-tighter">
                                Rp {(totalRevenue / (totalBookings || 1)).toLocaleString('id-ID')}
                            </h4>
                            <DollarSign className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 transform rotate-12" />
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 gap-12">
                    <Card className="border-none shadow-2xl bg-white p-10 ring-1 ring-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-8">Analytical Insights</h3>
                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                            <div className="flex items-center justify-between mb-8">
                                <p className="text-xs font-black text-slate-900 uppercase">Customer Retention</p>
                                <span className="text-3xl font-black text-blue-600 italic">
                                    {Math.round((retentionStats.repeat / (retentionStats.new + retentionStats.repeat || 1)) * 100)}%
                                </span>
                            </div>
                            <div className="h-4 w-full bg-white rounded-full overflow-hidden flex p-1 border border-slate-200">
                                <div className="h-full bg-emerald-500" style={{ width: `${(retentionStats.new / (retentionStats.new + retentionStats.repeat || 1)) * 100}%` }} />
                                <div className="h-full bg-blue-500" style={{ width: `${(retentionStats.repeat / (retentionStats.new + retentionStats.repeat || 1)) * 100}%` }} />
                            </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[2rem] text-white mt-8 flex flex-col items-center">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Handling Time</p>
                            <h4 className="text-6xl font-black italic text-emerald-400">{avgServiceTime.label}</h4>
                        </div>
                    </Card>

                    <Card className="border-none shadow-2xl bg-rose-50/30 p-10 border-t-8 border-rose-500">
                        <div className="flex items-center gap-4 mb-8">
                            <PackageSearch size={28} className="text-rose-500" />
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Inventory Risk</h3>
                        </div>
                        <div className="space-y-4">
                            {lowStockItems.map(item => (
                                <div key={item.name} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.name}</span>
                                    <Badge variant="danger" className="text-xs font-black">Sisa {item.stock}</Badge>
                                </div>
                            ))}
                            {lowStockItems.length === 0 && <p className="text-center text-emerald-600 font-black uppercase text-xs">Semua Stok Aman</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
