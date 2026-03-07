"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase-client";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
    TrendingDown,
    Plus,
    Search,
    Calendar,
    Trash2,
    AlertCircle,
    Building2,
    DollarSign,
    Filter,
    ArrowUpDown,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Expense = {
    id: string;
    branch_id: string | null;
    category: 'gaji' | 'sewa' | 'listrik' | 'stok' | 'lainnya' | 'pemasaran' | 'operasional';
    amount: number;
    description: string;
    expense_date: string;
    created_at: string;
    branch_name?: string;
};

const CATEGORIES = [
    { value: 'gaji', label: 'Gaji Mekanik/Karyawan', color: 'bg-blue-500' },
    { value: 'stok', label: 'Pembelian Stok/Sparepart', color: 'bg-emerald-500' },
    { value: 'sewa', label: 'Sewa Tempat', color: 'bg-amber-500' },
    { value: 'listrik', label: 'Listrik & Air', color: 'bg-indigo-500' },
    { value: 'pemasaran', label: 'Iklan & Pemasaran', color: 'bg-pink-500' },
    { value: 'operasional', label: 'Biaya Operasional', color: 'bg-slate-500' },
    { value: 'lainnya', label: 'Lain-lain', color: 'bg-rose-500' },
];

export default function ExpensesPage() {
    const { role, profile } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const supabase = createClient();

    // Form state
    const [formData, setFormData] = useState({
        amount: 0,
        category: 'gaji',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        branch_id: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch branches
            const { data: bData } = await supabase.from("branches").select("id, name").order("name");
            if (bData) setBranches(bData);

            // Fetch expenses
            const query = supabase.from("expenses").select("*").order("expense_date", { ascending: false });

            const { data: eData } = await query;
            if (eData) {
                const enriched = eData.map(e => ({
                    ...e,
                    branch_name: bData?.find(b => b.id === e.branch_id)?.name || 'General'
                }));
                setExpenses(enriched);
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
            const { error } = await supabase.from("expenses").insert({
                ...formData,
                created_by: profile?.id
            });

            if (error) throw error;

            setShowAddForm(false);
            setFormData({
                amount: 0,
                category: 'gaji',
                description: '',
                expense_date: new Date().toISOString().split('T')[0],
                branch_id: profile?.branch_id || ''
            });
            fetchData();
        } catch (error) {
            alert("Gagal menambahkan pengeluaran");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus data pengeluaran ini?")) return;
        try {
            await supabase.from("expenses").delete().eq("id", id);
            fetchData();
        } catch (error) {
            alert("Gagal menghapus data");
        }
    };

    const filteredExpenses = expenses.filter(e => {
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.branch_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const totalFiltered = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3 sm:gap-4">
                            Expense Tracker
                            <Badge variant="danger" className="text-[10px] py-1 px-3">OUTFLOW</Badge>
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium">Monitoring pengeluaran rutin dan operasional bengkel.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-200"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Tambah Pengeluaran
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none p-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Periode Ini</p>
                        <h4 className="text-3xl sm:text-4xl font-black italic tracking-tighter">
                            Rp {totalFiltered.toLocaleString('id-ID')}
                        </h4>
                        <div className="mt-4 flex items-center gap-2 text-rose-400">
                            <TrendingDown size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Pengurangan Saldo</span>
                        </div>
                    </Card>

                    <Card className="border-none shadow-xl p-8 flex flex-col justify-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <Filter size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Transaksi</p>
                                <p className="text-2xl font-black text-slate-900">{filteredExpenses.length} Record</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-none shadow-xl p-8 flex flex-col justify-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                <p className="text-2xl font-black text-slate-900 text-emerald-600 italic">TERCATAT</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cari deskripsi atau cabang..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-6 py-5 bg-white rounded-3xl border-none shadow-xl text-slate-900 font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>
                    <div className="flex gap-2 p-1.5 bg-white rounded-3xl shadow-xl overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                filterCategory === 'all' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            Semua
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setFilterCategory(cat.value)}
                                className={cn(
                                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                    filterCategory === cat.value ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Data Table */}
                <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cabang</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Jumlah</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 sm:px-8 py-20 text-center">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-slate-400 font-medium italic">Menyelaraskan data...</p>
                                        </td>
                                    </tr>
                                ) : filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 sm:px-8 py-20 text-center">
                                            <AlertCircle size={40} className="text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-medium tracking-tight">Belum ada catatan pengeluaran.</p>
                                        </td>
                                    </tr>
                                ) : filteredExpenses.map((e) => (
                                    <tr key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">
                                                    {new Date(e.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={12} className="text-blue-500" />
                                                <span className="text-xs font-black uppercase text-slate-600">{e.branch_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", CATEGORIES.find(c => c.value === e.category)?.color || 'bg-slate-400')} />
                                                <span className="text-xs font-bold text-slate-600">
                                                    {CATEGORIES.find(c => c.value === e.category)?.label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <p className="text-sm font-medium text-slate-600 max-w-xs">{e.description || '-'}</p>
                                        </td>
                                        <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                                            <span className="text-sm font-black text-rose-600">
                                                Rp {e.amount.toLocaleString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                                            <button
                                                onClick={() => handleDelete(e.id)}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Add Form */}
            <AnimatePresence>
                {showAddForm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddForm(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-6"
                        >
                            <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm">
                                                    <TrendingDown size={22} className="text-rose-400" />
                                                </div>
                                                Catat Pengeluaran
                                            </h3>
                                            <p className="text-slate-400 text-sm font-medium mt-2 ml-[52px]">Pastikan data sesuai kuitansi/bukti.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddForm(false)}
                                            className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body - Scrollable */}
                                <div className="overflow-y-auto flex-1 p-8">
                                    <form id="expense-form" onSubmit={handleAddExpense} className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                                                <div className="relative">
                                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <select
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer"
                                                        value={formData.category}
                                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                                        required
                                                    >
                                                        {CATEGORIES.map(cat => (
                                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input
                                                        type="date"
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all"
                                                        value={formData.expense_date}
                                                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cabang</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer"
                                                    value={formData.branch_id}
                                                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                                    required={role === 'owner'}
                                                    disabled={role === 'admin'}
                                                >
                                                    <option value="">-- Pilih Cabang --</option>
                                                    {branches.map(br => (
                                                        <option key={br.id} value={br.id}>{br.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah (Rp)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">Rp</span>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 text-xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all"
                                                    value={formData.amount || ''}
                                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Memo</label>
                                            <textarea
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all min-h-[90px] resize-none"
                                                placeholder="Tulis alasan pengeluaran..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                    </form>
                                </div>

                                {/* Modal Footer - Always Visible */}
                                <div className="p-6 bg-slate-50/80 border-t border-slate-100 shrink-0">
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddForm(false)}
                                            className="flex-1 py-4 px-6 rounded-2xl bg-white text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 border border-slate-200 transition-all active:scale-[0.98]"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            form="expense-form"
                                            disabled={submitting}
                                            className="flex-[2] py-4 px-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-xs uppercase tracking-widest hover:from-slate-800 hover:to-slate-700 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {submitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Menyimpan...
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-2">
                                                    <CheckCircle2 size={16} />
                                                    Simpan Transaksi
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
