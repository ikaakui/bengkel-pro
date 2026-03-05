"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    Wallet, ArrowUpRight, History, CreditCard, AlertCircle,
    Loader2, CheckCircle2, Clock, ArrowRight, Car, Banknote,
    ChevronRight, CircleDot, RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";

// Status step config
const STATUS_STEPS = [
    { key: 'pending', label: 'Booking Masuk', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
    { key: 'processing', label: 'Sedang Dikerjakan', icon: Car, color: 'text-blue-500', bg: 'bg-blue-100' },
    { key: 'completed', label: 'Selesai', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { key: 'withdraw', label: 'Komisi Bisa Ditarik', icon: Banknote, color: 'text-primary', bg: 'bg-primary/10' },
];

export default function CommissionsPage() {
    const { profile } = useAuth();
    const supabase = createClient();

    const [bookings, setBookings] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [commissionRate, setCommissionRate] = useState(5);
    const [isLoading, setIsLoading] = useState(true);
    const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);

        // Fetch commission rate
        const { data: settings } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "commission_rate")
            .single();
        if (settings) setCommissionRate(Number(settings.value));

        // Fetch bookings for this mitra
        const { data: bkData } = await supabase
            .from("bookings")
            .select("*")
            .order("created_at", { ascending: false });
        if (bkData) setBookings(bkData);

        // Fetch withdrawals for this mitra
        const { data: wdData } = await supabase
            .from("withdrawals")
            .select("*")
            .order("created_at", { ascending: false });
        if (wdData) setWithdrawals(wdData);

        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [profile]);

    // Calculate commission values
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'processing');

    // For demo: assume each completed booking generates a fixed commission value
    // In real app, this would be tied to invoice amounts
    const DEMO_BOOKING_VALUE = 500000; // Rp 500.000 average service value
    const totalEarnings = completedBookings.length * DEMO_BOOKING_VALUE * (commissionRate / 100);
    const pendingCommission = pendingBookings.length * DEMO_BOOKING_VALUE * (commissionRate / 100);
    const totalWithdrawn = withdrawals
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0);
    const readyToWithdraw = Math.max(0, totalEarnings - totalWithdrawn);

    // Count bookings per status for the interactive flow
    const statusCounts = {
        pending: bookings.filter(b => b.status === 'pending').length,
        processing: bookings.filter(b => b.status === 'processing').length,
        completed: completedBookings.length,
        withdraw: readyToWithdraw > 0 ? 1 : 0,
    };

    const handleWithdraw = async () => {
        if (readyToWithdraw <= 0) {
            alert("Tidak ada saldo yang bisa ditarik.");
            return;
        }

        if (!profile) {
            alert("Sesi tidak valid.");
            return;
        }

        setIsWithdrawing(true);
        const { error } = await supabase.from("withdrawals").insert([{
            mitra_id: profile.id,
            amount: readyToWithdraw,
            status: 'pending',
            notes: `Penarikan komisi ${new Date().toLocaleDateString('id-ID')}`
        }]);

        setIsWithdrawing(false);

        if (error) {
            alert(`Gagal mengajukan penarikan: ${error.message}`);
        } else {
            alert("✅ Permintaan penarikan komisi berhasil dikirim! Owner akan memproses dalam 1-3 hari kerja.");
            setShowWithdrawPopup(false);
            fetchData();
        }
    };

    const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-slate-300" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "mitra"]}>
                <div className="space-y-8 pb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Earnings & Commissions</h2>
                            <p className="text-slate-500 mt-1">Pantau penghasilan anda dari setiap referensi.</p>
                        </div>
                        <Button variant="outline" onClick={fetchData} className="h-12 px-4" title="Refresh Data">
                            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                        </Button>
                    </div>

                    {/* === INTERACTIVE STATUS FLOW === */}
                    <Card className="p-0 overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CircleDot size={20} className="text-primary" />
                                Alur Status Booking → Komisi
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Lihat perjalanan booking dari masuk hingga komisi bisa ditarik.</p>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-0">
                                {STATUS_STEPS.map((step, idx) => {
                                    const Icon = step.icon;
                                    const count = statusCounts[step.key as keyof typeof statusCounts];
                                    const isActive = count > 0;
                                    return (
                                        <div key={step.key} className="flex flex-col md:flex-row items-center flex-1 gap-3 md:gap-0">
                                            <div className={`flex flex-col items-center text-center flex-1 group transition-all duration-300 ${isActive ? '' : 'opacity-40'}`}>
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isActive ? step.bg : 'bg-slate-100'} transition-all duration-300 ${isActive ? 'shadow-lg scale-110' : ''}`}>
                                                    <Icon size={26} className={isActive ? step.color : 'text-slate-400'} />
                                                </div>
                                                <p className={`text-sm font-bold mt-2 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                                                {step.key !== 'withdraw' ? (
                                                    <Badge
                                                        variant={isActive ? (step.key === 'completed' ? 'success' : step.key === 'pending' ? 'warning' : 'info') : 'neutral'}
                                                        className="mt-1 text-xs"
                                                    >
                                                        {count} booking
                                                    </Badge>
                                                ) : (
                                                    <p className={`text-xs font-bold mt-1 ${readyToWithdraw > 0 ? 'text-primary' : 'text-slate-400'}`}>
                                                        {readyToWithdraw > 0 ? formatRp(readyToWithdraw) : 'Belum ada'}
                                                    </p>
                                                )}
                                            </div>
                                            {idx < STATUS_STEPS.length - 1 && (
                                                <div className="hidden md:flex items-center justify-center px-2">
                                                    <ChevronRight size={24} className="text-slate-300" />
                                                </div>
                                            )}
                                            {idx < STATUS_STEPS.length - 1 && (
                                                <div className="flex md:hidden items-center justify-center">
                                                    <ArrowRight size={20} className="text-slate-300 rotate-90" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* === SUMMARY CARDS === */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="!bg-primary text-white border-0 shadow-xl shadow-primary/20 overflow-hidden relative">
                            <div className="absolute right-[-20px] top-[-20px] opacity-10">
                                <Wallet size={120} />
                            </div>
                            <p className="text-primary-foreground/70 font-medium uppercase tracking-widest text-xs">Total Earnings</p>
                            <h3 className="text-3xl font-black mt-2">{formatRp(totalEarnings)}</h3>
                            <div className="mt-8 flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                                <ArrowUpRight size={14} />
                                {completedBookings.length} booking selesai × {commissionRate}%
                            </div>
                        </Card>

                        <Card className="border-amber-500/20 bg-amber-500/5">
                            <p className="text-slate-500 font-medium uppercase tracking-widest text-xs">Pending Commission</p>
                            <h3 className="text-3xl font-bold text-amber-600 mt-2">{formatRp(pendingCommission)}</h3>
                            <p className="text-xs text-slate-400 mt-2 font-medium">
                                {pendingBookings.length} booking sedang diproses. Akan cair setelah selesai.
                            </p>
                        </Card>

                        <Card className="flex flex-col justify-between">
                            <div>
                                <p className="text-slate-500 font-medium uppercase tracking-widest text-xs">Ready to Withdraw</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-2">{formatRp(readyToWithdraw)}</h3>
                            </div>
                            <Button
                                variant="primary"
                                className="mt-4 w-full py-4"
                                disabled={readyToWithdraw <= 0}
                                onClick={() => setShowWithdrawPopup(true)}
                            >
                                Tarik Komisi
                                <CreditCard size={18} className="ml-2" />
                            </Button>
                        </Card>
                    </div>

                    {/* === RIWAYAT KOMISI (from completed bookings) === */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <History size={20} className="text-slate-400" />
                            <h4 className="font-bold text-xl">Riwayat Komisi</h4>
                        </div>

                        <Card className="p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Pelanggan</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Kendaraan</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Komisi ({commissionRate}%)</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Jadwal</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {bookings.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                                                    Belum ada data booking.
                                                </td>
                                            </tr>
                                        ) : bookings.map((bk) => {
                                            const komisi = bk.status === 'completed' ? DEMO_BOOKING_VALUE * (commissionRate / 100) : 0;
                                            return (
                                                <tr key={bk.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-900">{bk.customer_name}</p>
                                                        <p className="text-xs text-slate-500">{bk.customer_phone}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium">{bk.car_model}</p>
                                                        <p className="text-xs text-slate-400 font-mono">{bk.license_plate}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold">
                                                        {bk.status === 'completed' ? (
                                                            <span className="text-emerald-600">{formatRp(komisi)}</span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {bk.service_date ? new Date(bk.service_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                        {bk.service_time && ` • ${bk.service_time}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Badge variant={
                                                            bk.status === 'completed' ? 'success' :
                                                                bk.status === 'pending' ? 'warning' :
                                                                    bk.status === 'processing' ? 'info' : 'danger'
                                                        }>
                                                            {bk.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* === RIWAYAT PENARIKAN === */}
                    {withdrawals.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Banknote size={20} className="text-slate-400" />
                                <h4 className="font-bold text-xl">Riwayat Penarikan</h4>
                            </div>
                            <Card className="p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Tanggal</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Jumlah</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Catatan</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {withdrawals.map((wd) => (
                                                <tr key={wd.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {new Date(wd.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">{formatRp(wd.amount)}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{wd.notes || '-'}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Badge variant={
                                                            wd.status === 'approved' ? 'success' :
                                                                wd.status === 'pending' ? 'warning' : 'danger'
                                                        }>
                                                            {wd.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* === POPUP TARIK KOMISI === */}
                {showWithdrawPopup && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <CreditCard className="text-primary" />
                                    Tarik Komisi
                                </h3>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Jumlah Penarikan</p>
                                    <h3 className="text-3xl font-black text-primary">{formatRp(readyToWithdraw)}</h3>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Bank Tujuan</span>
                                        <span className="font-bold">{profile?.bank_name || 'Belum diatur'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">No. Rekening</span>
                                        <span className="font-bold font-mono">{profile?.bank_account_number || '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Atas Nama</span>
                                        <span className="font-bold">{profile?.bank_account_name || '-'}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p>Permintaan penarikan akan diproses oleh Owner dalam 1-3 hari kerja. Pastikan data rekening bank Anda sudah benar.</p>
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowWithdrawPopup(false)}
                                    disabled={isWithdrawing}
                                >
                                    Batal
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleWithdraw}
                                    disabled={isWithdrawing}
                                >
                                    {isWithdrawing ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                                    {isWithdrawing ? "Memproses..." : "Konfirmasi Tarik"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </RoleGuard>
        </DashboardLayout>
    );
}
