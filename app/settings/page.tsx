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
    RefreshCw,
    Bot,
    Calendar,
    Hash,
    Banknote,
    MessageCircle
} from "lucide-react";

export default function SettingsPage() {
    const [commissionRate, setCommissionRate] = useState("");
    const [originalRate, setOriginalRate] = useState("");
    
    const [ownerWA, setOwnerWA] = useState("");
    const [originalOwnerWA, setOriginalOwnerWA] = useState("");
    
    // AI Settings
    const [aiDuration, setAiDuration] = useState("30");
    const [originalAiDuration, setOriginalAiDuration] = useState("30");
    const [aiQuota, setAiQuota] = useState("1");
    const [originalAiQuota, setOriginalAiQuota] = useState("1");

    // Booking Settings
    const [bookingFee, setBookingFee] = useState("50000");
    const [originalBookingFee, setOriginalBookingFee] = useState("50000");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const supabase = createClient();

    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from("app_settings")
            .select("*");

        if (data) {
            const commRate = data.find((d: any) => d.key === "commission_rate")?.value || "";
            setCommissionRate(commRate);
            setOriginalRate(commRate);

            const duration = data.find((d: any) => d.key === "montir_ai_duration_days")?.value || "30";
            setAiDuration(duration);
            setOriginalAiDuration(duration);

            const quota = data.find((d: any) => d.key === "montir_ai_quota")?.value || "1";
            setAiQuota(quota);
            setOriginalAiQuota(quota);

            const fee = data.find((d: any) => d.key === "booking_fee_amount")?.value || "50000";
            setBookingFee(fee);
            setOriginalBookingFee(fee);

            const wa = data.find((d: any) => d.key === "owner_wa_number")?.value || "";
            setOwnerWA(wa);
            setOriginalOwnerWA(wa);
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

        const updates = [];

        if (commissionRate !== originalRate) {
            const rate = parseFloat(commissionRate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                setError("Persentase komisi harus antara 0 - 100.");
                setSaving(false);
                return;
            }
            updates.push({ key: "commission_rate", value: commissionRate, updated_at: new Date().toISOString() });
        }

        if (aiDuration !== originalAiDuration) {
            updates.push({ key: "montir_ai_duration_days", value: aiDuration, updated_at: new Date().toISOString() });
        }

        if (aiQuota !== originalAiQuota) {
            updates.push({ key: "montir_ai_quota", value: aiQuota, updated_at: new Date().toISOString() });
        }

        if (bookingFee !== originalBookingFee) {
            updates.push({ key: "booking_fee_amount", value: bookingFee, updated_at: new Date().toISOString() });
        }

        if (ownerWA !== originalOwnerWA) {
            updates.push({ key: "owner_wa_number", value: ownerWA, updated_at: new Date().toISOString() });
        }

        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from("app_settings")
                .upsert(updates, { onConflict: "key" });

            if (updateError) {
                setError("Gagal menyimpan. " + updateError.message);
            } else {
                setSuccess("Pengaturan berhasil disimpan!");
                setOriginalRate(commissionRate);
                setOriginalAiDuration(aiDuration);
                setOriginalAiQuota(aiQuota);
                setOriginalBookingFee(bookingFee);
                setOriginalOwnerWA(ownerWA);
                setTimeout(() => setSuccess(""), 3000);
            }
        }

        setSaving(false);
    };

    const hasChanges = commissionRate !== originalRate || aiDuration !== originalAiDuration || aiQuota !== originalAiQuota || bookingFee !== originalBookingFee || ownerWA !== originalOwnerWA;

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
                                    <h3 className="text-xl font-bold">Alokasi Beban Loyalty Member</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Estimasi porsi pendapatan yang dialokasikan untuk biaya poin/reward member.
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
                                            <p>Beban Loyalitas = <strong className="text-primary">Rp {((1000000 * parseFloat(commissionRate || "0")) / 100).toLocaleString("id-ID")}</strong></p>
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
                                                onClick={() => {
                                                    setCommissionRate(originalRate);
                                                    setAiDuration(originalAiDuration);
                                                    setAiQuota(originalAiQuota);
                                                }}
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

                    {/* AI Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Bot size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Pengaturan Montir AI</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Atur batas penggunaan fitur analisa Montir AI untuk setiap kendaraan (Plat & HP).
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Calendar size={16} className="text-blue-500" />
                                            Siklus Waktu (Hari)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={aiDuration}
                                                onChange={(e) => setAiDuration(e.target.value)}
                                                min="1"
                                                className="input-field pr-16"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Hari</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Hash size={16} className="text-emerald-500" />
                                            Kuota Maksimal / Siklus
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={aiQuota}
                                                onChange={(e) => setAiQuota(e.target.value)}
                                                min="1"
                                                className="input-field pr-16"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Sesi</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 text-sm text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <p>Info: Dengan pengaturan saat ini, setiap kendaraan hanya bisa dianalisa <strong>{aiQuota} kali</strong> dalam kurun waktu <strong>{aiDuration} hari</strong>.</p>
                                    </div>
                                    
                                    <div className="md:col-span-2 flex items-center gap-3 pt-2">
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
                                                onClick={() => {
                                                    setCommissionRate(originalRate);
                                                    setAiDuration(originalAiDuration);
                                                    setAiQuota(originalAiQuota);
                                                }}
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

                    {/* WhatsApp Setting */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-100 rounded-xl">
                                    <MessageCircle size={24} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Nomor WhatsApp Owner</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Nomor tujuan untuk pengiriman laporan nota supplier dan penagihan.
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
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+</span>
                                            <input
                                                type="text"
                                                value={ownerWA}
                                                onChange={(e) => setOwnerWA(e.target.value)}
                                                placeholder="628123456789"
                                                className="input-field pl-10 text-lg font-bold"
                                            />
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            <p>Gunakan format kode negara (contoh: <strong className="text-primary">62812...</strong>).</p>
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
                                    <li>Perubahan alokasi beban akan berlaku untuk transaksi baru di dashboard estimasi.</li>
                                    <li>Beban untuk transaksi lama tidak akan berubah di laporan historis.</li>
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
