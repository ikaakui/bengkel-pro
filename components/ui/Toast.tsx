"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, Target } from "lucide-react";

export interface ToastItem {
    id: string;
    type: "success" | "warning" | "info";
    message: string;
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 10000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const config = {
        success: {
            bg: "bg-gradient-to-r from-emerald-500 to-emerald-600",
            icon: <CheckCircle2 size={20} />,
            ring: "ring-emerald-400/30",
        },
        warning: {
            bg: "bg-gradient-to-r from-amber-500 to-orange-500",
            icon: <AlertTriangle size={20} />,
            ring: "ring-amber-400/30",
        },
        info: {
            bg: "bg-gradient-to-r from-blue-500 to-indigo-600",
            icon: <Target size={20} />,
            ring: "ring-blue-400/30",
        },
    }[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`pointer-events-auto ${config.bg} text-white rounded-2xl p-4 shadow-2xl ring-2 ${config.ring} backdrop-blur-xl flex items-start gap-3`}
        >
            <div className="flex-shrink-0 mt-0.5 opacity-90">{config.icon}</div>
            <p className="text-sm font-semibold flex-1 leading-snug">{toast.message}</p>
            <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
}
