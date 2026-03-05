"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    Search,
    Wrench,
    Package,
    Plus,
    Info,
    CheckCircle2,
    Loader2,
    RefreshCw,
    X,
    Tag,
    Coins,
    FileText,
    Boxes,
    TrendingUp,
    Edit2,
    Trash2
} from "lucide-react";
import { motion } from "framer-motion";

interface CatalogItem {
    id: string;
    name: string;
    category: 'Service' | 'Spare Part';
    price: number;
    cost_price: number;
    description: string;
    stock: number | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    updated_by_name?: string | null;
}

export default function CatalogPage() {
    const { role, profile, branchName } = useAuth();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'All' | 'Service' | 'Spare Part'>('All');

    // Form state for adding new item
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState<'Service' | 'Spare Part'>('Service');
    const [newPrice, setNewPrice] = useState("");
    const [newCostPrice, setNewCostPrice] = useState("");
    const [newStock, setNewStock] = useState("");
    const [newDescription, setNewDescription] = useState("");

    // State for Bulk Update
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [bulkValue, setBulkValue] = useState("");
    const [bulkType, setBulkType] = useState<'nominal' | 'percent'>('percent');
    const [bulkMode, setBulkMode] = useState<'increase' | 'decrease'>('increase');
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // State for Editing single item
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

    // State for Inline Stock Edit
    const [editingStockId, setEditingStockId] = useState<string | null>(null);
    const [editingStockValue, setEditingStockValue] = useState("");
    const [isSavingStock, setIsSavingStock] = useState(false);

    const supabase = createClient();

    const fetchCatalog = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("catalog")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (data) {
            setItems(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const updaterName = role === 'owner' ? 'Owner' : `Admin ${branchName || ''}`.trim();

        const { error } = await supabase
            .from("catalog")
            .insert([{
                name: newName,
                category: newCategory,
                price: parseInt(newPrice),
                cost_price: parseInt(newCostPrice) || 0,
                stock: newCategory === 'Spare Part' ? parseInt(newStock) : null,
                description: newDescription,
                updated_by_name: updaterName
            }]);

        setIsSaving(false);

        if (error) {
            alert(`Gagal menambah item: ${error.message}`);
        } else {
            alert("✅ Item berhasil ditambahkan ke katalog!");
            setShowForm(false);
            setNewName("");
            setNewPrice("");
            setNewCostPrice("");
            setNewStock("");
            setNewDescription("");
            fetchCatalog();
        }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        setIsSaving(true);

        const updaterName = role === 'owner' ? 'Owner' : `Admin ${branchName || ''}`.trim();

        const { error } = await supabase
            .from("catalog")
            .update({
                name: editingItem.name,
                category: editingItem.category,
                price: editingItem.price,
                cost_price: editingItem.cost_price || 0,
                stock: editingItem.category === 'Spare Part' ? editingItem.stock : null,
                description: editingItem.description,
                updated_at: new Date().toISOString(),
                updated_by_name: updaterName
            })
            .eq("id", editingItem.id);

        setIsSaving(false);

        if (error) {
            alert(`Gagal update item: ${error.message}`);
        } else {
            alert("✅ Item berhasil diperbarui!");
            setEditingItem(null);
            fetchCatalog();
        }
    };

    const handleDeleteItem = async (itemId: string, itemName: string) => {
        if (!confirm(`Yakin ingin menghapus item "${itemName}" dari katalog?`)) return;

        // Soft delete
        const { error } = await supabase
            .from("catalog")
            .update({ is_active: false })
            .eq("id", itemId);

        if (error) {
            alert(`Gagal menghapus item: ${error.message}`);
        } else {
            fetchCatalog();
        }
    };

    const handleBulkUpdate = async () => {
        const val = parseFloat(bulkValue);
        if (isNaN(val) || val <= 0) {
            alert("Masukkan nilai yang valid!");
            return;
        }

        if (!confirm(`Yakin ingin ${bulkMode === 'increase' ? 'menaikkan' : 'menurunkan'} harga SEMUA item sebesar ${bulkValue}${bulkType === 'percent' ? '%' : ' Rupiah'}?`)) {
            return;
        }

        setIsBulkLoading(true);

        const updaterName = role === 'owner' ? 'Owner' : `Admin ${branchName || ''}`.trim();

        try {
            // Update items one by one for calculation logic (or use a RPC if DB supports it)
            // For safety and reliability in this specific scale, we loop or use a batch update
            const updates = items.map(async (item) => {
                let newPrice = item.price;
                if (bulkType === 'percent') {
                    const factor = bulkMode === 'increase' ? (1 + val / 100) : (1 - val / 100);
                    newPrice = item.price * factor;
                    // Pembulatan ke ribuan terdekat sesuai permintaan user
                    newPrice = Math.round(newPrice / 1000) * 1000;
                } else {
                    newPrice = bulkMode === 'increase' ? item.price + val : item.price - val;
                }

                return supabase
                    .from("catalog")
                    .update({ price: Math.max(0, newPrice), updated_at: new Date().toISOString(), updated_by_name: updaterName })
                    .eq("id", item.id);
            });

            await Promise.all(updates);
            alert("✅ Seluruh harga katalog berhasil diperbarui!");
            setBulkValue("");
            setShowBulkUpdate(false);
            fetchCatalog();
        } catch (err: any) {
            alert(`Terjadi kesalahan: ${err.message}`);
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleInlineStockUpdate = async (itemId: string) => {
        const stockVal = parseInt(editingStockValue);
        if (isNaN(stockVal) || stockVal < 0) {
            alert("Masukkan jumlah stok yang valid!");
            return;
        }

        setIsSavingStock(true);
        const updaterName = role === 'owner' ? 'Owner' : `Admin ${branchName || ''}`.trim();

        const { error } = await supabase
            .from("catalog")
            .update({ stock: stockVal, updated_at: new Date().toISOString(), updated_by_name: updaterName })
            .eq("id", itemId);

        setIsSavingStock(false);

        if (error) {
            alert(`Gagal update stok: ${error.message}`);
        } else {
            setEditingStockId(null);
            fetchCatalog();
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'All' || item.category === activeTab;
        return matchesSearch && matchesTab;
    });

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin"]}>
                <div className="space-y-8 pb-10">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Katalog Bengkel</h2>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowBulkUpdate(!showBulkUpdate)} className={`h-12 px-6 ${showBulkUpdate ? "bg-amber-50 border-amber-500 text-amber-600" : ""}`}>
                                <Coins size={20} className="mr-2" />
                                Update Harga Massal
                            </Button>
                            <Button variant="outline" onClick={fetchCatalog} className="h-12 w-12 p-0">
                                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                            </Button>
                            <Button onClick={() => { setShowForm(!showForm); setEditingItem(null); }} className="h-12 px-6">
                                {showForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                                {showForm ? "Tutup" : "Tambah Item"}
                            </Button>
                        </div>
                    </div>

                    {/* Bulk Update Tool */}
                    {showBulkUpdate && (
                        <Card className="border-amber-500/30 bg-amber-50/30">
                            <CardHeader>
                                <div className="flex items-center gap-3 text-amber-600">
                                    <TrendingUp size={24} />
                                    <h3 className="text-xl font-bold font-black uppercase tracking-widest">Alat Update Harga Massal</h3>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">Ubah harga seluruh item katalog sekaligus berdasarkan persentase atau nominal.</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipe Perubahan</label>
                                        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                            <button
                                                onClick={() => setBulkType('percent')}
                                                className={`flex-1 py-3.5 rounded-lg text-xs font-black transition-all ${bulkType === 'percent' ? "bg-amber-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-800"}`}
                                            >
                                                PERSEN (%)
                                            </button>
                                            <button
                                                onClick={() => setBulkType('nominal')}
                                                className={`flex-1 py-3.5 rounded-lg text-xs font-black transition-all ${bulkType === 'nominal' ? "bg-amber-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-800"}`}
                                            >
                                                NOMINAL (Rp)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Aksi</label>
                                        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                            <button
                                                onClick={() => setBulkMode('increase')}
                                                className={`flex-1 py-3.5 rounded-lg text-xs font-black transition-all ${bulkMode === 'increase' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-800"}`}
                                            >
                                                NAIK (+)
                                            </button>
                                            <button
                                                onClick={() => setBulkMode('decrease')}
                                                className={`flex-1 py-3.5 rounded-lg text-xs font-black transition-all ${bulkMode === 'decrease' ? "bg-red-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-800"}`}
                                            >
                                                TURUN (-)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nilai Perubahan</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                                {bulkType === 'percent' ? '%' : 'Rp'}
                                            </span>
                                            <input
                                                type="number"
                                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:outline-none font-bold text-lg"
                                                placeholder="0"
                                                value={bulkValue}
                                                onChange={(e) => setBulkValue(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleBulkUpdate}
                                        disabled={isBulkLoading || !bulkValue}
                                        className="h-[60px] bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-amber-600/20"
                                    >
                                        {isBulkLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={20} className="mr-2" />}
                                        Eksekusi Sekarang
                                    </Button>
                                </div>
                                {bulkType === 'percent' && bulkMode === 'increase' && (
                                    <p className="mt-4 text-[10px] font-bold text-amber-600 bg-amber-100/50 p-2 rounded-lg flex items-center gap-2">
                                        <Info size={14} />
                                        HARGA AKAN DIBULATKAN KE RIBUAN TERDEKAT SECARA OTOMATIS.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Add/Edit Form Overlay */}
                    {(showForm || editingItem) && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="w-full max-w-2xl max-h-[90vh] flex flex-col"
                            >
                                <Card className="border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col max-h-[90vh]">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                                {editingItem ? "Edit Item Katalog" : "Tambah Item Baru"}
                                            </h3>
                                            <p className="text-slate-500 text-sm mt-1">Isi formulir untuk memperbarui data katalog bengkel.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setShowForm(false); setEditingItem(null); }}
                                            className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <CardContent className="p-8 overflow-y-auto">
                                        <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Item</label>
                                                    <div className="relative">
                                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                        <input
                                                            type="text"
                                                            required
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:outline-none focus:bg-white transition-all font-bold"
                                                            placeholder="Contoh: Ganti Oli Shell"
                                                            value={editingItem ? editingItem.name : newName}
                                                            onChange={(e) => editingItem ? setEditingItem({ ...editingItem, name: e.target.value }) : setNewName(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Harga Jual (Rp)</label>
                                                    <div className="relative">
                                                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                        <input
                                                            type="number"
                                                            required
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:outline-none focus:bg-white transition-all font-bold"
                                                            placeholder="Contoh: 150000"
                                                            value={editingItem ? editingItem.price : newPrice}
                                                            onChange={(e) => editingItem ? setEditingItem({ ...editingItem, price: parseInt(e.target.value) }) : setNewPrice(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Harga Modal / Beli (Rp)</label>
                                                    <div className="relative">
                                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                        <input
                                                            type="number"
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:outline-none focus:bg-white transition-all font-bold"
                                                            placeholder="Contoh: 80000"
                                                            value={editingItem ? editingItem.cost_price : newCostPrice}
                                                            onChange={(e) => editingItem ? setEditingItem({ ...editingItem, cost_price: parseInt(e.target.value) || 0 }) : setNewCostPrice(e.target.value)}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 italic">Harga beli dari supplier, untuk perhitungan laba kotor di laporan.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori</label>
                                                    <div className="flex gap-3 p-1 bg-slate-100 rounded-2xl">
                                                        <button
                                                            type="button"
                                                            onClick={() => editingItem ? setEditingItem({ ...editingItem, category: 'Service' }) : setNewCategory('Service')}
                                                            className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${(editingItem ? editingItem.category : newCategory) === 'Service'
                                                                ? "bg-white text-primary shadow-lg"
                                                                : "text-slate-500 hover:text-slate-800"
                                                                }`}
                                                        >
                                                            <Wrench size={16} className="inline mr-2" />
                                                            SERVICE
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => editingItem ? setEditingItem({ ...editingItem, category: 'Spare Part' }) : setNewCategory('Spare Part')}
                                                            className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${(editingItem ? editingItem.category : newCategory) === 'Spare Part'
                                                                ? "bg-white text-emerald-600 shadow-lg"
                                                                : "text-slate-500 hover:text-slate-800"
                                                                }`}
                                                        >
                                                            <Package size={16} className="inline mr-2" />
                                                            PART
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stok Stok</label>
                                                    <div className="relative">
                                                        <Boxes className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                        <input
                                                            type="number"
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:outline-none focus:bg-white transition-all font-bold"
                                                            placeholder="Ketik stok..."
                                                            value={editingItem ? (editingItem.stock || "") : newStock}
                                                            onChange={(e) => editingItem ? setEditingItem({ ...editingItem, stock: parseInt(e.target.value) }) : setNewStock(e.target.value)}
                                                            disabled={(editingItem ? editingItem.category : newCategory) === 'Service'}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi</label>
                                                    <div className="relative">
                                                        <FileText className="absolute left-4 top-4 text-slate-300" size={18} />
                                                        <textarea
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:outline-none focus:bg-white transition-all font-bold min-h-[120px]"
                                                            placeholder="Jelaskan detail layanan atau spek barang..."
                                                            value={editingItem ? editingItem.description : newDescription}
                                                            onChange={(e) => editingItem ? setEditingItem({ ...editingItem, description: e.target.value }) : setNewDescription(e.target.value)}
                                                        ></textarea>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => { setShowForm(false); setEditingItem(null); }}
                                                    className="flex-1 h-14 font-black uppercase tracking-widest rounded-2xl"
                                                >
                                                    Batal
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={isSaving}
                                                    className="flex-[2] h-14 bg-primary hover:bg-primary-dark text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20"
                                                >
                                                    {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                                                    {isSaving ? "Menyimpan..." : (editingItem ? "Perbarui Item" : "Simpan ke Katalog")}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* Filters & Search */}
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-6">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-fit shadow-inner">
                            {['All', 'Service', 'Spare Part'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                                        ? "bg-white text-primary shadow-md"
                                        : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    {tab === 'All' ? 'Semua' : tab === 'Service' ? 'Layanan' : 'Suku Cadang'}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full lg:w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={20} />
                            <input
                                type="text"
                                placeholder="Cari layanan atau suku cadang..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Grid Items */}
                    {loading ? (
                        <div className="py-20 flex justify-center text-center">
                            <div>
                                <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
                                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Sinkronisasi Database...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filteredItems.map((item, i) => (
                                <Card key={item.id} delay={i * 0.05} className="group p-0 flex flex-col h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white rounded-[2.5rem]">
                                    <div className="p-8 flex-1">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-4 rounded-3xl shadow-lg ${item.category === 'Service' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-emerald-600 text-white shadow-emerald-200'
                                                    }`}>
                                                    {item.category === 'Service' ? <Wrench size={28} /> : <Package size={28} />}
                                                </div>
                                                <Badge variant={item.category === 'Service' ? 'info' : 'success'} className="px-4 py-1.5 text-[10px] font-black uppercase">
                                                    {item.category}
                                                </Badge>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingItem(item); setShowForm(true); }}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                    title="Edit Item"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Hapus Item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-3 line-clamp-2 min-h-[40px] font-medium leading-relaxed">
                                            {item.description || "Tidak ada deskripsi."}
                                        </p>

                                        <div className="mt-8 flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Harga Retail</p>
                                                <span className="text-3xl font-black text-slate-900 tracking-tighter flex flex-col">
                                                    Rp {item.price.toLocaleString('id-ID')}
                                                </span>
                                                {item.updated_at && (
                                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-1 block">
                                                        Diubah: {new Date(item.updated_at).toLocaleDateString('id-ID')} {item.updated_by_name ? `(${item.updated_by_name})` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {item.category === 'Spare Part' && (
                                        <div className="p-6 bg-slate-50/80 border-t border-slate-100 rounded-b-[2.5rem]">
                                            {editingStockId === item.id ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 relative">
                                                        <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                        <input
                                                            type="number"
                                                            autoFocus
                                                            className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:outline-none font-bold text-sm"
                                                            placeholder="Jumlah stok baru..."
                                                            value={editingStockValue}
                                                            onChange={(e) => setEditingStockValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleInlineStockUpdate(item.id);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingStockId(null);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleInlineStockUpdate(item.id)}
                                                        disabled={isSavingStock}
                                                        className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-90 shadow-lg shadow-emerald-600/20"
                                                    >
                                                        {isSavingStock ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingStockId(null)}
                                                        className="w-11 h-11 rounded-xl bg-white text-slate-400 border border-slate-200 flex items-center justify-center hover:text-red-500 hover:border-red-200 transition-all"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingStockId(item.id);
                                                        setEditingStockValue(item.stock?.toString() || "");
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-emerald-600 font-black text-xs uppercase tracking-widest border border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md transition-all active:scale-[0.98]"
                                                >
                                                    <Boxes size={16} />
                                                    Ubah Stok Saat Ini: {item.stock}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}

                    {!loading && filteredItems.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <div className="bg-slate-100 p-10 rounded-[3rem] text-slate-300 mb-6 shadow-inner">
                                <Search size={64} strokeWidth={1} />
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">Item tidak ditemukan</p>
                            <p className="text-slate-500 mt-2 font-medium">Coba kata kunci lain atau setel ulang filter.</p>
                            <Button variant="outline" onClick={() => { setSearchQuery(""); setActiveTab('All'); }} className="mt-8 rounded-full px-8">
                                Reset Semua Filter
                            </Button>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
