"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    Bot, Loader2, Wrench, AlertTriangle, CheckCircle2,
    ArrowRight, RefreshCw, Car, Calendar, Info
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { X, Lock } from "lucide-react";

const ISSUES_OPTIONS = [
    "Bunyi gluduk-gluduk",
    "Mobil terasa oleng/melayang",
    "Stir bergetar",
    "Ban aus tidak rata",
    "Mobil tidak stabil di kecepatan tinggi",
    "Bunyi decit saat belok",
    "Bantingan terasa keras/kaku",
    "Mobil amblas di salah satu sisi"
];

const ROAD_CONDITIONS = [
    { value: "berlubang", label: "Sering jalan rusak/berlubang" },
    { value: "halus", label: "Jalan mulus/aspa" },
    { value: "campuran", label: "Campuran (Jalan kota & berlubang)" }
];

export default function MontirAIPage() {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role !== 'member') {
            router.push('/');
        }
    }, [role, loading, router]);

    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        carType: "",
        carYear: new Date().getFullYear(),
        mileage: "",
        issues: [] as string[],
        description: "",
        roadCondition: "campuran",
        customerPhone: "",
        licensePlate: ""
    });

    const handleIssueToggle = (issue: string) => {
        setFormData(prev => ({
            ...prev,
            issues: prev.issues.includes(issue)
                ? prev.issues.filter(i => i !== issue)
                : [...prev.issues, issue]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.issues.length === 0) {
            alert("Harap pilih minimal satu keluhan.");
            return;
        }

        setIsLoading(true);
        
        // Construct WhatsApp Message
        const waNumber = "6285780565693";
        const message = `Halo Montir, saya ingin konsultasi mengenai kendala mobil saya:

🚗 *Data Kendaraan:*
- Jenis: ${formData.carType} (${formData.carYear})
- Plat Nomor: ${formData.licensePlate}
- Kilometer: ${formData.mileage}

🛠️ *Keluhan:*
${formData.issues.map(issue => `- ${issue}`).join('\n')}

📝 *Deskripsi Tambahan:*
${formData.description || "-"}

🛣️ *Kondisi Jalan:*
${formData.roadCondition === 'berlubang' ? 'Sering jalan rusak/berlubang' : formData.roadCondition === 'halus' ? 'Jalan mulus/aspal' : 'Campuran (Kota & Berlubang)'}

Mohon info dan bantuannya, terima kasih.`;

        const encodedMessage = encodeURIComponent(message);
        const waUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;

        // Redirect to WhatsApp
        window.open(waUrl, '_blank');
        
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <Bot size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Tanya Montir</h2>
                        <p className="text-slate-500">Konsultasikan masalah kaki-kaki mobil Anda langsung dengan montir ahli kami via WhatsApp.</p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="p-0 overflow-hidden border-2 border-primary/5 shadow-2xl">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Info size={20} className="text-primary" />
                                Detail Kendaraan & Keluhan
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Lengkapi data di bawah agar montir kami dapat memberikan diagnosa awal yang akurat.</p>
                        </CardHeader>
                        <CardContent className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nomor HP Anda</label>
                                        <input
                                            required
                                            type="tel"
                                            placeholder="Contoh: 08123456789"
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={formData.customerPhone}
                                            onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Plat Nomor Kendaraan</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Contoh: B 1234 CD"
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase"
                                            value={formData.licensePlate}
                                            onChange={e => setFormData({ ...formData, licensePlate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Jenis Mobil</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Contoh: Toyota Avanza"
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={formData.carType}
                                            onChange={e => setFormData({ ...formData, carType: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tahun</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={formData.carYear}
                                            onChange={e => setFormData({ ...formData, carYear: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Kilometer</label>
                                        <input
                                            required
                                            type="number"
                                            placeholder="Tengah KM"
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={formData.mileage}
                                            onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Issues */}
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Apa yang Anda rasakan? (Pilih minimal satu)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {ISSUES_OPTIONS.map(issue => (
                                            <button
                                                key={issue}
                                                type="button"
                                                onClick={() => handleIssueToggle(issue)}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${formData.issues.includes(issue)
                                                    ? "bg-primary/5 border-primary text-primary shadow-md shadow-primary/10"
                                                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${formData.issues.includes(issue) ? "bg-primary border-primary text-white" : "border-slate-300"
                                                    }`}>
                                                    {formData.issues.includes(issue) && <CheckCircle2 size={12} />}
                                                </div>
                                                <span className="text-sm font-medium">{issue}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Context */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Kondisi Jalan Sering Dilalui</label>
                                        <select
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={formData.roadCondition}
                                            onChange={e => setFormData({ ...formData, roadCondition: e.target.value })}
                                        >
                                            {ROAD_CONDITIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Deskripsi Tambahan (Opsional)</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[48px]"
                                            rows={1}
                                            placeholder="Contoh: Bunyi muncul saat belok tajam ke kanan..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/30"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" />
                                            Membuka WhatsApp...
                                        </>
                                    ) : (
                                        <>
                                            Tanya Montir Sekarang (WhatsApp)
                                            <ArrowRight size={20} className="ml-2" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
