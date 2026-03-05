"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase-client";
import {
    Wallet,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Banknote,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search
} from "lucide-react";

export default function WithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const supabase = createClient();

    const fetchWithdrawals = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("withdrawals")
            .select(`
                *,
                profiles (
                    full_name,
                    bank_name,
                    bank_account_number,
                    bank_account_name
                )
            `)
            .order("created_at", { ascending: false });

        if (data) {
            setWithdrawals(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
        const confirmMsg = status === "approved"
            ? "Apakah anda yakin ingin MENYETUJUI penarikan ini? Pastikan dana sudah ditransfer ke rekening mitra."
            : "Apakah anda yakin ingin MENOLAK penarikan ini?";

        if (!confirm(confirmMsg)) return;

        setProcessingId(id);
        const { error } = await supabase
            .from("withdrawals")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) {
            alert(`Gagal update status: ${error.message}`);
        } else {
            alert(`✅ Permintaan penarikan berhasil di-${status}`);
            fetchWithdrawals();
        }
        setProcessingId(null);
    };

    const filteredWithdrawals = withdrawals.filter(wd =>
        wd.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wd.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin"]}>
                <div className="space-y-8 pb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Persetujuan Dana</h2>
                            <p className="text-slate-500 mt-1">Kelola permintaan pencairan komisi dari mitra affiliate.</p>
                        </div>
                        <Button variant="outline" onClick={fetchWithdrawals} className="h-12 px-4 shadow-sm">
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </Button>
                    </div>

                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cari nama mitra atau status..."
                            className="input-field pl-12 py-3"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 size={32} className="animate-spin text-slate-300" />
                        </div>
                    ) : filteredWithdrawals.length === 0 ? (
                        <Card className="text-center py-20 border-dashed border-2">
                            <Banknote size={48} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Belum ada permintaan penarikan dana.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredWithdrawals.map((wd) => (
                                <Card key={wd.id} className="p-0 overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
                                    <div className="flex flex-col lg:flex-row items-stretch">
                                        <div className="p-6 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                                            {/* Mitra Info */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                    <User size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Mitra</p>
                                                    <p className="font-bold text-slate-900 truncate">{wd.profiles?.full_name}</p>
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Jumlah</p>
                                                <p className="text-xl font-black text-primary">{formatRp(wd.amount)}</p>
                                            </div>

                                            {/* Bank Details */}
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Rekening Tujuan</p>
                                                <p className="text-sm font-bold text-slate-700">{wd.profiles?.bank_name} • {wd.profiles?.bank_account_number}</p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">a.n {wd.profiles?.bank_account_name}</p>
                                            </div>

                                            {/* Status & Date */}
                                            <div className="flex flex-col items-start lg:items-end">
                                                <Badge variant={
                                                    wd.status === 'approved' ? 'success' :
                                                        wd.status === 'pending' ? 'warning' : 'danger'
                                                } className="mb-2">
                                                    {wd.status}
                                                </Badge>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                                    <Clock size={12} />
                                                    {new Date(wd.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {wd.status === 'pending' ? (
                                            <div className="lg:w-64 bg-slate-50/80 p-4 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-row lg:flex-col gap-3 justify-center items-center">
                                                <Button
                                                    variant="success"
                                                    className="flex-1 w-full"
                                                    disabled={processingId === wd.id}
                                                    onClick={() => handleUpdateStatus(wd.id, 'approved')}
                                                >
                                                    {processingId === wd.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
                                                    Setujui
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 w-full text-red-600 hover:bg-red-50 border-red-100"
                                                    disabled={processingId === wd.id}
                                                    onClick={() => handleUpdateStatus(wd.id, 'rejected')}
                                                >
                                                    <XCircle size={16} className="mr-2" />
                                                    Tolak
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="lg:w-48 bg-slate-50/30 p-4 border-t lg:border-t-0 lg:border-l border-slate-100 flex items-center justify-center italic text-xs text-slate-400 font-medium">
                                                No actions available
                                            </div>
                                        )}
                                    </div>
                                    {wd.notes && (
                                        <div className="px-6 pb-4 bg-white">
                                            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                                <AlertCircle size={14} className="mt-0.5" />
                                                <span>Note: {wd.notes}</span>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
