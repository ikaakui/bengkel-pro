"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { createClient } from "@/lib/supabase-client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
    Package,
    Search,
    Calendar,
    ArrowUpRight,
    TrendingUp,
    Building2,
    DollarSign,
    Filter,
    AlertCircle,
    ChevronDown,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function SupplierRecapPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBranch, setFilterBranch] = useState("all");
    const [branches, setBranches] = useState<any[]>([]);

    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: bData } = await supabase.from("branches").select("id, name");
            setBranches(bData || []);

            const { data: eData } = await supabase
                .from("expenses")
                .select("*")
                .eq("category", "stok")
                .order("expense_date", { ascending: false });

            if (eData) {
                // Flatten structured JSON data
                const flattened: any[] = [];
                eData.forEach(exp => {
                    const branchName = bData?.find(b => b.id === exp.branch_id)?.name || 'General';
                    
                    if (exp.description?.startsWith('STRUCT_JSON:')) {
                        try {
                            const items = JSON.parse(exp.description.replace('STRUCT_JSON:', ''));
                            items.forEach((item: any) => {
                                flattened.push({
                                    ...item,
                                    id: exp.id,
                                    date: exp.expense_date,
                                    branch_id: exp.branch_id,
                                    branch_name: branchName,
                                    total_cost: item.qty * item.cost,
                                    profit: (item.sell - item.cost) * item.qty,
                                    margin: item.cost > 0 ? ((item.sell - item.cost) / item.cost) * 100 : 0
                                });
                            });
                        } catch (e) {
                            // Fallback if JSON parse fails
                            flattened.push({
                                name: exp.description,
                                qty: 1,
                                cost: exp.amount,
                                sell: 0,
                                date: exp.expense_date,
                                branch_name: branchName,
                                total_cost: exp.amount,
                                profit: 0,
                                margin: 0
                            });
                        }
                    } else {
                        // Legacy data
                        flattened.push({
                            name: exp.description || 'Tanpa Keterangan',
                            qty: 1,
                            cost: exp.amount,
                            sell: 0,
                            date: exp.expense_date,
                            branch_name: branchName,
                            total_cost: exp.amount,
                            profit: 0,
                            margin: 0
                        });
                    }
                });
                setData(flattened);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBranch = filterBranch === 'all' || item.branch_id === filterBranch;
        return matchesSearch && matchesBranch;
    });

    const totalStats = filteredData.reduce((acc, curr) => ({
        cost: acc.cost + curr.total_cost,
        profit: acc.profit + curr.profit,
        items: acc.items + curr.qty
    }), { cost: 0, profit: 0, items: 0 });

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "spv"]}>
                <div className="space-y-8 pb-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                                    <Package size={24} />
                                </div>
                                <Badge variant="neutral" className="text-[10px] font-black tracking-widest uppercase">Inventory Logs</Badge>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Rekap Pengambilan Supplier</h1>
                            <p className="text-slate-500 mt-1 font-medium italic">Laporan detail harga modal, harga jual, dan margin keuntungan per item.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                             <button 
                                onClick={fetchData}
                                className="p-4 bg-white text-slate-400 hover:text-blue-600 rounded-3xl shadow-xl hover:shadow-2xl transition-all active:scale-95 border border-slate-100"
                            >
                                <TrendingUp size={20} />
                            </button>
                            <button className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-200">
                                <Download size={18} />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Investasi Stok</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black italic tracking-tighter">Rp {totalStats.cost.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-emerald-400">
                                <div className="p-1 bg-emerald-500/20 rounded-lg">
                                    <DollarSign size={14} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{totalStats.items} Items Terdata</span>
                            </div>
                        </Card>

                        <Card className="p-8 border-none shadow-xl bg-white flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Estimasi Keuntungan</p>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Rp {totalStats.profit.toLocaleString('id-ID')}</h3>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-blue-600">
                                <TrendingUp size={16} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Potential Margin: {totalStats.cost > 0 ? (totalStats.profit / totalStats.cost * 100).toFixed(1) : 0}%</span>
                            </div>
                        </Card>

                        <Card className="p-8 border-none shadow-xl bg-white">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Filter & Cari</p>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Cari item..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <select 
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={filterBranch}
                                        onChange={(e) => setFilterBranch(e.target.value)}
                                    >
                                        <option value="all">Semua Cabang</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Data Table */}
                    <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-0 overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal & Cabang</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Barang (Qty)</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Modal</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Jual</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Margin / Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold tracking-tight italic">Menyusun laporan detail...</p>
                                            </td>
                                        </tr>
                                    ) : filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <AlertCircle size={48} className="text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">Data pengambilan supplier tidak ditemukan.</p>
                                            </td>
                                        </tr>
                                    ) : filteredData.map((item, i) => (
                                        <motion.tr 
                                            key={`${item.id}-${i}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="group hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        <span className="text-xs font-black text-slate-900 uppercase">
                                                            {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 size={10} className="text-blue-500" />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{item.branch_name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</p>
                                                    <Badge variant="neutral" className="w-fit text-[9px] px-1.5 py-0.5 font-black">{item.qty} Unit / Pcs</Badge>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-sm font-black text-slate-900">Rp {item.cost.toLocaleString('id-ID')}</p>
                                                    <p className="text-[10px] font-medium text-slate-400 italic">Total: Rp {item.total_cost.toLocaleString('id-ID')}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {item.sell > 0 ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-sm font-black text-blue-600">Rp {item.sell.toLocaleString('id-ID')}</p>
                                                        <p className="text-[10px] font-medium text-slate-400 italic">Revenue: Rp {(item.sell * item.qty).toLocaleString('id-ID')}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Belum Set</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {item.sell > 0 ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                            <ArrowUpRight size={12} strokeWidth={3} />
                                                            <span className="text-[10px] font-black uppercase tracking-tight">{item.margin.toFixed(1)}%</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 italic">Profit: Rp {item.profit.toLocaleString('id-ID')}</p>
                                                    </div>
                                                ) : (
                                                    <Badge variant="danger" className="text-[8px] px-2">PRICE NOT SET</Badge>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Summary Footer */}
                    <Card className="bg-blue-50 border-blue-100 p-8 rounded-[2rem]">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-lg shadow-blue-200">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Analisa Pengadaan Barang</h4>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed mt-1">
                                    Laporan ini menggabungkan data inventori baru yang diinput melalui menu pengeluaran. Gunakan data ini untuk mengevaluasi vendor supplier dan menentukan penyesuaian harga jual berdasarkan kenaikan harga modal secara real-time.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
