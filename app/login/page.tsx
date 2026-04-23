"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wrench, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ToastContainer, type ToastItem } from "@/components/ui/Toast";
import LoginSuccessModal from "@/components/auth/LoginSuccessModal";
import type { UserRole } from "@/components/providers/AuthProvider";

const roles = [
    { id: "member", label: "Member", desc: "Loyalty Member", color: "from-emerald-500 to-teal-600" },
    { id: "admin", label: "Admin", desc: "Operasional", color: "from-blue-500 to-indigo-600" },
    { id: "owner", label: "Owner", desc: "Super Admin", color: "from-purple-500 to-violet-600" },
];

const defaultColor = "from-blue-500 to-indigo-600";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { globalLogoUrl, logoLoading } = useAuth();
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{ name: string; role: UserRole | null }>({ name: "", role: null });
    const router = useRouter();
    const supabase = createClient();

    const addToast = (type: "success" | "warning" | "info", message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message === "Invalid login credentials"
                    ? "Email atau password salah. Silakan coba lagi."
                    : authError.message
                );
                setLoading(false);
                return;
            }

            if (data.user) {
                // Fetch profile to get name and role for the modal
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name, role")
                    .eq("id", data.user.id)
                    .single();

                setSuccessData({
                    name: profile?.full_name || "User",
                    role: profile?.role as UserRole || null
                });

                setShowSuccessModal(true);

                // Small delay to let user see the greeting
                setTimeout(() => {
                    router.push("/");
                    router.refresh();
                }, 2500);
                return; // Keep loading true during delay
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className={
                            logoLoading
                                ? "w-16 h-16 rounded-2xl bg-slate-100 animate-pulse mb-4"
                                : globalLogoUrl
                                    ? "mb-4"
                                    : "inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/25 mb-4"
                        }
                    >
                        {logoLoading ? null : globalLogoUrl ? (
                            <img
                                src={globalLogoUrl}
                                alt="Logo Bengkel"
                                className="w-24 h-24 object-contain mix-blend-multiply drop-shadow-sm"
                            />
                        ) : (
                            <Wrench size={32} className="text-white" />
                        )}
                    </motion.div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">INKA OTOSERVICE</h1>
                </div>

                {/* Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden">

                    {/* Form */}
                    <form onSubmit={handleLogin} className="p-6 space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@email.com"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    required
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const message = encodeURIComponent(`Halo Admin, saya lupa password akun INKA OTOSERVICE saya. Mohon bantuannya untuk reset password. Email saya: ${email || "[Masukkan Email]"}`);
                                        window.open(`https://wa.me/6282210605911?text=${message}`, "_blank");
                                    }}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                >
                                    Lupa password?
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${defaultColor
                                } ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl active:shadow-md"}`}
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <LogIn size={20} />
                            )}
                            {loading ? "Memproses..." : "Masuk"}
                        </motion.button>
                    </form>

                    {/* Register Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-6 pb-6 text-center"
                    >
                        <p className="text-sm text-slate-500">
                            Belum punya akun?{" "}
                            <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                                Daftar Member Baru
                            </Link>
                        </p>
                    </motion.div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 mt-6">
                    &copy; {new Date().getFullYear()} INKA OTOSERVICE. All rights reserved.
                </p>
            </motion.div>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            <LoginSuccessModal
                isOpen={showSuccessModal}
                name={successData.name}
                role={successData.role}
            />
        </div>
    );
}
