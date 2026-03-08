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
        if (!loading && role !== 'mitra') {
            router.push('/');
        }
    }, [role, loading, router]);

    const [step, setStep] = useState<"form" | "result">("form");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitMessage, setLimitMessage] = useState("");

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
        try {
            const response = await fetch("/api/montir-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.error) {
                if (response.status === 400 && data.error.includes("dianalisa")) {
                    setLimitMessage(data.error);
                    setShowLimitModal(true);
                    return;
                }
                throw new Error(data.error);
            }
            setResult(data);
            setStep("result");
        } catch (error: any) {
            setLimitMessage(error?.message || "Gagal melakukan analisa. Silakan coba lagi.");
            setShowLimitModal(true);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setStep("form");
        setResult(null);
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
                        <h2 className="text-3xl font-bold text-slate-900">Montir AI: Analisa Kaki-Kaki</h2>
                        <p className="text-slate-500">Analisa masalah suspensi dan sasis mobil Anda secara instan menggunakan AI.</p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === "form" ? (
                        <motion.div
                            key="form-step"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="p-0 overflow-hidden border-2 border-primary/5 shadow-2xl">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Info size={20} className="text-primary" />
                                        Detail Kendaraan & Keluhan
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Lengkapi data di bawah untuk hasil analisa yang akurat.</p>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nomor HP Customer</label>
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
                                                    AI Sedang Menganalisa...
                                                </>
                                            ) : (
                                                <>
                                                    Mulai Analisa Sekarang
                                                    <ArrowRight size={20} className="ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result-step"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            {/* Result Summary Card */}
                            <Card className="overflow-hidden border-0 shadow-2xl relative">
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Badge variant="primary" className="mb-2">Hasil Analisa AI</Badge>
                                            <h3 className="text-2xl font-black text-slate-900">Diagnosis Kendaraan</h3>
                                        </div>
                                        <div className={`p-4 rounded-2xl flex flex-col items-center gap-1 ${result.urgensi === "Segera" ? "bg-red-50 text-red-600" :
                                            result.urgensi === "Dalam Waktu Dekat" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                            }`}>
                                            <AlertTriangle size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">Urgensi</span>
                                            <span className="text-xs font-bold leading-none">{result.urgensi}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="space-y-4">
                                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                                            <p className="text-slate-900 text-lg leading-relaxed font-medium capitalize">
                                                "{result.diagnosis}"
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <h4 className="font-bold flex items-center gap-2 text-slate-700">
                                                    <Wrench size={18} className="text-primary" />
                                                    Saran Perbaikan
                                                </h4>
                                                <div className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                                                    {result.saran.split("•").filter((s: string) => s.trim()).map((item: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                                                            <span>{item.trim()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <h4 className="font-bold flex items-center gap-2 text-slate-700">
                                                    <Info size={18} className="text-primary" />
                                                    Kenapa Harus {result.urgensi}?
                                                </h4>
                                                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm italic">
                                                    {result.penjelasan_urgensi}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                                        <Link href="/bookings" className="w-full">
                                            <Button className="w-full h-16 text-lg font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200">
                                                <Calendar size={20} className="mr-2" />
                                                BOOKING PERBAIKAN SEKARANG
                                                <ArrowRight size={20} className="ml-2" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Small vehicle info summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <Car size={16} className="mx-auto mb-1 text-slate-400" />
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Mobil</p>
                                    <p className="text-xs font-bold truncate">{formData.carType}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <Calendar size={16} className="mx-auto mb-1 text-slate-400" />
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Tahun</p>
                                    <p className="text-xs font-bold">{formData.carYear}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                                    <RefreshCw size={16} className="mx-auto mb-1 text-slate-400" />
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Km</p>
                                    <p className="text-xs font-bold">{formData.mileage}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Limit Modal */}
                <AnimatePresence>
                    {showLimitModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowLimitModal(false)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
                            >
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setShowLimitModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                                        <Lock size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-3">Akses Terbatas</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {limitMessage}
                                    </p>
                                    <div className="mt-8 space-y-3">
                                        <Button
                                            onClick={() => setShowLimitModal(false)}
                                            className="w-full h-12 font-bold"
                                        >
                                            Mengerti
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                                        Keamanan & Efisiensi Sistem
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
