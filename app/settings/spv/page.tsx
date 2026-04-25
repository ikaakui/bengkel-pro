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
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    MessageCircle,
    UserCheck,
    Phone,
    Info
} from "lucide-react";

export default function SpvSettingsPage() {
    const [ownerWA, setOwnerWA] = useState("");
    const [originalOwnerWA, setOriginalOwnerWA] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const supabase = createClient();

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("app_settings")
                .select("*")
                .eq("key", "owner_wa_number")
                .maybeSingle(); // Use maybeSingle to avoid error on 0 rows

            if (data?.value) {
                setOwnerWA(data.value);
                setOriginalOwnerWA(data.value);
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleSave = async () => {
        if (!ownerWA.trim()) {
            setError("Nomor WhatsApp tidak boleh kosong.");
            return;
        }
        // Validate format: must start with digits, no spaces, no +
        const cleaned = ownerWA.replace(/\D/g, '');
        if (cleaned.length < 10) {
            setError("Format nomor tidak valid. Gunakan format: 628xxxxxxxxxx");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const { error: updateError } = await supabase
                .from("app_settings")
                .upsert({ 
                    key: "owner_wa_number", 
                    value: cleaned, 
                    updated_at: new Date().toISOString() 
                });

            if (updateError) {
                console.error("Upsert error:", updateError);
                setError("Gagal menyimpan: " + updateError.message);
            } else {
                setOwnerWA(cleaned);
                setOriginalOwnerWA(cleaned);
                setSuccess("Nomor WhatsApp berhasil disimpan!");
                setShowSuccessModal(true);
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch (err: any) {
            console.error("System error:", err);
            setError("Kesalahan sistem: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["spv", "owner", "admin", "admin_bsd", "admin_depok"]}>
                <div className="relative space-y-8 pb-10 max-w-2xl">
                    {/* Success Modal */}
                    {showSuccessModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6"
                            >
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={40} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Tersimpan!</h3>
                                    <p className="text-slate-500 mt-2">Nomor WhatsApp tujuan laporan berhasil diperbarui.</p>
                                </div>
                                <Button 
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all"
                                >
                                    Siap, Lanjutkan
                                </Button>
                            </motion.div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Settings size={28} className="text-indigo-500" />
                            Pengaturan Supervisor
                        </h2>
                        <p className="text-slate-500 mt-1">Konfigurasi nomor WhatsApp tujuan laporan supplier & pengambilan barang.</p>
                    </div>

                    {/* SPV Badge */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-xl w-fit">
                        <UserCheck size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            Supervisor Access
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

                    {/* WhatsApp Setting Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-100 rounded-xl">
                                    <MessageCircle size={24} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Nomor WhatsApp Tujuan Laporan</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Nomor ini dipakai untuk pengiriman nota supplier & laporan pengambilan barang dari admin.
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Loader2 size={16} className="animate-spin" />
                                    Memuat pengaturan...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Phone size={16} className="text-emerald-500" />
                                            Nomor WhatsApp (format internasional)
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1 max-w-sm">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">+</span>
                                                <input
                                                    type="text"
                                                    value={ownerWA}
                                                    onChange={(e) => setOwnerWA(e.target.value.replace(/[^0-9]/g, ''))}
                                                    placeholder="628123456789"
                                                    className="input-field pl-10 text-lg font-bold tracking-wider"
                                                />
                                            </div>
                                            {ownerWA && (
                                                <a
                                                    href={`https://wa.me/${ownerWA}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors border border-emerald-200"
                                                >
                                                    <MessageCircle size={16} />
                                                    Test WA
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                            <Info size={12} />
                                            Format: kode negara tanpa + (contoh: <strong className="text-slate-600">628123456789</strong> untuk nomor Indonesia)
                                        </p>
                                    </div>

                                    {/* Preview pesan */}
                                    {ownerWA && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2"
                                        >
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Preview</p>
                                            <p className="text-sm font-medium text-slate-600">
                                                Laporan dari admin akan dikirim ke: <strong className="text-emerald-700">+{ownerWA}</strong>
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Setiap input pengambilan barang di tab "Pengambilan Supplier" akan membuka WhatsApp dengan pesan otomatis ke nomor ini.
                                            </p>
                                        </motion.div>
                                    )}

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving}
                                            variant="primary"
                                            className="h-11 px-8"
                                        >
                                            {saving ? (
                                                <Loader2 size={18} className="animate-spin mr-2" />
                                            ) : originalOwnerWA ? (
                                                <Settings size={18} className="mr-2" />
                                            ) : (
                                                <Save size={18} className="mr-2" />
                                            )}
                                            {saving ? "Menyimpan..." : originalOwnerWA ? "Ubah Nomor WA" : "Simpan Nomor WA"}
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
                                <p className="font-semibold text-slate-700 mb-1">Cara Kerja</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Admin/SPV input pengambilan barang di menu <strong>Pengeluaran → Tab Supplier</strong>.</li>
                                    <li>Klik <strong>"Simpan & Kirim WA"</strong> → data tersimpan & WA otomatis terbuka ke nomor ini.</li>
                                    <li>Pesan berisi: cabang, tanggal, daftar barang, dan total tagihan.</li>
                                    <li>Nomor yang disimpan di sini berlaku untuk seluruh cabang.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
