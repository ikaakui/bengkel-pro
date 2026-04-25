"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    Wrench, 
    Calendar, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    Plus, 
    Search, 
    Filter,
    ChevronRight,
    Settings,
    History,
    Building2,
    User,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";

interface MaintenanceTask {
    id: string;
    asset_name: string;
    branch_id: string | null;
    branch_name?: string;
    last_maintenance: string;
    next_maintenance: string;
    status: 'urgent' | 'scheduled' | 'done';
    technician?: string;
}

export default function MaintenancePage() {
    const { profile, role } = useAuth();
    const supabase = createClient();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Form state
    const [formData, setFormData] = useState({
        asset_name: '',
        branch_id: '',
        last_maintenance: new Date().toISOString().split('T')[0],
        next_maintenance: '',
        status: 'scheduled' as const,
        technician: ''
    });

    const [logs, setLogs] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch branches
            const { data: bData, error: bError } = await supabase.from("branches").select("id, name").order("name");
            if (bError) console.error("Error fetching branches:", bError);
            if (bData) {
                const uniqueBranches = bData.filter((branch, index, self) =>
                    index === self.findIndex((t) => t.name === branch.name)
                );
                setBranches(uniqueBranches);
            }

            // Fetch maintenance assets
            const { data: aData, error: aError } = await supabase
                .from("maintenance_assets")
                .select("*, branches(name)")
                .order("next_maintenance", { ascending: true });

            if (aError) console.error("Error fetching assets:", aError);
            if (aData && Array.isArray(aData)) {
                const formatted = aData.map((a: any) => {
                    // Handle potential array/object return from Supabase join
                    const branchInfo = Array.isArray(a.branches) ? a.branches[0] : a.branches;
                    return {
                        ...a,
                        branch_name: branchInfo?.name || 'General'
                    };
                });
                setTasks(formatted);
            }

            // Fetch logs
            const { data: lData, error: lError } = await supabase
                .from("maintenance_logs")
                .select("*, maintenance_assets(asset_name)")
                .order("maintenance_date", { ascending: false })
                .limit(5);
            
            if (lError) console.error("Error fetching logs:", lError);
            if (lData && Array.isArray(lData)) setLogs(lData);
        } catch (error) {
            console.error("Error fetching maintenance data:", error);
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

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from("maintenance_assets").insert([
                {
                    asset_name: formData.asset_name,
                    branch_id: formData.branch_id || null,
                    last_maintenance: formData.last_maintenance,
                    next_maintenance: formData.next_maintenance || null,
                    status: formData.status,
                    technician: formData.technician
                }
            ]);

            if (error) throw error;

            setShowAddModal(false);
            setFormData({
                asset_name: '',
                branch_id: profile?.branch_id || '',
                last_maintenance: new Date().toISOString().split('T')[0],
                next_maintenance: '',
                status: 'scheduled',
                technician: ''
            });
            fetchData();
        } catch (error) {
            console.error("Error adding asset:", error);
            alert("Gagal menambahkan aset. Pastikan tabel database sudah dibuat.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTasks = (tasks || []).filter(t => 
        (t.asset_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.branch_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        urgent: (tasks || []).filter(t => t.status === 'urgent').length,
        scheduled: (tasks || []).filter(t => t.status === 'scheduled').length,
        done: (tasks || []).filter(t => t.status === 'done').length
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={['owner', 'spv', 'admin']}>
                <div className="space-y-10 pb-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Wrench className="text-blue-600" /> Maintenance Alat
                            </h2>
                            <p className="text-slate-500 mt-1 font-medium">Monitoring jadwal perawatan berkala aset dan peralatan bengkel.</p>
                        </div>
                        <Button 
                            onClick={() => setShowAddModal(true)}
                            className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-blue-600 shadow-xl shadow-slate-200 text-white font-black uppercase tracking-widest transition-all"
                        >
                            <Plus size={20} className="mr-2" /> Tambah Aset
                        </Button>
                    </div>

                    {/* Quick Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 border-none shadow-xl bg-rose-50 border-b-4 border-rose-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white text-rose-600 rounded-2xl shadow-sm">
                                    <AlertTriangle size={24} />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-rose-900 italic tracking-tighter">{stats.urgent}</p>
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mt-1">Perlu Servis Segera</p>
                        </Card>
                        <Card className="p-8 border-none shadow-xl bg-amber-50 border-b-4 border-amber-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white text-amber-600 rounded-2xl shadow-sm">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-amber-900 italic tracking-tighter">{stats.scheduled}</p>
                            <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mt-1">Terjadwal</p>
                        </Card>
                        <Card className="p-8 border-none shadow-xl bg-emerald-50 border-b-4 border-emerald-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm">
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-emerald-900 italic tracking-tighter">{stats.done}</p>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1">Aset Kondisi Baik</p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Maintenance Schedule Table */}
                        <Card className="xl:col-span-2 border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                                        <Calendar size={20} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Jadwal Perawatan</h3>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Cari alat..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-10 pl-10 pr-4 bg-slate-100 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-48 transition-all" 
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Aset / Alat</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cabang</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Servis</th>
                                            <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center">
                                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                                    <p className="text-slate-400 font-medium italic">Memuat data aset...</p>
                                                </td>
                                            </tr>
                                        ) : filteredTasks.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center">
                                                    <p className="text-slate-400 font-medium italic">Tidak ada data aset ditemukan.</p>
                                                </td>
                                            </tr>
                                        ) : filteredTasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-slate-50/50 transition-all group">
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-slate-900 uppercase tracking-tight">{task.asset_name || "Aset Tanpa Nama"}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Terakhir: {task.last_maintenance ? new Date(task.last_maintenance).toLocaleDateString('id-ID') : '-'}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase">{task.branch_name || "General"}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-slate-900 italic tracking-tighter">{task.next_maintenance ? new Date(task.next_maintenance).toLocaleDateString('id-ID') : '-'}</p>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                                                        task.status === 'urgent' ? 'bg-rose-100 text-rose-600' : 
                                                        task.status === 'scheduled' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                    )}>
                                                        {task.status || 'Scheduled'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button className="p-2 hover:bg-white rounded-xl transition-all shadow-sm group-hover:text-blue-600"><ChevronRight size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Recent History / Log */}
                        <Card className="border-none shadow-2xl bg-slate-900 p-8 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-white/10 rounded-2xl">
                                        <History size={24} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-xl font-black italic tracking-tight">Log Maintenance</h3>
                                </div>
                                <div className="space-y-6">
                                    {(logs || []).length === 0 ? (
                                        <p className="text-[10px] text-slate-500 italic">Belum ada riwayat maintenance.</p>
                                    ) : logs.map((log) => {
                                        const assetName = (Array.isArray(log.maintenance_assets) ? log.maintenance_assets[0]?.asset_name : log.maintenance_assets?.asset_name) || 'Asset';
                                        return (
                                            <div key={log.id} className="flex gap-4 group cursor-pointer">
                                                <div className={cn(
                                                    "w-1 h-12 rounded-full shrink-0",
                                                    log.status === 'Optimal' ? 'bg-emerald-500' : 'bg-blue-500'
                                                )} />
                                                <div>
                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                                                        {log.maintenance_date ? new Date(log.maintenance_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                                    </p>
                                                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {assetName} - {log.description || 'No description'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">Oleh: {log.technician || 'Staff'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button className="w-full mt-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">Lihat Seluruh Log</button>
                            </div>
                            <Wrench size={300} className="absolute -right-20 -bottom-20 text-white/5" />
                        </Card>
                    </div>
                </div>

                {/* Modal Tambah Aset */}
                <AnimatePresence>
                    {showAddModal && (
                        <>
                            <motion.div
                                key="modal-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAddModal(false)}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
                            />
                            <motion.div
                                key="modal-content"
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-6"
                            >
                                <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                    {/* Modal Header */}
                                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shrink-0 relative overflow-hidden">
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                                    <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm">
                                                        <Plus size={22} className="text-blue-400" />
                                                    </div>
                                                    Tambah Aset Baru
                                                </h3>
                                                <p className="text-slate-400 text-sm font-medium mt-2 ml-[52px]">
                                                    Daftarkan peralatan workshop untuk monitoring berkala.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddModal(false)}
                                                className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <Wrench size={100} className="absolute -right-10 -top-10 text-white/5 rotate-12" />
                                    </div>

                                    {/* Modal Body - Scrollable */}
                                    <div className="overflow-y-auto flex-1 p-8">
                                        <form id="asset-form" onSubmit={handleAddAsset} className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Aset / Alat</label>
                                                <div className="relative">
                                                    <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Contoh: Kompresor Krisbow 5HP"
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all"
                                                        value={formData.asset_name}
                                                        onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Awal</label>
                                                    <div className="relative">
                                                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                        <select
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer"
                                                            value={formData.status}
                                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                            required
                                                        >
                                                            <option value="scheduled">Scheduled</option>
                                                            <option value="urgent">Urgent</option>
                                                            <option value="done">Done</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terakhir Servis</label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                        <input
                                                            type="date"
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all"
                                                            value={formData.last_maintenance}
                                                            onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Next Servis</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                        <input
                                                            type="date"
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all"
                                                            value={formData.next_maintenance}
                                                            onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teknisi Penanggung Jawab</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Nama teknisi..."
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-11 pr-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 focus:outline-none focus:bg-white transition-all"
                                                        value={formData.technician}
                                                        onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="p-6 bg-slate-50/80 border-t border-slate-100 shrink-0">
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddModal(false)}
                                                className="flex-1 py-4 px-6 rounded-2xl bg-white text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 border border-slate-200 transition-all active:scale-[0.98]"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                form="asset-form"
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
                                                        <CheckCircle2 size={16} /> Simpan Aset
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
            </RoleGuard>
        </DashboardLayout>
    );
}
