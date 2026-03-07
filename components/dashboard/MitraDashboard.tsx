import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
    Users,
    Wallet,
    Link as LinkIcon,
    TrendingUp,
    Clock,
    UserPlus,
    Loader2
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function MitraDashboard() {
    const { profile } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalReferrals: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        recentIncrease: 0
    });
    const [referrals, setReferrals] = useState<any[]>([]);
    const [commissionRate, setCommissionRate] = useState(5);

    const fetchData = useCallback(async () => {
        if (!profile?.id) return;
        setLoading(true);

        try {
            // Concurrent fetch for maximum responsiveness
            const [
                { data: settings },
                { data: bookings },
                { data: withdrawals }
            ] = await Promise.all([
                supabase.from("app_settings").select("value").eq("key", "commission_rate").single(),
                supabase.from("bookings").select("*").eq("mitra_id", profile.id).order("created_at", { ascending: false }),
                supabase.from("withdrawals").select("*").eq("mitra_id", profile.id)
            ]);

            const rate = settings ? Number(settings.value) : 5;
            setCommissionRate(rate);

            if (bookings) {
                const total = bookings.length;
                const completed = bookings.filter(b => b.status === 'completed');
                const pending = bookings.filter(b => b.status === 'pending' || b.status === 'processing');

                // Commission logic (example: 10% of 500k base service if not specified in booking)
                // In real app, we should use transaction total if available
                const paidComm = withdrawals
                    ?.filter(w => w.status === 'approved')
                    .reduce((acc, w) => acc + Number(w.amount), 0) || 0;

                // Simple estimate for display
                const estPending = pending.length * 500000 * (rate / 100);

                setStats({
                    totalReferrals: total,
                    paidCommissions: paidComm,
                    pendingCommissions: estPending,
                    recentIncrease: bookings.filter(b => {
                        const d = new Date(b.created_at);
                        const now = new Date();
                        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    }).length
                });

                setReferrals(bookings.slice(0, 5));
            }
        } catch (err) {
            console.error("Error fetching mitra dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, [profile?.id, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading && !profile) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-10">
            {/* Welcome Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 ">Halo, {profile?.full_name?.split(' ')[0] || 'Mitra'}! 👋</h2>
                    <p className="text-slate-500 mt-1">Pantau performa dan komisi Anda hari ini.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="primary"
                        onClick={() => router.push('/bookings-mitra')}
                        className="shadow-lg shadow-primary/20"
                    >
                        <UserPlus size={18} className="mr-2" />
                        Booking Baru
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg shadow-blue-200">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Users size={24} />
                        </div>
                        {stats.recentIncrease > 0 && <Badge className="bg-white/20 border-0 text-white">+{stats.recentIncrease} minggu ini</Badge>}
                    </div>
                    <div className="mt-6">
                        <p className="text-blue-100/80 text-sm font-medium">Total Referral</p>
                        <p className="text-3xl font-black mt-1">{stats.totalReferrals} Pelanggan</p>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-200">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Wallet size={24} />
                        </div>
                        <TrendingUp size={20} className="text-emerald-200" />
                    </div>
                    <div className="mt-6">
                        <p className="text-emerald-100/80 text-sm font-medium">Komisi Sudah Cair</p>
                        <p className="text-3xl font-black mt-1">{formatPrice(stats.paidCommissions)}</p>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0 shadow-lg shadow-amber-200">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">Estimasi</span>
                    </div>
                    <div className="mt-6">
                        <p className="text-amber-50 rounded-lg text-sm font-medium">Komisi Pending (Proses)</p>
                        <p className="text-3xl font-black mt-1">{formatPrice(stats.pendingCommissions)}</p>
                    </div>
                </Card>
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Referrals Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="text-primary" size={24} />
                            Referral Terbaru
                        </h3>
                        <button
                            onClick={() => router.push('/bookings-mitra')}
                            className="text-sm font-bold text-primary hover:underline"
                        >
                            Lihat Semua
                        </button>
                    </div>

                    <Card className="p-0 overflow-hidden border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Pelanggan</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {referrals.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">
                                                Belum ada data referral.
                                            </td>
                                        </tr>
                                    ) : (
                                        referrals.map((ref) => (
                                            <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900 break-words line-clamp-2">{ref.customer_name}</p>
                                                    <p className="text-xs text-slate-500 break-words">{ref.car_model} • {ref.license_plate}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={
                                                        ref.status === 'completed' ? 'success' :
                                                            ref.status === 'processing' ? 'info' :
                                                                ref.status === 'cancelled' ? 'danger' : 'warning'
                                                    }>
                                                        {ref.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {new Date(ref.created_at).toLocaleDateString('id-ID')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <LinkIcon size={120} />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Kode Referral Anda</h3>
                        <div className="mb-6">
                            <div className="bg-white p-3 rounded-xl border border-primary/20 flex items-center justify-between group">
                                <code className="text-primary font-black tracking-widest text-lg">{profile?.referral_code || 'BELUM ADA'}</code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (profile?.referral_code) {
                                            navigator.clipboard.writeText(profile.referral_code);
                                            alert("Kode disalin!");
                                        }
                                    }}
                                    className="h-8 w-8 p-0"
                                >
                                    <LinkIcon size={16} />
                                </Button>
                            </div>
                        </div>

                        <h3 className="font-bold text-sm mb-2 opacity-60">Cara Kerja:</h3>
                        <ul className="space-y-3 text-sm text-slate-600 relative z-10">
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0">1</span>
                                Berikan kode referral ke pelanggan.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0">2</span>
                                Mereka melakukan servis di workshop.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0">3</span>
                                Dapatkan komisi {commissionRate}% setelah selesai!
                            </li>
                        </ul>
                    </Card>

                    <Card className="border-slate-200 flex flex-col">
                        <h3 className="font-bold text-lg mb-3">Penarikan Komisi</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-1">
                            Pastikan data rekening bank Anda sudah benar di pengaturan untuk kelancaran pembayaran komisi.
                        </p>
                        <div className="mt-auto flex justify-center">
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => router.push('/settings/bank')}
                            >
                                Buka Pengaturan Rekening
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
