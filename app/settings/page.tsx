"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase-client";
import { motion } from "framer-motion";
import {
    Settings,
    Percent,
    Save,
    Loader2,
    CheckCircle2,
    Crown,
    AlertCircle,
    RefreshCw
} from "lucide-react";

export default function SettingsPage() {
    const [commissionRate, setCommissionRate] = useState("");
    const [originalRate, setOriginalRate] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const supabase = createClient();

    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from("app_settings")
            .select("*")
            .eq("key", "commission_rate")
            .single();

        if (data) {
            setCommissionRate(data.value);
            setOriginalRate(data.value);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        const rate = parseFloat(commissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            setError("Persentase komisi harus antara 0 - 100.");
            setSaving(false);
            return;
        }

        const { error: updateError } = await supabase
            .from("app_settings")
            .update({ value: commissionRate, updated_at: new Date().toISOString() })
            .eq("key", "commission_rate");

        if (updateError) {
            setError("Gagal menyimpan. " + updateError.message);
        } else {
            setSuccess("Pengaturan berhasil disimpan!");
            setOriginalRate(commissionRate);
            setTimeout(() => setSuccess(""), 3000);
        }

        setSaving(false);
    };

    const hasChanges = commissionRate !== originalRate;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin"]}>
                <div className="space-y-8 pb-10 max-w-2xl">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Settings size={28} className="text-primary" />
                            Pengaturan
                        </h2>
                        <p className="text-slate-500 mt-1">Konfigurasi sistem bengkel (Khusus Owner).</p>
                    </div>

                    {/* Owner Badge */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 rounded-xl w-fit">
                        <Crown size={16} className="text-purple-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                            Owner Access Only
                        </span>
                    </div>

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium flex items-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            {success}
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium flex items-center gap-2"
                        >
                            <AlertCircle size={18} />
                            {error}
                        </motion.div>
                    )}

                    {/* Commission Rate Setting */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 rounded-xl">
                                    <Percent size={24} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Persentase Komisi Affiliate</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Komisi yang diberikan ke mitra untuk setiap transaksi yang direferensikan.
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Loader2 size={16} className="animate-spin" />
                                    Memuat...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1 max-w-xs">
                                            <input
                                                type="number"
                                                value={commissionRate}
                                                onChange={(e) => setCommissionRate(e.target.value)}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                className="input-field pr-12 text-2xl font-bold text-center"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">%</span>
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            <p>Contoh: Transaksi <strong>Rp 1.000.000</strong></p>
                                            <p>Komisi mitra = <strong className="text-primary">Rp {((1000000 * parseFloat(commissionRate || "0")) / 100).toLocaleString("id-ID")}</strong></p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving || !hasChanges}
                                            variant="primary"
                                            className="h-11"
                                        >
                                            {saving ? (
                                                <Loader2 size={18} className="animate-spin mr-2" />
                                            ) : (
                                                <Save size={18} className="mr-2" />
                                            )}
                                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                                        </Button>
                                        {hasChanges && (
                                            <button
                                                onClick={() => setCommissionRate(originalRate)}
                                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                            >
                                                <RefreshCw size={14} />
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-slate-500">
                                <p className="font-semibold text-slate-700 mb-1">Catatan</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Perubahan komisi akan berlaku untuk transaksi baru.</li>
                                    <li>Komisi untuk transaksi lama tidak akan berubah.</li>
                                    <li>Harga layanan & produk bisa diubah di halaman <strong>Katalog</strong>.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
