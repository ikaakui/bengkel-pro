"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { ClipboardList, Loader2, DollarSign, CreditCard, Wallet, CalendarClock, Download } from "lucide-react";

export default function ShiftReportPage() {
    const { branchId, profile, branchName } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalTransactions: 0,
        totalRevenue: 0,
        cash: 0,
        transfer: 0,
        qris: 0
    });

    const supabase = createClient();

    useEffect(() => {
        const fetchShiftData = async () => {
            if (!branchId || !profile) return;
            setLoading(true);

            // Get transactions for today, in this branch
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from("transactions")
                .select("total_amount, payment_method, status")
                .eq("branch_id", branchId)
                .gte("created_at", today)
                .eq("status", "Paid");

            if (data) {
                const cash = data.filter(t => t.payment_method === 'Cash').reduce((a, b) => a + Number(b.total_amount), 0);
                const transfer = data.filter(t => t.payment_method === 'Transfer').reduce((a, b) => a + Number(b.total_amount), 0);
                const qris = data.filter(t => t.payment_method === 'QRIS').reduce((a, b) => a + Number(b.total_amount), 0);

                setStats({
                    totalTransactions: data.length,
                    totalRevenue: data.reduce((a, b) => a + Number(b.total_amount), 0),
                    cash, transfer, qris
                });
            }
            setLoading(false);
        };

        fetchShiftData();
    }, [branchId, profile, supabase]);

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["admin", "admin_depok", "admin_bsd", "owner", "spv"]}>
                <div className="space-y-8 pb-10 max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Shift Kasir</h2>
                            <p className="text-slate-500 mt-1 font-medium">Ringkasan penerimaan kasir hari ini di {branchName}</p>
                        </div>
                        <Button 
                            onClick={() => window.print()} 
                            className="bg-primary hover:bg-primary-dark text-white shadow-lg h-12 px-6 rounded-xl font-black uppercase tracking-widest"
                        >
                            <Download size={18} className="mr-2" /> Cetak Laporan
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-20">
                            <Loader2 size={40} className="animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-3xl overflow-hidden relative">
                                <div className="relative z-10">
                                    <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-2">Total Penerimaan Hari Ini</p>
                                    <h3 className="text-5xl font-black tracking-tighter italic">
                                        Rp {stats.totalRevenue.toLocaleString('id-ID')}
                                    </h3>
                                    <p className="mt-4 font-medium text-blue-100 flex items-center gap-2">
                                        <CalendarClock size={16} />
                                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <DollarSign size={200} className="absolute -right-10 -bottom-10 text-white/10 transform rotate-12" />
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="p-6 border-none shadow-xl bg-white flex items-center gap-4 hover:shadow-2xl transition-all rounded-3xl">
                                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                                        <Wallet size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Uang Tunai (Cash)</p>
                                        <p className="text-xl font-black text-slate-900 tracking-tight">Rp {stats.cash.toLocaleString('id-ID')}</p>
                                    </div>
                                </Card>

                                <Card className="p-6 border-none shadow-xl bg-white flex items-center gap-4 hover:shadow-2xl transition-all rounded-3xl">
                                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                        <CreditCard size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transfer Bank</p>
                                        <p className="text-xl font-black text-slate-900 tracking-tight">Rp {stats.transfer.toLocaleString('id-ID')}</p>
                                    </div>
                                </Card>

                                <Card className="p-6 border-none shadow-xl bg-white flex items-center gap-4 hover:shadow-2xl transition-all rounded-3xl">
                                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                                        <ClipboardList size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transaksi</p>
                                        <p className="text-xl font-black text-slate-900 tracking-tight">{stats.totalTransactions} Nota</p>
                                    </div>
                                </Card>
                            </div>
                            
                            <style jsx global>{`
                                @media print {
                                    body * {
                                        visibility: hidden;
                                    }
                                    .max-w-4xl, .max-w-4xl * {
                                        visibility: visible;
                                    }
                                    .max-w-4xl {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 100%;
                                    }
                                    button {
                                        display: none !important;
                                    }
                                }
                            `}</style>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
