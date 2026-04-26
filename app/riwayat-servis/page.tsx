"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Clock, Car, Search, Loader2, Calendar, MapPin, Wrench,
    Receipt, Star, X, Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";

export default function RiwayatServisPage() {
    const { profile } = useAuth();
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedService, setSelectedService] = useState<any>(null);
    const [totalStats, setTotalStats] = useState({ count: 0, spent: 0, points: 0 });

    useEffect(() => {
        if (!profile?.id) return;
        
        let mounted = true;
        
        const fetch = async () => {
            setLoading(true);
            try {
                const fetchPromise = supabase
                    .from("transactions")
                    .select("id, total, status, created_at, customer_name, car_type, license_plate, payment_method, branch:branch_id(name)")
                    .eq("member_id", profile.id)
                    .order("created_at", { ascending: false });
                
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Riwayat fetch timeout")), 15000)
                );

                const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
                
                if (!mounted) return;
                
                if (error) throw error;
                if (data) {
                    setServices(data as any[]);
                    const paid = data.filter((s: any) => s.status === "Paid");
                    setTotalStats({
                        count: paid.length,
                        spent: paid.reduce((a: number, s: any) => a + (Number(s.total) || 0), 0),
                        points: profile.total_points || 0
                    });
                }
            } catch (err) {
                if (!mounted) return;
                console.error("Riwayat fetch error:", err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        fetch();
        
        return () => {
            mounted = false;
        };
    }, [profile?.id, profile?.total_points, supabase]);

    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const filtered = services.filter(s => {
        const q = searchQuery.toLowerCase();
        const matchQ = (s.car_type || '').toLowerCase().includes(q) || (s.license_plate || '').toLowerCase().includes(q);
        return matchQ && (filterStatus === 'all' || s.status === filterStatus);
    });

    const sc: Record<string, { label: string; variant: string }> = {
        'Paid': { label: 'Selesai', variant: 'success' },
        'Draft': { label: 'Draft', variant: 'warning' },
        'Cancelled': { label: 'Batal', variant: 'danger' },
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Riwayat Servis</h1>
                        <p className="text-slate-500 mt-1">Semua catatan servis kendaraan Anda di Inka Otoservice.</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Servis', value: totalStats.count, suf: 'kali', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
                            { label: 'Total Pengeluaran', value: fmt(totalStats.spent), suf: '', icon: Receipt, color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Poin Didapat', value: totalStats.points.toLocaleString(), suf: 'PTS', icon: Star, color: 'text-amber-600 bg-amber-50' },
                        ].map(st => (
                            <Card key={st.label} className="border-slate-100 flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", st.color)}>
                                    <st.icon size={22} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{st.label}</p>
                                    <p className="text-xl font-black text-slate-900">{st.value}</p>
                                    {st.suf && <p className="text-[10px] text-slate-400 font-bold">{st.suf}</p>}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Search + Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Cari kendaraan, plat nomor..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-medium"
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'Paid', 'Draft'].map(s => (
                                <button key={s} onClick={() => setFilterStatus(s)}
                                    className={cn("px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2",
                                        filterStatus === s ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                                    )}>
                                    {s === 'all' ? 'Semua' : s === 'Paid' ? 'Selesai' : 'Draft'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 size={40} className="animate-spin text-slate-300" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                            <Car className="mx-auto mb-3 text-slate-300" size={48} />
                            <p className="text-lg font-bold text-slate-400">Belum ada riwayat servis</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map((svc, i) => {
                                const cfg = sc[svc.status] || sc['Draft'];
                                return (
                                    <motion.div key={svc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                        <Card className="p-0 overflow-hidden border-slate-100 group hover:shadow-xl transition-shadow">
                                            <div className="flex flex-col sm:flex-row items-stretch">
                                                <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Car size={28} /></div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-bold text-lg text-slate-900">{svc.car_type || 'Kendaraan'}</h4>
                                                                <Badge variant="neutral" className="text-xs font-mono">{svc.license_plate || '-'}</Badge>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                                <span className="flex items-center gap-1"><Calendar size={12} />{new Date(svc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                                {(svc.branch as any)?.name && <span className="flex items-center gap-1"><MapPin size={12} />{(svc.branch as any).name}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 sm:gap-6">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                                                            <p className="text-xl font-black text-slate-900">{fmt(svc.total || 0)}</p>
                                                        </div>
                                                        <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 border-t sm:border-t-0 sm:border-l border-slate-100 p-4 flex items-center justify-center">
                                                    <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1" onClick={() => setSelectedService(svc)}>
                                                        <Eye size={14} />DETAIL
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedService && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Receipt className="text-primary" size={20} />Detail Servis</h3>
                                    <button onClick={() => setSelectedService(null)} className="p-2 hover:bg-slate-200 rounded-xl"><X size={20} className="text-slate-400" /></button>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kendaraan</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">{selectedService.car_type || '-'}</p>
                                            <p className="text-xs text-slate-500 font-mono">{selectedService.license_plate || '-'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cabang</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">{(selectedService.branch as any)?.name || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Servis</p>
                                        <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                            <Calendar size={14} className="text-slate-400" />
                                            {new Date(selectedService.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Total Biaya</p>
                                                <p className="text-3xl font-black text-slate-900 mt-1">{fmt(selectedService.total || 0)}</p>
                                            </div>
                                            <Badge variant={(sc[selectedService.status]?.variant as any) || 'neutral'}>{sc[selectedService.status]?.label || selectedService.status}</Badge>
                                        </div>
                                        {selectedService.payment_method && <p className="text-xs text-slate-500 mt-2">Pembayaran: {selectedService.payment_method}</p>}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 border-t border-slate-100">
                                    <Button variant="outline" className="w-full h-12 rounded-2xl font-bold" onClick={() => setSelectedService(null)}>Tutup</Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </RoleGuard>
        </DashboardLayout>
    );
}
