"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    User, 
    Phone, 
    UserPlus, 
    Loader2, 
    ArrowLeft, 
    CheckCircle, 
    Car,
    Hash
} from "lucide-react";

function RegisterForm() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [brandModel, setBrandModel] = useState("");
    const [licensePlate, setLicensePlate] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("Password dan konfirmasi password tidak cocok.");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password minimal 6 karakter.");
            setLoading(false);
            return;
        }

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: "member",
                        phone: phone,
                        total_points: 0,
                    },
                },
            });

            if (authError) {
                if (authError.message.includes("already registered")) {
                    setError("Email sudah terdaftar. Silakan login.");
                } else {
                    setError(authError.message);
                }
                setLoading(false);
                return;
            }

            // Save vehicle info if provided
            if (data.user && brandModel && licensePlate) {
                await supabase.from("member_vehicles").insert([{
                    member_id: data.user.id,
                    brand_model: brandModel,
                    license_plate: licensePlate.toUpperCase(),
                    is_primary: true
                }]);
            }

            setSuccess(true);
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        }

        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-blue-200/50 border border-white p-8 text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-lg shadow-blue-500/30 mb-6"
                        >
                            <CheckCircle size={48} className="text-white" />
                        </motion.div>

                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Registrasi Berhasil! 🎉</h2>
                        <p className="text-slate-500 mt-3 text-lg font-medium leading-relaxed">
                            Selamat! Akun Member Anda telah aktif. Mulai nikmati layanan servis premium kami.
                        </p>

                        <div className="space-y-4 mt-8">
                            <button
                                onClick={() => {
                                    router.push("/");
                                    router.refresh();
                                }}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                            >
                                Masuk ke Dashboard Member
                                <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <p className="text-sm text-slate-400 font-medium">
                                Silakan cek email Anda untuk panduan selanjutnya.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-md my-8"
            >
                {/* Back button */}
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary mb-6 transition-colors group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    KEMBALI KE LOGIN
                </Link>

                {/* Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-200/50 border border-white overflow-hidden">
                    <div className="p-8 pb-4 text-center">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/25 mb-6"
                        >
                            <UserPlus size={40} className="text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Member Baru</h1>
                        <p className="text-slate-500 mt-2 font-medium">Lengkapi data untuk mendapatkan benefit loyalty.</p>
                    </div>

                    <form onSubmit={handleRegister} className="p-8 pt-4 space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-bold flex items-center gap-2"
                            >
                                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-5">
                            {/* Personal Info Header */}
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                                <User size={16} className="text-blue-500" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Informasi Personal</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Lengkap</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Nama lengkap sesuai KTP"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="nama@email.com"
                                                required
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">No. WhatsApp</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0812xxxx"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Info Header */}
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 pt-2">
                                <Car size={16} className="text-blue-500" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Data Kendaraan (Opsional)</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Merek & Tipe</label>
                                    <div className="relative group">
                                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={brandModel}
                                            onChange={(e) => setBrandModel(e.target.value)}
                                            placeholder="Toyota Avanza"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">No. Polisi</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={licensePlate}
                                            onChange={(e) => setLicensePlate(e.target.value)}
                                            placeholder="B 1234 ABC"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Password Header */}
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 pt-2">
                                <Lock size={16} className="text-blue-500" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Keamanan Akun</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min. 6 char"
                                            required
                                            className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Konfirmasi</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ulangi password"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className={`w-full py-5 rounded-3xl font-black text-white shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                                }`}
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <UserPlus size={24} />
                            )}
                            {loading ? "MEMPROSES..." : "DAFTAR SEKARANG"}
                        </motion.button>
                    </form>

                    <div className="px-8 pb-8 text-center">
                        <p className="text-sm font-bold text-slate-400">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="text-blue-600 hover:underline">
                                LOGIN DISINI
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Memuat halaman registrasi...</div>}>
            <RegisterForm />
        </Suspense>
    );
}

