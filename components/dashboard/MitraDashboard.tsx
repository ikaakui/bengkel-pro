"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
    Users,
    Wallet,
    Link as LinkIcon,
    TrendingUp,
    Clock,
    UserPlus
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

const mockReferrals = [
    { id: 'REF-001', customer: 'Budi Santoso', car: 'Toyota Avanza', status: 'completed', date: '2 days ago', commission: 'Rp 25.000' },
    { id: 'REF-002', customer: 'Ani Wijaya', car: 'Honda Civic', status: 'pending', date: '15 mins ago', commission: '-' },
    { id: 'REF-003', customer: 'Siti Aminah', car: 'Mitsubishi Xpander', status: 'booking', date: '1 hour ago', commission: '-' },
];

export default function MitraDashboard() {
    const { profile } = useAuth();
    const router = useRouter();

    return (
        <div className="space-y-10 pb-10">
            {/* Welcome Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 ">Halo, {profile?.full_name?.split(' ')[0]}! 👋</h2>
                    <p className="text-slate-500 mt-1">Pantau performa dan komisi Anda hari ini.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Users size={24} />
                        </div>
                        <Badge className="bg-white/20 border-0 text-white">+2 minggu ini</Badge>
                    </div>
                    <div className="mt-6">
                        <p className="text-blue-100/80 text-sm font-medium">Total Referral</p>
                        <p className="text-3xl font-black mt-1">12 Pelanggan</p>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Wallet size={24} />
                        </div>
                        <TrendingUp size={20} className="text-emerald-200" />
                    </div>
                    <div className="mt-6">
                        <p className="text-emerald-100/80 text-sm font-medium">Total Komisi Cair</p>
                        <p className="text-3xl font-black mt-1">Rp 450.000</p>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">Dalam Proses</span>
                    </div>
                    <div className="mt-6">
                        <p className="text-amber-50 rounded-lg text-sm font-medium">Komisi Pending</p>
                        <p className="text-3xl font-black mt-1">Rp 75.000</p>
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
                        <button className="text-sm font-bold text-primary hover:underline">Lihat Semua</button>
                    </div>

                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Pelanggan</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Estimasi Komisi</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {mockReferrals.map((ref) => (
                                        <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900">{ref.customer}</p>
                                                <p className="text-xs text-slate-500">{ref.car}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={ref.status === 'completed' ? 'success' : ref.status === 'pending' ? 'warning' : 'info'}>
                                                    {ref.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-700">{ref.commission}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xs text-slate-500 font-medium">{ref.date}</span>
                                            </td>
                                        </tr>
                                    ))}
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
                        <h3 className="font-bold text-lg mb-2">Cara Kerja Referral</h3>
                        <ul className="space-y-3 text-sm text-slate-600 relative z-10">
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-primary/20">1</span>
                                Berikan kode referral Anda ke pelanggan.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-primary/20">2</span>
                                Mereka melakukan servis di workshop kami.
                            </li>
                            <li className="flex gap-2">
                                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold border border-primary/20">3</span>
                                Anda dapat komisi % setelah pembayaran selesai!
                            </li>
                        </ul>
                    </Card>

                    <Card className="border-slate-200 flex flex-col">
                        <h3 className="font-bold text-lg mb-3">Penarikan Komisi</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-1">
                            Pastikan data rekening bank Anda sudah benar di pengaturan.
                        </p>
                        <div className="mt-auto flex justify-center">
                            <Button
                                variant="primary"
                                className="w-fit px-10"
                                onClick={() => router.push('/settings/bank')}
                            >
                                Buka Pengaturan Bank
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
