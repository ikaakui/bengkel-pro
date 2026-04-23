"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, User, Crown, Shield, UserCheck } from "lucide-react";
import { useEffect } from "react";

import { type UserRole } from "@/components/providers/AuthProvider";

interface LoginSuccessModalProps {
    isOpen: boolean;
    name: string;
    role: UserRole | null;
}

const roleConfig: Record<string, any> = {
    owner: { label: "Owner / Super Admin", icon: Crown, color: "text-purple-600", bg: "bg-purple-100" },
    admin: { label: "Admin Operasional", icon: Shield, color: "text-blue-600", bg: "bg-blue-100" },
    admin_depok: { label: "Admin Depok", icon: Shield, color: "text-blue-600", bg: "bg-blue-100" },
    admin_bsd: { label: "Admin BSD", icon: Shield, color: "text-blue-600", bg: "bg-blue-100" },
    spv: { label: "Supervisor", icon: Shield, color: "text-indigo-600", bg: "bg-indigo-100" },
    member: { label: "Member Bengkel", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-100" },
};

export default function LoginSuccessModal({ isOpen, name, role }: LoginSuccessModalProps) {
    const config = role && roleConfig[role] ? roleConfig[role] : { label: "User", icon: User, color: "text-slate-600", bg: "bg-slate-100" };
    const Icon = config.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }}
                        className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-8 text-center overflow-hidden"
                    >
                        {/* Decorative background circle */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 ${config.bg} rounded-full blur-3xl opacity-50`} />
                        <div className={`absolute -bottom-24 -left-24 w-48 h-48 ${config.bg} rounded-full blur-3xl opacity-50`} />

                        {/* Animated Check Icon */}
                        <div className="relative mb-8 flex justify-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className={`w-24 h-24 rounded-3xl ${config.bg} flex items-center justify-center relative shadow-inner`}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4, duration: 0.3 }}
                                    className="absolute inset-0 bg-white rounded-3xl m-1 opacity-40 shadow-xl"
                                />
                                <Icon size={48} className={`${config.color} relative z-10`} />

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                                    className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white"
                                >
                                    <Check size={20} strokeWidth={4} />
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Text Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                                Berhasil Masuk!
                            </h2>
                            <p className="text-slate-500 font-medium mb-6">
                                Selamat datang kembali,
                            </p>

                            <div className={`inline-block px-6 py-4 rounded-3xl ${config.bg} mb-2 border border-white/50 shadow-sm`}>
                                <p className={`text-xl font-black uppercase tracking-tight ${config.color}`}>
                                    {name || "User"}
                                </p>
                            </div>

                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
                                {config.label}
                            </p>

                            {/* Loading progress bar at bottom */}
                            <div className="mt-10 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full`}
                                />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-2 italic">
                                Sedang mengalihkan ke dashboard...
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
