"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import {
    ClipboardList,
    Clock,
    UserCheck,
    AlertCircle,
    CheckCircle2,
    Activity,
    Users
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function AdminOperationsPage() {
    const [loading, setLoading] = useState(true);
    const [activeBookings, setActiveBookings] = useState<any[]>([]);
    const [activeStaff, setActiveStaff] = useState<any[]>([]);

    const { role, profile } = useAuth();
    const supabase = createClient();

    const fetchOpsData = async () => {
        setLoading(true);
        try {
            const branchId = profile?.branch_id;
            if (!branchId) return;

            const [
                { data: bookings },
                { data: staff }
            ] = await Promise.all([
                supabase.from("bookings")
                    .select("*")
                    .eq("branch_id", branchId)
                    .in("status", ["pending", "in_progress", "ready"])
                    .order("created_at", { ascending: false }),
                supabase.from("profiles")
                    .select("*")
                    .eq("branch_id", branchId)
                    .eq("role", "staff")
            ]);

            setActiveBookings(bookings || []);
            setActiveStaff(staff || []);

        } catch (error) {
            console.error("Error fetching admin operations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role && ['admin', 'spv', 'admin_depok', 'admin_bsd'].includes(role)) fetchOpsData();
    }, [role]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 mt-4 font-medium italic">memonitor antrean workshop...</p>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={['admin', 'spv', 'admin_depok', 'admin_bsd']}>
                <div className="space-y-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600" /> Operasional Live
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">Monitoring pengerjaan servis dan ketersediaan teknisi.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Live Queue Table */}
                    <Card className="lg:col-span-2 border-none shadow-2xl bg-white p-0 overflow-hidden ring-1 ring-slate-100">
                        <div className="p-8 border-b border-slate-50 bg-blue-50/20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-50">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Antrean Aktif</h3>
                                    <p className="text-xs text-slate-500 font-medium">Unit yang sedang atau akan dikerjakan.</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {activeBookings.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 italic font-medium">Tidak ada antrean aktif saat ini.</div>
                            ) : (
                                activeBookings.map((b) => (
                                    <div key={b.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-2 h-10 rounded-full",
                                                b.status === 'in_progress' ? 'bg-blue-500' : b.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500'
                                            )} />
                                            <div>
                                                <p className="font-black text-slate-900 uppercase tracking-tight">{b.customer_name} — {b.vehicle_plate}</p>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{b.service_type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-900 uppercase">{b.status.replace('_', ' ')}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(b.created_at).toLocaleTimeString()}</p>
                                            </div>
                                            <button className="p-2 hover:bg-white rounded-xl transition-all"><Activity size={18} className="text-slate-200 hover:text-blue-600" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Staff Status */}
                    <Card className="border-none shadow-2xl bg-white p-8 ring-1 ring-slate-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Kehadiran Teknisi</h3>
                        </div>
                        <div className="space-y-6">
                            {activeStaff.map((s) => (
                                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100 uppercase font-black text-xs">
                                            {s.full_name.charAt(0)}
                                        </div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">{s.full_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
