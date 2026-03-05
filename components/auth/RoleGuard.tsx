"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/components/providers/AuthProvider";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    fallbackUrl?: string;
}

export default function RoleGuard({ children, allowedRoles, fallbackUrl = "/" }: RoleGuardProps) {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role && !allowedRoles.includes(role)) {
            router.push(fallbackUrl);
        }
    }, [role, loading, allowedRoles, fallbackUrl, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 mt-3 text-sm">Memuat...</p>
                </div>
            </div>
        );
    }

    if (!role || !allowedRoles.includes(role)) {
        return null;
    }

    return <>{children}</>;
}
