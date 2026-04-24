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
    Tool,
    Settings,
    History
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceTask {
    id: string;
    asset_name: string;
    branch: string;
    last_maintenance: string;
    next_maintenance: string;
    status: 'urgent' | 'scheduled' | 'done';
    technician?: string;
}

export default function MaintenancePage() {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<MaintenanceTask[]>([
        { id: '1', asset_name: 'Kompresor Krisbow 5HP', branch: 'Depok', last_maintenance: '2024-03-10', next_maintenance: '2024-04-10', status: 'urgent' },
        { id: '2', asset_name: 'Two Post Lift A', branch: 'BSD', last_maintenance: '2024-02-15', next_maintenance: '2024-05-15', status: 'scheduled' },
        { id: '3', asset_name: 'Scanner OBD II Pro', branch: 'Depok', last_maintenance: '2024-04-01', next_maintenance: '2024-07-01', status: 'done' },
        { id: '4', asset_name: 'Impact Wrench Cordless', branch: 'BSD', last_maintenance: '2024-03-20', next_maintenance: '2024-04-20', status: 'scheduled' },
    ]);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

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
                        <Button className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-blue-600 shadow-xl shadow-slate-200 text-white font-black uppercase tracking-widest transition-all">
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
                            <p className="text-4xl font-black text-rose-900 italic tracking-tighter">1</p>
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mt-1">Perlu Servis Segera</p>
                        </Card>
                        <Card className="p-8 border-none shadow-xl bg-amber-50 border-b-4 border-amber-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white text-amber-600 rounded-2xl shadow-sm">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-amber-900 italic tracking-tighter">2</p>
                            <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mt-1">Terjadwal Bulan Ini</p>
                        </Card>
                        <Card className="p-8 border-none shadow-xl bg-emerald-50 border-b-4 border-emerald-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm">
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-emerald-900 italic tracking-tighter">12</p>
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
                                    <input type="text" placeholder="Cari alat..." className="h-10 pl-10 pr-4 bg-slate-100 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-48 transition-all" />
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
                                        {tasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-slate-50/50 transition-all group">
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-slate-900 uppercase tracking-tight">{task.asset_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Terakhir: {new Date(task.last_maintenance).toLocaleDateString('id-ID')}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase">{task.branch}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-slate-900 italic tracking-tighter">{new Date(task.next_maintenance).toLocaleDateString('id-ID')}</p>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                                                        task.status === 'urgent' ? 'bg-rose-100 text-rose-600' : 
                                                        task.status === 'scheduled' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                    )}>
                                                        {task.status}
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
                                    <div className="flex gap-4 group cursor-pointer">
                                        <div className="w-1 h-12 bg-emerald-500 rounded-full shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Kemarin, 15:30</p>
                                            <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Servis Berkala Lift B Selesai</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Oleh: Teknisi BSD</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 group cursor-pointer">
                                        <div className="w-1 h-12 bg-blue-500 rounded-full shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">02 Apr 2024</p>
                                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Kalibrasi Scanner OBD II</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Status: Optimal</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 group cursor-pointer">
                                        <div className="w-1 h-12 bg-rose-500 rounded-full shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">28 Mar 2024</p>
                                            <p className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">Penggantian Oli Kompresor</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Cabang Depok</p>
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full mt-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">Lihat Seluruh Log</button>
                            </div>
                            <Wrench size={300} className="absolute -right-20 -bottom-20 text-white/5" />
                        </Card>
                    </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
