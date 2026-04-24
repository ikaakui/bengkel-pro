"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import {
    Package,
    AlertTriangle,
    CheckCircle2,
    TrendingDown,
    Search,
    PackageSearch,
    Layers
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export default function InventoryAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [inventoryStats, setInventoryStats] = useState({ total: 0, critical: 0, safe: 0 });

    const { role } = useAuth();
    const supabase = createClient();

    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            const { data: allCatalog } = await supabase
                .from("catalog")
                .select("name, stock, category");

            if (allCatalog) {
                const spareParts = allCatalog.filter(c => c.category === "Spare Part");
                const critical = spareParts.filter(i => i.stock < 5);
                const safe = spareParts.filter(i => i.stock >= 5);

                setLowStockItems(critical.slice(0, 10));
                setInventoryStats({
                    total: spareParts.length,
                    critical: critical.length,
                    safe: safe.length
                });
            }

        } catch (error) {
            console.error("Error fetching inventory analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'owner' || role === 'spv') fetchInventoryData();
    }, [role]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 mt-4 font-medium italic">mensortir stok barang...</p>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={['owner', 'spv']}>
                <div className="space-y-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Package className="text-orange-600" /> Status Inventori
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">Monitoring ketersediaan sparepart dan aset workshop.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-8 border-none shadow-xl bg-white group hover:shadow-2xl transition-all border-b-4 border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Layers size={24} />
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter italic">{inventoryStats.total}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Total Jenis Sparepart</p>
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-xl bg-rose-50 text-rose-700 hover:shadow-2xl transition-all border-b-4 border-rose-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-white text-rose-500 rounded-2xl shadow-sm">
                                <AlertTriangle size={24} />
                            </div>
                            <Badge variant="danger" className="font-black">Kritis</Badge>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-rose-900 tracking-tighter italic">{inventoryStats.critical}</p>
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mt-1">Stok Hampir Habis</p>
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-xl bg-emerald-50 text-emerald-700 hover:shadow-2xl transition-all border-b-4 border-emerald-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-white text-emerald-500 rounded-2xl shadow-sm">
                                <CheckCircle2 size={24} />
                            </div>
                            <Badge variant="success" className="font-black">Aman</Badge>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-emerald-900 tracking-tighter italic">{inventoryStats.safe}</p>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1">Stok Memadai</p>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Low Stock Detailed Table */}
                    <Card className="border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                        <div className="p-8 border-b border-slate-50 bg-rose-50/20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shadow-sm">
                                    <PackageSearch size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Daftar Stok Kritis</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-none mt-1">Segera lakukan pemesanan ulang untuk item berikut.</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {lowStockItems.length === 0 ? (
                                <div className="p-10 text-center">
                                    <CheckCircle2 size={40} className="text-emerald-100 mx-auto mb-3" />
                                    <p className="text-sm text-slate-400 font-bold italic">Semua stok sparepart saat ini memadai.</p>
                                </div>
                            ) : (
                                lowStockItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 hover:bg-rose-50/30 transition-all border-l-4 border-transparent hover:border-rose-500">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs">
                                                {i + 1}
                                            </div>
                                            <p className="font-black text-slate-900 uppercase tracking-tight truncate flex-1 min-w-0">{item.name}</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-lg font-black text-rose-600 italic tracking-tighter">{item.stock}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Pcs Tersisa</p>
                                            </div>
                                            <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg active:scale-95">
                                                Order
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                            <button className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors">
                                Lihat Semua Katalog
                            </button>
                        </div>
                    </Card>

                    {/* Inventory Heatmap / Category Breakdown Placeholder */}
                    <Card className="border-none shadow-2xl bg-white p-8 flex flex-col justify-center ring-1 ring-slate-100 relative overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
                                    <TrendingDown size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Analisa Pengurangan</h3>
                                    <p className="text-sm text-slate-500 font-medium">Laju konsumsi sparepart per bulan.</p>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-[0_20px_50px_rgba(15,23,42,0.3)] border border-slate-800">
                                <div className="text-center space-y-4">
                                    <div className="inline-flex p-4 bg-white/10 rounded-3xl backdrop-blur-sm mb-2">
                                        <Package size={32} className="text-blue-400" />
                                    </div>
                                    <h4 className="text-xl font-black italic tracking-tighter">Fast Moving Items</h4>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[200px] mx-auto opacity-70">
                                        Oli Mesin, Filter Oli, dan Busi memiliki tingkat perputaran tertinggi bulan ini.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tighter italic">94%</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supply Risk</p>
                                    <p className="text-2xl font-black text-rose-600 tracking-tighter italic">Low</p>
                                </div>
                            </div>
                        </div>
                        <Layers size={300} className="absolute -left-20 -top-20 text-slate-50 opacity-10" />
                    </Card>
                </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
