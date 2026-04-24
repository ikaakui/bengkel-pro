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

    if (!role || !allowedRoles.includes(role)) {
        return null;
    }

    return <>{children}</>;
}
