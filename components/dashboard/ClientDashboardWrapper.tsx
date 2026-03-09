"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { Wrench, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/components/providers/AuthProvider";

// Dynamically import dashboards for code splitting
const OwnerDashboard = dynamic(() => import("./OwnerDashboard"), {
    loading: () => <DashboardLoading message="Memuat Dashboard Owner..." />
});
const AdminDashboard = dynamic(() => import("./AdminDashboard"), {
    loading: () => <DashboardLoading message="Memuat Dashboard Admin..." />
});
const MitraDashboard = dynamic(() => import("./MitraDashboard"), {
    loading: () => <DashboardLoading message="Memuat Dashboard Mitra..." />
});

function DashboardLoading({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="text-slate-500 mt-4 text-sm font-medium">{message}</p>
            </div>
        </div>
    );
}

interface ClientDashboardWrapperProps {
    initialUser?: User | null;
    initialProfile?: UserProfile | null;
}

export default function ClientDashboardWrapper({ initialUser, initialProfile }: ClientDashboardWrapperProps) {
    const { role, profile, loading, isLoggingOut, setInitialData } = useAuth();

    // Sync initial data from server to auth provider if provided
    useEffect(() => {
        if (setInitialData && initialUser) {
            setInitialData(initialUser, initialProfile || null);
        }
    }, [initialUser, initialProfile, setInitialData]);

    // Use current role from provider (which might be updated via setInitialData)
    const activeRole = profile?.role || initialProfile?.role;

    if ((loading || isLoggingOut) && !activeRole) {
        return <DashboardLoading message={isLoggingOut ? "Keluar Sistem..." : "Menyiapkan Dashboard..."} />;
    }

    if (!activeRole && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <Wrench size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Profil Tidak Ditemukan</h2>
                <p className="text-slate-500 max-w-sm mb-4 font-medium">
                    Kami tidak dapat menemukan data profil atau hak akses untuk akun Anda.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl transition-all active:scale-95"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {activeRole === "mitra" ? (
                <MitraDashboard />
            ) : activeRole === "owner" ? (
                <OwnerDashboard />
            ) : activeRole === "admin" ? (
                <AdminDashboard />
            ) : (
                <DashboardLoading message="Menyinkronkan Akun..." />
            )}
        </>
    );
}
