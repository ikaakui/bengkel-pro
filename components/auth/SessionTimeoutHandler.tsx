"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, LogOut, CheckCircle2 } from "lucide-react";

interface SessionTimeoutHandlerProps {
    timeoutMinutes: number;
    warningMinutes: number;
    onLogout: () => Promise<void>;
}

export default function SessionTimeoutHandler({
    timeoutMinutes = 15,
    warningMinutes = 1,
    onLogout
}: SessionTimeoutHandlerProps) {
    const [showWarning, setShowWarning] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(warningMinutes * 60);
    const lastActivityRef = useRef<number>(Date.now());
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetInactivityTimer = useCallback(() => {
        const now = Date.now();
        // Hanya reset jika sudah lewat 2 detik dari aktivitas terakhir
        // untuk menghemat resource CPU (terutama saat mousemove)
        if (now - lastActivityRef.current < 2000 && !showWarning) return;

        lastActivityRef.current = now;
        if (showWarning) {
            setShowWarning(false);
            setSecondsRemaining(warningMinutes * 60);
        }
    }, [showWarning, warningMinutes]);

    const handleLogout = useCallback(async () => {
        setShowWarning(false);
        await onLogout();
    }, [onLogout]);

    useEffect(() => {
        const checkInactivity = () => {
            const now = Date.now();
            const elapsedMs = now - lastActivityRef.current;
            const timeoutMs = timeoutMinutes * 60 * 1000;
            const warningAtMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

            if (elapsedMs >= timeoutMs) {
                handleLogout();
            } else if (elapsedMs >= warningAtMs && !showWarning) {
                setShowWarning(true);
            }
        };

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            window.addEventListener(event, resetInactivityTimer);
        });

        const interval = setInterval(checkInactivity, 10000); // Check every 10 seconds

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetInactivityTimer);
            });
            clearInterval(interval);
        };
    }, [timeoutMinutes, warningMinutes, showWarning, resetInactivityTimer, handleLogout]);

    useEffect(() => {
        if (showWarning && secondsRemaining > 0) {
            const timer = setInterval(() => {
                setSecondsRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleLogout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [showWarning, secondsRemaining, handleLogout]);

    return (
        <AnimatePresence>
            {showWarning && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Warning Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 overflow-hidden"
                    >
                        {/* Status bar atop modal */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-slate-100">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: warningMinutes * 60, ease: "linear" }}
                                className="h-full bg-amber-500"
                            />
                        </div>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                                <Clock className="text-amber-500 animate-pulse" size={40} />
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full border-4 border-white">
                                    <AlertTriangle size={16} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">
                                Sesi Berakhir?
                            </h2>
                            <p className="text-slate-500 font-medium mb-8">
                                Anda sudah tidak aktif selama beberapa waktu. Anda akan keluar secara otomatis dalam:
                            </p>

                            <div className="text-6xl font-black text-slate-900 tabular-nums tracking-tighter mb-10 flex justify-center items-baseline gap-2">
                                {secondsRemaining}
                                <span className="text-lg text-slate-400 uppercase tracking-widest italic font-bold">Detik</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                                >
                                    <LogOut size={16} />
                                    Keluar Sekarang
                                </button>
                                <button
                                    onClick={resetInactivityTimer}
                                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95"
                                >
                                    <CheckCircle2 size={16} />
                                    Tetap Aktif
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
