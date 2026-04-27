"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/components/providers/AuthProvider";
import { AlertTriangle, RefreshCcw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    fallbackUrl?: string;
}

export default function RoleGuard({ children, allowedRoles, fallbackUrl = "/" }: RoleGuardProps) {
    const { role, loading, profileError, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !profileError && role && !allowedRoles.includes(role)) {
            router.push(fallbackUrl);
        }
    }, [role, loading, profileError, allowedRoles, fallbackUrl, router]);

    // Handle Profile Fetch Errors (Graceful Degradation)
    if (profileError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-sm">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Terjadi Gangguan Sesi</h2>
                <p className="text-slate-500 text-center max-w-md font-medium mb-8 leading-relaxed">
                    {profileError}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                    <Button 
                        onClick={() => window.location.reload()} 
                        className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                        <RefreshCcw size={18} /> Coba Lagi
                    </Button>
                    <Button 
                        onClick={signOut} 
                        variant="outline"
                        className="flex-1 h-14 rounded-2xl border-2 border-red-100 hover:bg-red-50 hover:border-red-200 text-red-600 font-bold flex items-center justify-center gap-2"
                    >
                        <LogOut size={18} /> Login Ulang
                    </Button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6 w-full p-2 animate-pulse">
                <div className="h-8 w-48 bg-slate-200/60 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-3xl h-[140px] w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!role && !loading) {
        // Jika tidak ada role sama sekali setelah loading selesai (dan tidak ada profileError spesifik)
        // Berarti sesi tidak valid, alihkan ke login
        router.push("/login");
        return null;
    }

    if (role && !allowedRoles.includes(role)) {
        return null;
    }

    return <>{children}</>;
}
