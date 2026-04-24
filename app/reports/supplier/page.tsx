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
    
    // Add Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [ownerWA, setOwnerWA] = useState('6281234567890');
    
    const { profile, role } = useAuth();

    const [formData, setFormData] = useState({
        amount: 0,
        category: 'stok',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        branch_id: ''
    });

    const [supplierItems, setSupplierItems] = useState([{ name: '', qty: 1, cost: 0, sell: 0 }]);

    const addSupplierItem = () => setSupplierItems([...supplierItems, { name: '', qty: 1, cost: 0, sell: 0 }]);
    const removeSupplierItem = (index: number) => setSupplierItems(supplierItems.filter((_, i) => i !== index));
    const updateSupplierItem = (index: number, field: string, value: any) => {
        const newItems = [...supplierItems];
        (newItems[index] as any)[field] = value;
        setSupplierItems(newItems);
        
        const total = newItems.reduce((acc, curr) => acc + (curr.qty * curr.cost), 0);
        setFormData(prev => ({ ...prev, amount: total }));
    };

    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: bData } = await supabase.from("branches").select("id, name").order("name");
            if (bData) {
                const uniqueBranches = bData.filter((branch, index, self) =>
                    index === self.findIndex((t) => t.name === branch.name)
                );
                setBranches(uniqueBranches);
            }

            const { data: sData } = await supabase.from("app_settings").select("*").eq("key", "owner_wa_number").single();
            if (sData?.value) setOwnerWA(sData.value);

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
        if (profile?.branch_id) {
            setFormData(prev => ({ ...prev, branch_id: profile.branch_id! }));
        }
    }, [profile]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data: inserted, error } = await supabase
                .from("expenses")
                .insert({
                    ...formData,
                    description: `STRUCT_JSON:${JSON.stringify(supplierItems)}`,
                    created_by: profile?.id
                })
                .select()
                .single();

            if (error) throw error;

            setShowAddForm(false);
            setFormData({
                amount: 0,
                category: 'stok',
                description: '',
                expense_date: new Date().toISOString().split('T')[0],
                branch_id: profile?.branch_id || ''
            });
            setSupplierItems([{ name: '', qty: 1, cost: 0, sell: 0 }]);

            if (inserted) {
                const enrichedExpense = {
                    ...inserted,
                    branch_name: branches.find(b => b.id === inserted.branch_id)?.name || 'Bengkel'
                };
                sendWhatsApp(enrichedExpense);
            }

            fetchData();
        } catch (err: any) {
            alert("Gagal menambahkan data: " + (err?.message || 'Unknown error'));
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const sendWhatsApp = (expense: any) => {
        const branch = expense.branch_name;
        const date = new Date(expense.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let descriptionText = expense.description;
        if (descriptionText.startsWith('STRUCT_JSON:')) {
            try {
                const items = JSON.parse(descriptionText.replace('STRUCT_JSON:', ''));
                descriptionText = items.map((item: any) => `- ${item.name} (${item.qty}x) @ Rp ${item.cost.toLocaleString('id-ID')}`).join('%0A');
            } catch (e) {
                console.error("Failed to parse expense description JSON", e);
            }
        }

        const text = `*LAPORAN NOTA SUPPLIER BARU - ${branch}*%0A%0A` +
            `Berikut adalah rincian barang yang baru saja diambil:%0A%0A` +
            `*Tanggal:* ${date}%0A` +
            `*Kategori:* Pembelian Stok/Sparepart%0A` +
            `*Total Tagihan:* Rp ${expense.amount.toLocaleString('id-ID')}%0A%0A` +
            `*Rincian Barang:*%0A${descriptionText}%0A%0A` +
            `_Silakan lampirkan foto nota fisik sebagai bukti._`;

        window.open(`https://wa.me/${ownerWA}?text=${text}`, '_blank');
    };

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
                                onClick={() => setShowAddForm(true)}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-2xl shadow-emerald-200"
                            >
                                <Package size={20} strokeWidth={3} />
                                Input Pengambilan
                            </button>
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

                    {/* Modal Add Form */}
                    {showAddForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
                            <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-[101]">
                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
                                                    <Package size={22} className="text-white" />
                                                </div>
                                                Input Pengambilan Barang
                                            </h3>
                                            <p className="text-emerald-50 text-sm font-medium mt-2 ml-[52px]">
                                                Data akan tercatat sebagai stok masuk & penagihan.
                                            </p>
                                        </div>
                                        <button onClick={() => setShowAddForm(false)} className="p-3 text-emerald-100 hover:text-white hover:bg-white/20 rounded-2xl transition-all">
                                            X
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 p-8">
                                    <form id="expense-form" onSubmit={handleAddExpense} className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                                                <input type="text" value="Pembelian Stok/Sparepart" disabled className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal</label>
                                                <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold text-slate-700" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cabang</label>
                                            <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold text-slate-700" value={formData.branch_id} onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })} required={role === 'owner'} disabled={role === 'admin'}>
                                                <option value="">-- Pilih Cabang --</option>
                                                {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Tagihan (Rp)</label>
                                            <input type="number" className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-5 text-xl font-black text-slate-500" value={formData.amount} disabled />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Barang & Harga</label>
                                                <button type="button" onClick={addSupplierItem} className="text-[10px] font-black text-emerald-600 uppercase hover:bg-emerald-50 px-3 py-1 rounded-lg transition-all">+ Tambah Baris</button>
                                            </div>
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {supplierItems.map((item, idx) => (
                                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group/item">
                                                        <div className="grid grid-cols-12 gap-3">
                                                            <div className="col-span-8">
                                                                <input placeholder="Nama Barang" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={item.name} onChange={(e) => updateSupplierItem(idx, 'name', e.target.value)} required />
                                                            </div>
                                                            <div className="col-span-4">
                                                                <input type="number" placeholder="Qty" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={item.qty || ''} onChange={(e) => updateSupplierItem(idx, 'qty', Number(e.target.value))} required />
                                                            </div>
                                                            <div className="col-span-6">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Harga Modal</label>
                                                                <input type="number" placeholder="Modal" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={item.cost || ''} onChange={(e) => updateSupplierItem(idx, 'cost', Number(e.target.value))} required />
                                                            </div>
                                                            <div className="col-span-6">
                                                                <label className="text-[9px] font-black text-emerald-600 uppercase ml-1">Harga Jual</label>
                                                                <input type="number" placeholder="Jual" className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-2 text-xs font-bold" value={item.sell || ''} onChange={(e) => updateSupplierItem(idx, 'sell', Number(e.target.value))} required />
                                                            </div>
                                                        </div>
                                                        {supplierItems.length > 1 && (
                                                            <button type="button" onClick={() => removeSupplierItem(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-lg">X</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div className="p-6 bg-slate-50/80 border-t border-slate-100 shrink-0 flex gap-4">
                                    <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-4 px-6 rounded-2xl bg-white text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 border border-slate-200">Batal</button>
                                    <button type="submit" form="expense-form" disabled={submitting} className="flex-[2] py-4 px-6 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50">
                                        {submitting ? 'Menyimpan...' : 'Simpan & Kirim WA'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
