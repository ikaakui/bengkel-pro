"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase-client";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    CreditCard,
    User
} from "lucide-react";

export default function BankSettingsPage() {
    const { profile, refreshProfile } = useAuth();
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");

    const [isEditing, setIsEditing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const supabase = createClient();

    useEffect(() => {
        if (profile) {
            setBankName(profile.bank_name || "");
            setAccountNumber(profile.bank_account_number || "");
            setAccountName(profile.bank_account_name || "");
            setLoading(false);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!profile) return;

        setSaving(true);
        setError("");
        setSuccess("");

        if (!bankName || !accountNumber || !accountName) {
            setError("Semua kolom harus diisi.");
            setSaving(false);
            return;
        }

        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                bank_name: bankName,
                bank_account_number: accountNumber,
                bank_account_name: accountName,
            })
            .eq("id", profile.id);

        if (updateError) {
            setError("Gagal menyimpan. " + updateError.message);
        } else {
            setSuccess("Pengaturan bank berhasil disimpan!");
            setIsEditing(false);
            refreshProfile();
            setTimeout(() => setSuccess(""), 3000);
        }

        setSaving(false);
    };

    const handleCancelEdit = () => {
        if (profile) {
            setBankName(profile.bank_name || "");
            setAccountNumber(profile.bank_account_number || "");
            setAccountName(profile.bank_account_name || "");
        }
        setIsEditing(false);
        setError("");
    };

    const hasChanges =
        bankName !== (profile?.bank_name || "") ||
        accountNumber !== (profile?.bank_account_number || "") ||
        accountName !== (profile?.bank_account_name || "");

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="space-y-8 pb-10 max-w-2xl">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Building2 size={28} className="text-primary" />
                            Pengaturan Bank
                        </h2>
                        <p className="text-slate-500 mt-1">Atur rekening tujuan untuk pencairan komisi Anda.</p>
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

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <CreditCard size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Data Rekening Bank</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Pastikan data yang Anda masukkan sesuai dengan buku tabungan.
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
                            ) : !isEditing ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                                                <Building2 size={16} /> Nama Bank
                                            </p>
                                            <p className="font-bold text-slate-900">{profile?.bank_name || "-"}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                                                <CreditCard size={16} /> Nomor Rekening
                                            </p>
                                            <p className="font-bold text-slate-900 font-mono">{profile?.bank_account_number || "-"}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                                            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                                                <User size={16} /> Atas Nama
                                            </p>
                                            <p className="font-bold text-slate-900">{profile?.bank_account_name || "-"}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                                        <Button
                                            onClick={() => setShowConfirm(true)}
                                            variant="primary"
                                            className="h-11 w-full sm:w-auto"
                                        >
                                            Ubah Rekening
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Building2 size={16} />
                                            Nama Bank
                                        </label>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="Contoh: BCA, BNI, Mandiri"
                                            className="input-field w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <CreditCard size={16} />
                                            Nomor Rekening
                                        </label>
                                        <input
                                            type="text"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Contoh: 1234567890"
                                            className="input-field w-full font-mono"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <User size={16} />
                                            Atas Nama
                                        </label>
                                        <input
                                            type="text"
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            placeholder="Sesuai KTP / Buku Tabungan"
                                            className="input-field w-full"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                                        <Button
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                            variant="ghost"
                                            className="h-11 w-full sm:w-auto"
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving || !hasChanges}
                                            variant="primary"
                                            className="h-11 w-full sm:w-auto"
                                        >
                                            {saving ? (
                                                <Loader2 size={18} className="animate-spin mr-2" />
                                            ) : (
                                                <Save size={18} className="mr-2" />
                                            )}
                                            {saving ? "Menyimpan..." : "Simpan Pengaturan Bank"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                            <div className="text-sm text-amber-800">
                                <p className="font-semibold mb-1">Informasi Penting</p>
                                <ul className="list-disc list-inside space-y-1 opacity-90">
                                    <li>Kesalahan input nomor rekening menjadi tanggung jawab penuh mitra.</li>
                                    <li>Proses pencairan komisi memakan waktu 1-2 hari kerja.</li>
                                    <li>Jika butuh bantuan, silahkan hubungi Admin.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {showConfirm && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                        >
                            <div className="flex items-center gap-3 text-amber-600 mb-4">
                                <AlertCircle size={28} />
                                <h3 className="text-xl font-bold text-slate-900">Yakin ubah rekening?</h3>
                            </div>
                            <p className="text-slate-500 mb-6">
                                Pastikan data rekening yang baru valid agar pencairan komisi tidak terkendala.
                            </p>
                            <div className="flex justify-end gap-3 flex-col-reverse sm:flex-row">
                                <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                                    Batal
                                </Button>
                                <Button variant="primary" onClick={() => {
                                    setShowConfirm(false);
                                    setIsEditing(true);
                                }}>
                                    Ya, Ubah
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </RoleGuard>
        </DashboardLayout>
    );
}
