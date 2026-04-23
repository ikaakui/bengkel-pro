"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
    Ticket, 
    Plus, 
    Trash2, 
    Edit3, 
    Save, 
    X, 
    Loader2, 
    Gift, 
    Settings2,
    Coins,
    CheckCircle2,
    AlertCircle,
    Info,
    FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Reward {
    id: string;
    name: string;
    points_required: number;
    reward_type: 'discount' | 'item';
    discount_value: number | null;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
}

interface RedemptionHistory {
    id: string;
    points: number;
    description: string;
    created_at: string;
    member?: {
        full_name: string;
    };
}

export default function RewardsPage() {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [pointsPerRupiah, setPointsPerRupiah] = useState(10000);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingReward, setEditingReward] = useState<Partial<Reward> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({ show: false, type: 'success', message: '' });
    const [history, setHistory] = useState<RedemptionHistory[]>([]);

    const supabase = createClient();

    const fetchRewards = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("rewards")
            .select("*")
            .order("points_required", { ascending: true });
        if (data) setRewards(data);

        const { data: settings } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "points_per_rupiah")
            .single();
        if (settings) setPointsPerRupiah(Number(settings.value));
        
        // Fetch History
        const { data: historyData } = await supabase
            .from("point_transactions")
            .select("*, member:profiles(full_name)")
            .eq("type", "redeem")
            .order("created_at", { ascending: false })
            .limit(20);
        if (historyData) setHistory(historyData);

        setLoading(false);
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const showToast = (type: 'success' | 'error', message: string) => {
        setFeedback({ show: true, type, message });
        setTimeout(() => setFeedback(prev => ({ ...prev, show: false })), 3000);
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        const { error } = await supabase
            .from("app_settings")
            .upsert({ key: "points_per_rupiah", value: pointsPerRupiah.toString() }, { onConflict: 'key' });
        
        if (error) {
            showToast('error', "Gagal menyimpan pengaturan.");
        } else {
            showToast('success', "Pengaturan poin berhasil diperbarui.");
        }
        setIsSavingSettings(false);
    };

    const handleSaveReward = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (editingReward?.id) {
            const { error } = await supabase
                .from("rewards")
                .update(editingReward)
                .eq("id", editingReward.id);
            if (error) showToast('error', error.message);
            else {
                showToast('success', "Reward berhasil diperbarui.");
                setShowModal(false);
                fetchRewards();
            }
        } else {
            const { error } = await supabase
                .from("rewards")
                .insert([editingReward]);
            if (error) showToast('error', error.message);
            else {
                showToast('success', "Reward baru berhasil ditambahkan.");
                setShowModal(false);
                fetchRewards();
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteReward = async (id: string) => {
        if (!confirm("Hapus reward ini?")) return;
        const { error } = await supabase.from("rewards").delete().eq("id", id);
        if (error) showToast('error', error.message);
        else {
            showToast('success', "Reward berhasil dihapus.");
            fetchRewards();
        }
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin", "spv"]}>
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Program Loyalty & Reward</h1>
                            <p className="text-slate-500 mt-2 text-lg">Atur bagaimana pelanggan mendapatkan dan menukarkan poin reward.</p>
                        </div>
                        <Button 
                            onClick={() => {
                                setEditingReward({ name: "", points_required: 100, reward_type: 'discount', discount_value: 0, is_active: true });
                                setShowModal(true);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:-translate-y-1 gap-2"
                        >
                            <Plus size={24} />
                            TAMBAH REWARD
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Settings Column */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/50 overflow-hidden rounded-[2rem] shadow-xl shadow-amber-500/5">
                                <CardHeader className="bg-white/50 border-b border-amber-100 p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/30">
                                            <Settings2 size={24} />
                                        </div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Konfigurasi Poin</h2>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                            <Coins size={16} className="text-amber-500" />
                                            1 Poin Reward = Setiap Kelipatan (Rp)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                            <input 
                                                type="number"
                                                value={pointsPerRupiah}
                                                onChange={(e) => setPointsPerRupiah(Number(e.target.value))}
                                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-amber-100 rounded-2xl text-xl font-black text-slate-800 focus:outline-none focus:border-amber-500 transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed italic bg-white/50 p-4 rounded-xl border border-amber-50">
                                            Contoh: Jika diisi 10.000, maka transaksi Rp 100.000 akan menghasilkan 10 Poin.
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 bg-white/50 border-t border-amber-100">
                                    <Button 
                                        onClick={handleSaveSettings}
                                        disabled={isSavingSettings}
                                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-2"
                                    >
                                        {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        SIMPAN PENGATURAN
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Info Card */}
                            <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 space-y-4">
                                <div className="flex items-center gap-2 text-blue-700 font-black uppercase text-xs">
                                    <Info size={16} />
                                    Tips Program Loyalty
                                </div>
                                <ul className="space-y-3 text-sm text-blue-600/80 font-medium leading-relaxed">
                                    <li>• Pastikan rasion poin masuk akal agar tidak merugikan bengkel.</li>
                                    <li>• Buat reward bertingkat (kecil, menengah, besar) agar pelanggan termotivasi.</li>
                                    <li>• Gunakan reward "Service Gratis" untuk item dengan margin keuntungan tinggi.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Rewards List Column */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {loading ? (
                                        [1,2,3,4].map(i => (
                                            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2rem]" />
                                        ))
                                    ) : rewards.length === 0 ? (
                                        <div className="col-span-full py-20 text-center space-y-4 opacity-40">
                                            <Gift size={80} className="mx-auto text-slate-300" />
                                            <p className="text-xl font-bold text-slate-400">Belum ada katalog reward yang dibuat.</p>
                                        </div>
                                    ) : (
                                        rewards.map((reward) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                key={reward.id}
                                                className={cn(
                                                    "group relative bg-white border-2 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:-translate-y-1",
                                                    reward.is_active ? "border-slate-100" : "border-slate-100 opacity-60 grayscale"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={cn(
                                                        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12",
                                                        reward.reward_type === 'discount' 
                                                            ? "bg-amber-100 text-amber-600 shadow-amber-200/50" 
                                                            : "bg-blue-100 text-blue-600 shadow-blue-200/50"
                                                    )}>
                                                        {reward.reward_type === 'discount' ? <Ticket size={32} /> : <Gift size={32} />}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingReward(reward);
                                                                setShowModal(true);
                                                            }}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteReward(reward.id)}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xl font-black text-slate-900 truncate">{reward.name}</h3>
                                                        {!reward.is_active && <Badge variant="neutral">OFF</Badge>}
                                                    </div>
                                                    <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{reward.description || "Tidak ada rincian deskripsi."}</p>
                                                </div>

                                                <div className="mt-8 flex items-end justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dibutuhkan</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-3xl font-black text-amber-500">{reward.points_required}</span>
                                                            <span className="text-sm font-bold text-slate-400">PTS</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nilai Benefit</p>
                                                        <p className="text-lg font-bold text-slate-700">
                                                            {reward.reward_type === 'discount' 
                                                                ? `Rp ${reward.discount_value?.toLocaleString()}` 
                                                                : 'Item Fisik'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="mt-12 space-y-6">
                        <div className="flex items-center gap-2 px-2">
                            <FileText className="text-slate-500" size={24} />
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Riwayat Penukaran Reward</h2>
                        </div>
                        <Card className="border-2 border-slate-100 rounded-[2rem] overflow-hidden">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-10 flex justify-center"><Loader2 size={30} className="animate-spin text-slate-300" /></div>
                                ) : history.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <p className="text-slate-500 font-medium">Belum ada riwayat penukaran reward.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {history.map(item => (
                                            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-900">{item.member?.full_name || "Member"}</p>
                                                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="warning" className="mb-1 text-xs">{item.points} PTS</Badge>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                        {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Toast Notification */}
                <AnimatePresence>
                    {feedback.show && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: 50, x: '-50%' }}
                            className={cn(
                                "fixed bottom-10 left-1/2 z-[110] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2",
                                feedback.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                            )}
                        >
                            {feedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-rose-500" />}
                            <span className="font-bold">{feedback.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <form onSubmit={handleSaveReward} className="flex flex-col h-full overflow-hidden">
                                <div className="p-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl">
                                            <Gift size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight">
                                                {editingReward?.id ? "Edit Katalog Reward" : "Reward Baru"}
                                            </h3>
                                            <p className="text-amber-100 text-sm font-medium">Lengkapi rincian benefit untuk pelanggan.</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
                                    >
                                        <X size={28} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Nama Reward / Benefit</label>
                                        <input 
                                            type="text"
                                            required
                                            value={editingReward?.name}
                                            onChange={(e) => setEditingReward(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Contoh: Diskon Servis Berkala"
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Poin Dibutuhkan</label>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    required
                                                    value={editingReward?.points_required}
                                                    onChange={(e) => setEditingReward(prev => ({ ...prev, points_required: Number(e.target.value) }))}
                                                    className="w-full pl-5 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-black text-xl"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-widest">PTS</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Tipe Reward</label>
                                            <select 
                                                value={editingReward?.reward_type}
                                                onChange={(e) => setEditingReward(prev => ({ ...prev, reward_type: e.target.value as Reward['reward_type'] }))}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-bold appearance-none"
                                            >
                                                <option value="discount">🎟️ Potongan Harga</option>
                                                <option value="item">🎁 Produk/Item Fisik</option>
                                            </select>
                                        </div>
                                    </div>

                                    {editingReward?.reward_type === 'discount' && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-2"
                                        >
                                            <label className="text-sm font-bold text-slate-700">Nilai Potongan (Rupiah)</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                                <input 
                                                    type="number"
                                                    required
                                                    value={editingReward?.discount_value || 0}
                                                    onChange={(e) => setEditingReward(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                                                    className="w-full pl-14 pr-5 py-4 bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-black text-xl text-emerald-700"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">URL Gambar Produk</label>
                                        <input 
                                            type="text"
                                            value={editingReward?.image_url || ""}
                                            onChange={(e) => setEditingReward(prev => ({ ...prev, image_url: e.target.value }))}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Deskripsi Singkat</label>
                                        <textarea 
                                            value={editingReward?.description || ""}
                                            onChange={(e) => setEditingReward(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Jelaskan syarat atau detail reward ini..."
                                            rows={3}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                        <input 
                                            type="checkbox"
                                            id="is_active"
                                            checked={editingReward?.is_active}
                                            onChange={(e) => setEditingReward(prev => ({ ...prev, is_active: e.target.checked }))}
                                            className="w-6 h-6 rounded-lg text-amber-500 focus:ring-amber-500"
                                        />
                                        <label htmlFor="is_active" className="text-sm font-bold text-slate-700 cursor-pointer">
                                            Aktifkan Katalog Ini
                                        </label>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 h-14 rounded-2xl font-bold"
                                    >
                                        BATAL
                                    </Button>
                                    <Button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] h-14 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                                        SIMPAN REWARD
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </RoleGuard>
        </DashboardLayout>
    );
}
