"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import MitraDashboard from "@/components/dashboard/MitraDashboard";
import { Wrench } from "lucide-react";

export default function DashboardPage() {
    const { role, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-slate-500 mt-4 text-sm font-medium">Memuat Dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!loading && user && !role) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        <Wrench size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Profil Tidak Ditemukan</h2>
                    <p className="text-slate-500 max-w-sm mb-4 font-medium">
                        Kami tidak dapat menemukan data profil atau hak akses untuk akun Anda.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100 text-left max-w-md w-full">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagnostic Info</p>
                        <p className="text-xs font-mono text-slate-500 truncate">ID: {user.id}</p>
                        <p className="text-xs font-mono text-slate-500">Email: {user.email}</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl transition-all active:scale-95"
                        >
                            Coba Lagi
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.href = '/login';
                            }}
                            className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) return null;

    return (
        <DashboardLayout>
            {role === "mitra" ? (
                <MitraDashboard />
            ) : role === "owner" ? (
                <OwnerDashboard />
            ) : role === "admin" ? (
                <AdminDashboard />
            ) : (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-slate-500 mt-4 text-sm font-medium">Menyinkronkan Akun...</p>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
