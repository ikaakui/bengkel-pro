"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { Wrench, Loader2, RefreshCw } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/components/providers/AuthProvider";

// Dynamically import dashboards for code splitting
const OwnerDashboard = dynamic(() => import("./OwnerDashboard"), {
    loading: () => <DashboardSkeleton />
});
const MemberDashboard = dynamic(() => import("./MemberDashboard"), {
    loading: () => <DashboardSkeleton />
});

function AdminRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/pos");
    }, [router]);
    return <DashboardSkeleton />;
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 w-full p-2">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200/70 rounded-2xl animate-pulse" />
                    <div className="h-4 w-32 bg-slate-100 rounded-xl animate-pulse" />
                </div>
                <div className="h-10 w-28 bg-slate-200/50 rounded-2xl animate-pulse" />
            </div>
            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-3xl h-[120px] w-full p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
                            <div className="h-10 w-10 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                        <div className="h-7 w-24 bg-slate-200/70 rounded-xl animate-pulse" />
                    </div>
                ))}
            </div>
            {/* Chart skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl h-[400px] w-full p-6">
                    <div className="h-5 w-32 bg-slate-100 rounded-lg animate-pulse mb-6" />
                    <div className="h-full bg-gradient-to-t from-slate-50 to-transparent rounded-2xl animate-pulse" style={{ maxHeight: 'calc(100% - 3rem)' }} />
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl h-[400px] w-full p-6">
                    <div className="h-5 w-28 bg-slate-100 rounded-lg animate-pulse mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-slate-100 rounded-xl animate-pulse shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                                    <div className="h-2 w-2/3 bg-slate-50 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ClientDashboardWrapperProps {
    initialUser?: User | null;
    initialProfile?: UserProfile | null;
}

export default function ClientDashboardWrapper({ initialUser, initialProfile }: ClientDashboardWrapperProps) {
    const { role, profile, loading, isLoggingOut, setInitialData, refreshProfile } = useAuth();
    const [retryCount, setRetryCount] = useState(0);
    const [showError, setShowError] = useState(false);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync initial data from server to auth provider if provided
    useEffect(() => {
        if (setInitialData && initialUser) {
            setInitialData(initialUser, initialProfile || null);
        }
    }, [initialUser, initialProfile, setInitialData]);

    // Use current role from provider (which might be updated via setInitialData)
    const activeRole = profile?.role || initialProfile?.role;

    // Auto-retry when profile is missing after loading completes
    useEffect(() => {
        if (!loading && !activeRole && retryCount < 3) {
            retryTimerRef.current = setTimeout(async () => {
                await refreshProfile();
                setRetryCount(prev => prev + 1);
            }, 800);
        }
        
        // Only show error after all retries exhausted
        if (!loading && !activeRole && retryCount >= 3) {
            setShowError(true);
        }

        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [loading, activeRole, retryCount, refreshProfile]);

    // Reset error state when profile is found
    useEffect(() => {
        if (activeRole) {
            setShowError(false);
            setRetryCount(0);
        }
    }, [activeRole]);

    // Show skeleton while loading or during auto-retry
    if (loading || isLoggingOut || (!activeRole && !showError)) {
        return <DashboardSkeleton />;
    }

    // Only show error after all auto-retries have been exhausted
    if (showError && !activeRole) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <Wrench size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Profil Tidak Ditemukan</h2>
                <p className="text-slate-500 max-w-sm mb-6 font-medium">
                    Kami tidak dapat memuat data profil Anda. Pastikan koneksi internet stabil dan coba lagi.
                </p>
                <button
                    onClick={() => {
                        setShowError(false);
                        setRetryCount(0);
                        refreshProfile();
                    }}
                    className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                >
                    <RefreshCw size={16} />
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <>
            {activeRole === "member" ? (
                <MemberDashboard />
            ) : activeRole === "owner" || activeRole === "spv" ? (
                <OwnerDashboard />
            ) : activeRole === "admin" || activeRole === "admin_depok" || activeRole === "admin_bsd" ? (
                <AdminRedirect />
            ) : (
                <DashboardSkeleton />
            )}
        </>
    );
}
