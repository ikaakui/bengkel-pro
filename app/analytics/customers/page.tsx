"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
    Users,
    RotateCcw,
    Clock,
    Wrench,
    TrendingUp,
    Timer
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function CustomerAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [retentionStats, setRetentionStats] = useState({ new: 0, repeat: 0 });
    const [avgServiceTime, setAvgServiceTime] = useState({ value: 0, label: '0m' });
    const [bestServices, setBestServices] = useState<any[]>([]);

    const { role } = useAuth();
    const supabase = createClient();

    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            const { data: allBookings } = await supabase
                .from("bookings")
                .select("customer_phone, status, created_at, updated_at, service_type, service");

            if (allBookings) {
                // Retention
                const phoneCounts = new Map<string, number>();
                allBookings.forEach(b => {
                    if (b.customer_phone) phoneCounts.set(b.customer_phone, (phoneCounts.get(b.customer_phone) || 0) + 1);
                });
                const totalCustomers = phoneCounts.size || 1;
                const repeatCustomers = Array.from(phoneCounts.values()).filter(count => count > 1).length;
                setRetentionStats({ new: totalCustomers - repeatCustomers, repeat: repeatCustomers });

                // Avg Service Time
                const completed = allBookings.filter(b => b.status === "completed");
                const serviceTimesInMs = completed
                    .map(b => new Date(b.updated_at).getTime() - new Date(b.created_at).getTime())
                    .filter(t => t > 0);
                const avgMs = serviceTimesInMs.length > 0 ? serviceTimesInMs.reduce((a, b) => a + b, 0) / serviceTimesInMs.length : 0;
                const avgMinutes = Math.round(avgMs / 60000);
                setAvgServiceTime({
                    value: avgMinutes,
                    label: avgMinutes > 60 ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m` : `${avgMinutes}m`
                });

                // Best Selling Services (Simulated/Calculated)
                const sCounts = new Map<string, number>();
                allBookings.forEach(b => {
                    const svc = b.service_type || b.service || 'Lainnya';
                    sCounts.set(svc, (sCounts.get(svc) || 0) + 1);
                });
                const colors = ['#2563eb', '#059669', '#7c3aed', '#f59e0b', '#ef4444'];
                setBestServices(Array.from(sCounts.entries())
                    .map(([name, count], i) => ({ name, count, color: colors[i % colors.length] }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5));
            }

        } catch (error) {
            console.error("Error fetching customer analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'owner') fetchCustomerData();
    }, [role]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 mt-4 font-medium italic">menganalisa kebiasaan pelanggan...</p>
            </div>
        );
    }

    const totalC = retentionStats.new + retentionStats.repeat;
    const repeatPct = Math.round((retentionStats.repeat / (totalC || 1)) * 100);

    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <RotateCcw className="text-purple-600" /> Retensi & Layanan
                </h2>
                <p className="text-slate-500 mt-1 font-medium">Analisa kesetiaan pelanggan dan efisiensi durasi servis.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Retention Card */}
                <Card className="border-none shadow-2xl bg-white p-8 relative overflow-hidden ring-1 ring-slate-100">
                    <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shadow-inner">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Customer Retention</h3>
                            <p className="text-sm text-slate-500 font-medium">Rasio pelanggan baru vs pelanggan setia.</p>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-5xl font-black text-purple-600 tracking-tighter italic">{repeatPct}%</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Repeat Customer Rate</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{totalC}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Total Database Pelanggan</p>
                            </div>
                        </div>

                        <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden flex p-1 border border-slate-100 shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${100 - repeatPct}%` }}
                                className="h-full bg-emerald-500 rounded-l-full"
                            />
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${repeatPct}%` }}
                                className="h-full bg-purple-500 rounded-r-full"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-glow" />
                                <div>
                                    <p className="text-xs font-black text-slate-900">{retentionStats.new}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Pelanggan Baru</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-glow" />
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-900">{retentionStats.repeat}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Pelanggan Tetap</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <RotateCcw size={180} className="absolute -right-12 -bottom-12 text-slate-50 opacity-50" />
                </Card>

                {/* Avg Service Time Card */}
                <Card className="border-none shadow-2xl bg-white p-8 flex flex-col justify-between ring-1 ring-slate-100">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Average Service Time</h3>
                            <p className="text-sm text-slate-500 font-medium">Rata-rata durasi pengerjaan mobil.</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-6 pt-10 pb-10">
                        <div className="relative">
                            <div className="w-48 h-48 rounded-full border-8 border-slate-50 flex flex-col items-center justify-center bg-white shadow-xl relative z-10">
                                <Timer size={40} className="text-blue-200 mb-2" />
                                <h4 className="text-4xl font-black text-blue-600 italic tracking-tighter">{avgServiceTime.label}</h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">{avgServiceTime.value} Menit</p>
                            </div>
                            <motion.div
                                className="absolute inset-0 border-8 border-blue-500 rounded-full"
                                initial={{ rotate: 0 }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)' }}
                            />
                        </div>

                        <div className="max-w-xs text-center">
                            <p className="text-sm text-slate-600 font-bold leading-relaxed">
                                {avgServiceTime.value < 45
                                    ? "Proses pengerjaan sangat efisien! Pertahankan standar kecepatan ini. 🏁"
                                    : "Waktu pengerjaan cukup lama. Pertimbangkan untuk menambah personil atau alat pendukung. ⏳"}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Best Selling Services */}
            <Card className="border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-inner">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Layanan Terpopuler</h3>
                            <p className="text-sm text-slate-500 font-medium">Daftar jasa yang paling banyak diminati pelanggan.</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 space-y-8">
                    {bestServices.map((service, i) => (
                        <div key={service.name} className="space-y-3">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-200 group-hover:text-blue-600/20 transition-colors">0{i + 1}</span>
                                    <span className="text-sm sm:text-lg font-black text-slate-800 uppercase tracking-tight">{service.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-slate-900 italic">{service.count}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">Unit</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(service.count / Math.max(...bestServices.map(s => s.count))) * 100}%` }}
                                    transition={{ duration: 1.5, delay: i * 0.1 }}
                                    className="h-full rounded-full shadow-glow"
                                    style={{ backgroundColor: service.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
