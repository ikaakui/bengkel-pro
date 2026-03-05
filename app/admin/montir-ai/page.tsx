"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Trash2, AlertCircle, RefreshCw, Calendar, Phone, Car } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

type UsageLog = {
    id: string;
    partner_id: string;
    customer_phone: string;
    license_plate: string;
    created_at: string;
    profiles?: {
        full_name: string;
    }
}

export default function MontirAIUsageAdminPage() {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const supabase = createClient();

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('montir_ai_usage')
                .select(`
                    *,
                    profiles:partner_id(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs((data as any) || []);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus riwayat cek kendaraan ini? Mitra akan bisa mengecek kendaraan ini lagi.")) return;

        setIsDeleting(id);
        try {
            const { error } = await supabase
                .from('montir_ai_usage')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setLogs(logs.filter(log => log.id !== id));
        } catch (error) {
            console.error("Failed to delete log:", error);
            alert("Gagal menghapus riwayat.");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Montir AI Usage Logs</h2>
                        <p className="text-slate-500">Kelola riwayat analisa kendaraan oleh mitra</p>
                    </div>
                    <Button onClick={fetchLogs} disabled={isLoading} variant="outline" className="gap-2">
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <h3 className="font-bold flex items-center gap-2">
                            <AlertCircle className="text-primary" size={20} />
                            Riwayat Penggunaan
                        </h3>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-500">Memuat data...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">Belum ada riwayat penggunaan Montir AI.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mitra</TableHead>
                                            <TableHead>No HP Cust.</TableHead>
                                            <TableHead>Plat Nomor</TableHead>
                                            <TableHead>Waktu Analisa</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="font-medium">{log.profiles?.full_name || 'Unknown'}</div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={14} className="text-slate-400" />
                                                        {log.customer_phone}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Car size={14} className="text-slate-400" />
                                                        {log.license_plate}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(log.id)}
                                                        disabled={isDeleting === log.id}
                                                    >
                                                        {isDeleting === log.id ? (
                                                            <RefreshCw size={16} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
