"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
    Banknote,
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    Filter,
    Calendar,
    ArrowRight
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function AdminFinancePage() {
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState({ revenue: 0, expenses: 0, transactions: 0 });

    const { role, profile } = useAuth();
    const supabase = createClient();

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const branchId = profile?.branch_id;
            if (!branchId) return;

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const [
                { data: txs },
                { data: exps }
            ] = await Promise.all([
                supabase.from("transactions").select("total_amount").eq("branch_id", branchId).eq("status", "Paid").gte("created_at", startOfMonth),
                supabase.from("expenses").select("amount").eq("branch_id", branchId).gte("created_at", startOfMonth)
            ]);

            setFinanceData({
                revenue: (txs || []).reduce((acc, t) => acc + Number(t.total_amount), 0),
                expenses: (exps || []).reduce((acc, e) => acc + Number(e.amount), 0),
                transactions: (txs || []).length
            });

        } catch (error) {
            console.error("Error fetching admin finance:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'admin') fetchFinanceData();
    }, [role]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 mt-4 font-medium italic">mengkalkulasi keuangan cabang...</p>
            </div>
        );
    }

    const netProfit = financeData.revenue - financeData.expenses;

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Banknote className="text-emerald-600" /> Keuangan Cabang
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">Overview pendapatan vs pengeluaran operasional bulan ini.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Revenue Card */}
                <Card className="p-8 border-none shadow-2xl bg-white relative overflow-hidden group hover:shadow-emerald-100 transition-all border-l-4 border-emerald-500">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner">
                                <ArrowUpCircle size={24} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-3 py-1 rounded-full">{financeData.transactions} transaksi</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Pendapatan</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">Rp {financeData.revenue.toLocaleString('id-ID')}</h3>
                    </div>
                </Card>

                {/* Expenses Card */}
                <Card className="p-8 border-none shadow-2xl bg-white relative overflow-hidden group hover:shadow-rose-100 transition-all border-l-4 border-rose-500">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl shadow-inner">
                                <ArrowDownCircle size={24} />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Pengeluaran</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">Rp {financeData.expenses.toLocaleString('id-ID')}</h3>
                    </div>
                </Card>

                {/* Net Profit Card */}
                <Card className="p-8 border-none shadow-2xl bg-slate-900 text-white relative overflow-hidden md:col-span-2 lg:col-span-1 border-l-4 border-blue-500">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                            Laba Bersih Estimasi <TrendingUp size={12} className="text-blue-400" />
                        </p>
                        <h3 className="text-4xl font-black tracking-tighter italic">Rp {netProfit.toLocaleString('id-ID')}</h3>
                        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Berdasarkan transaksi yang sudah lunas dan pengeluaran yang tercatat.
                        </p>
                    </div>
                    <Banknote size={150} className="absolute -right-10 -bottom-10 text-white/5" />
                </Card>
            </div>

            {/* Analysis Placeholder */}
            <Card className="border-none shadow-2xl bg-white p-10 ring-1 ring-slate-100">
                <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-400 mb-6 shadow-inner border border-slate-100/50">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Laporan Keuangan Mendalam</h3>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Modul ini sedang disiapkan untuk menampilkan rincian beban operasional, payroll, dan margin per jenis layanan secara otomatis.
                    </p>
                    <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all outline-none">
                        Lihat Buku Kas <ArrowRight size={14} />
                    </button>
                </div>
            </Card>
        </div>
    );
}
