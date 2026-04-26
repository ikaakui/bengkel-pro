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
    Receipt, Loader2, Calendar, MapPin, Wrench,
    FileText, Search, CreditCard, ChevronRight,
    ArrowRight, Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PembayaranPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("bookings");

    useEffect(() => {
        if (!profile?.id) return;
        
        let mounted = true;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchPromise = supabase
                    .from("bookings")
                    .select("*, branches:branch_id(name)")
                    .eq("member_id", profile.id)
                    .order("created_at", { ascending: false });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Pembayaran fetch timeout (15s)")), 15000)
                );

                const { data: bookingData, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
                
                if (!mounted) return;
                
                if (error) throw error;
                if (bookingData) setBookings(bookingData);
            } catch (err: any) {
                if (!mounted) return;
                console.error("Pembayaran fetch error:", err?.message || err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        
        return () => {
            mounted = false;
        };
    }, [profile?.id, supabase]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-5xl mx-auto space-y-8 pb-20">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Konfirmasi Bayar Booking</h1>
                            <p className="text-slate-500 mt-1">Kelola bukti pembayaran dan invoice booking Anda.</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
                            <button 
                                onClick={() => setActiveTab("bookings")}
                                className={cn(
                                    "flex-1 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    activeTab === "bookings" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Booking Aktif
                            </button>
                            <button 
                                onClick={() => setActiveTab("history")}
                                className={cn(
                                    "flex-1 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    activeTab === "history" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Riwayat Bayar
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <Loader2 size={40} className="animate-spin text-primary mb-4" />
                            <p className="text-slate-400 font-medium">Memuat data...</p>
                        </div>
                    ) : activeTab === "bookings" ? (
                        <div className="space-y-4">
                            {bookings.length === 0 ? (
                                <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                        <Calendar size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-400">Belum ada booking aktif</h3>
                                    <p className="text-slate-400 mt-2 mb-8">Silakan buat jadwal servis terlebih dahulu.</p>
                                    <Button onClick={() => router.push("/booking-online")} className="rounded-2xl h-12 px-8 font-bold">
                                        BOOKING SEKARANG
                                    </Button>
                                </div>
                            ) : (
                                bookings.map((b, i) => (
                                    <motion.div 
                                        key={b.id} 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card className="p-0 overflow-hidden border-slate-100 group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 rounded-[2rem]">
                                            <div className="flex flex-col md:flex-row md:items-stretch">
                                                <div className="p-6 md:p-8 flex-1">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg shadow-slate-200">
                                                                <FileText size={28} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">KODE BOOKING</p>
                                                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-black font-mono px-3">
                                                                        {b.booking_code}
                                                                    </Badge>
                                                                </div>
                                                                <h3 className="text-xl font-black text-slate-900 uppercase">{b.car_model}</h3>
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                                                                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {formatDate(b.service_date)}</span>
                                                                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary" /> {b.service_time} WIB</span>
                                                                    <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> {b.branches?.name}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">Status</p>
                                                            <Badge 
                                                                className={cn(
                                                                    "px-4 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-widest",
                                                                    b.status === "pending" ? "bg-amber-100 text-amber-700" :
                                                                    b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                                                                    b.status === "processing" ? "bg-blue-100 text-blue-700" :
                                                                    b.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                                )}
                                                            >
                                                                {b.status === 'confirmed' ? 'Dikonfirmasi (DP OK)' : b.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link 
                                                    href={`/booking-online/invoice/${b.booking_code}`}
                                                    className="bg-slate-50 hover:bg-primary hover:text-white border-t md:border-t-0 md:border-l border-slate-100 p-6 md:w-48 flex flex-col items-center justify-center gap-2 transition-all group/btn"
                                                >
                                                    <Receipt size={24} className="group-hover/btn:scale-110 transition-transform" />
                                                    <span className="text-xs font-black uppercase tracking-widest">Lihat Konfirmasi</span>
                                                    <ArrowRight size={16} className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                                </Link>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                    <Receipt size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-400">Riwayat pembayaran belum tersedia</h3>
                                <p className="text-slate-400 mt-2">Data transaksi akan muncul setelah unit selesai diservis.</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Info Card */}
                    <Card className="bg-primary/5 border-primary/10 rounded-[2rem] p-8">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10 shrink-0">
                                <AlertCircle size={24} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Informasi Invoice</h4>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    Invoice booking adalah bukti reservasi Anda. Untuk mengunci jadwal, Anda <strong>wajib mentransfer Booking Fee / DP</strong> ke rekening yang tertera di invoice dan mengirimkan buktinya melalui WhatsApp admin. Sisa pembayaran dilakukan di kasir setelah pengerjaan selesai.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
