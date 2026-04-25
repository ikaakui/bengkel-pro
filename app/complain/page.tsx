"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
    MessageSquare, 
    Star, 
    Send, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    User,
    ClipboardList,
    ThumbsUp,
    ThumbsDown,
    Smile,
    Meh,
    Frown,
    MessageCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ComplainPage() {
    const { profile } = useAuth();
    const supabase = createClient();

    const [rating, setRating] = useState<number>(0);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [ownerWA, setOwnerWA] = useState('6285780565693');

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from("app_settings")
                .select("*")
                .eq("key", "owner_wa_number")
                .maybeSingle();
            if (data?.value) setOwnerWA(data.value);
        };
        fetchSettings();
    }, [supabase]);

    const sendWhatsApp = (r: number, s: string, m: string) => {
        const labels: Record<number, string> = {
            1: 'Kecewa',
            2: 'Biasa',
            3: 'Puas',
            4: 'Luar Biasa',
            5: 'Sangat Rekomended'
        };
        const stars = '⭐'.repeat(r);
        const label = labels[r] || '';
        
        const messageText = `MASUKAN & KOMPLAIN BARU 📣\n\n` +
            `Nama Member: ${profile?.full_name || 'Member'} Rating: ${stars} (${label}) Subjek: ${s}\n\n` +
            `Detail Pesan: "${m}"\n\n` +
            `Dikirim otomatis via Aplikasi Bengkel Pro`;

        const encodedText = encodeURIComponent(messageText);
        window.open(`https://wa.me/${ownerWA}?text=${encodedText}`, '_blank');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating) {
            alert("Harap pilih rating terlebih dahulu (Kecewa - Sangat Rekomended).");
            return;
        }
        if (!message.trim()) {
            alert("Harap isi detail masukan atau keluhan Anda.");
            return;
        }

        setLoading(true);
        try {
            const insertPromise = supabase.from("member_feedback").insert([{
                member_id: profile?.id,
                full_name: profile?.full_name,
                rating,
                subject,
                message,
                status: 'pending'
            }]);

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Request timeout (10s)")), 10000)
            );

            const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;

            if (error) throw error;
            
            // Send WhatsApp
            sendWhatsApp(rating, subject, message);
            
            setSubmitted(true);
        } catch (err: any) {
            alert("Gagal mengirim masukan: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 size={50} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-900">Masukan Terkirim!</h2>
                        <p className="text-slate-500">Terima kasih atas masukan Anda. Kami akan terus berusaha meningkatkan layanan kami.</p>
                    </div>
                    <Button onClick={() => window.location.href = '/'} className="h-14 px-8 rounded-2xl font-black">
                        KEMBALI KE BERANDA
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-4xl mx-auto space-y-8 pb-20">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kritik, Saran & Komplain</h1>
                        <p className="text-slate-500">Suara Anda sangat berarti bagi kemajuan layanan kami.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Info Column */}
                        <div className="md:col-span-1 space-y-6">
                            <Card className="border-blue-100 bg-blue-50/50">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                                        <MessageCircle size={24} />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-900">Hubungi Kami</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Masukan Anda akan langsung diterima oleh tim manajemen kami untuk ditindaklanjuti.
                                    </p>
                                    <div className="pt-4 border-t border-blue-100 space-y-3">
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">1</div>
                                            Respons cepat 1x24 jam
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">2</div>
                                            Kerahasiaan terjaga
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">3</div>
                                            Untuk kenyamanan bersama
                                        </div>
                                    </div>
                                </div>
                            </Card>


                        </div>

                        {/* Form Column */}
                        <div className="md:col-span-2">
                            <Card className="border-slate-100 shadow-2xl">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Rating Section */}
                                    <div className="space-y-4 text-center pb-8 border-b border-slate-50">
                                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Bagaimana pengalaman servis Anda?</label>
                                        <div className="flex justify-center gap-4">
                                            {[
                                                { val: 1, icon: Frown, label: 'Kecewa', color: 'text-rose-500', bg: 'bg-rose-50' },
                                                { val: 2, icon: Meh, label: 'Biasa', color: 'text-amber-500', bg: 'bg-amber-50' },
                                                { val: 3, icon: Smile, label: 'Puas', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                                { val: 4, icon: Star, label: 'Luar Biasa', color: 'text-blue-500', bg: 'bg-blue-50' },
                                                { val: 5, icon: ThumbsUp, label: 'Sangat Rekomended', color: 'text-violet-500', bg: 'bg-violet-50' },
                                            ].map((r) => (
                                                <button
                                                    key={r.val}
                                                    type="button"
                                                    onClick={() => setRating(r.val)}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all group",
                                                        rating === r.val ? r.bg + " ring-2 ring-offset-2 " + r.color.replace('text', 'ring') : "hover:bg-slate-50"
                                                    )}
                                                >
                                                    <r.icon 
                                                        size={32} 
                                                        className={cn(
                                                            "transition-transform",
                                                            rating === r.val ? r.color + " scale-110" : "text-slate-300 group-hover:text-slate-400"
                                                        )} 
                                                    />
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-tighter transition-colors",
                                                        rating === r.val ? r.color : "text-slate-300"
                                                    )}>
                                                        {r.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fields */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Subjek / Topik</label>
                                            <input 
                                                type="text" 
                                                placeholder="Contoh: Kualitas Oli, Pelayanan Kasir, dll"
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Detail Masukan / Keluhan</label>
                                            <textarea 
                                                rows={5}
                                                placeholder="Ceritakan pengalaman Anda secara detail di sini..."
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-medium resize-none"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                            />
                                        </div>

                                        <div className="pt-4">
                                            <Button 
                                                isLoading={loading}
                                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl shadow-blue-500/20 gap-3 font-black text-lg transition-all active:scale-[0.98]"
                                            >
                                                {!loading && <Send size={24} />}
                                                KIRIM MASUKAN SEKARANG
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
