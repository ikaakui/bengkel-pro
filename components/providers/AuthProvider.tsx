"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import SessionTimeoutHandler from "@/components/auth/SessionTimeoutHandler";

export type UserRole = "owner" | "admin" | "member" | "spv" | "admin_depok" | "admin_bsd";

export interface UserProfile {
    id: string;
    full_name: string;
    role: UserRole;
    phone: string | null;
    total_points: number;
    referral_code: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    branch_id: string | null;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    role: UserRole | null;
    branchId: string | null;
    branchName: string | null;
    loading: boolean;
    globalLogoUrl: string | null;
    logoLoading: boolean;
    isLoggingOut: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshGlobalLogo: () => Promise<void>;
    setInitialData: (user: User | null, profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    role: null,
    branchId: null,
    branchName: null,
    loading: true,
    globalLogoUrl: null,
    logoLoading: true,
    isLoggingOut: false,
    signOut: async () => { },
    refreshProfile: async () => { },
    refreshGlobalLogo: async () => { },
    setInitialData: () => { },
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
    children,
    initialUser = null,
    initialProfile = null
}: {
    children: React.ReactNode,
    initialUser?: User | null,
    initialProfile?: UserProfile | null
}) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
    const [branchName, setBranchName] = useState<string | null>(null);
    const [globalLogoUrl, setGlobalLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [loading, setLoading] = useState(!initialUser);
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);


    const setInitialData = useCallback((initialUser: User | null, initialProfile: UserProfile | null) => {
        if (initialUser) setUser(initialUser);
        if (initialProfile) {
            setProfile(initialProfile);
            setLoading(false);
        }
    }, []);

    const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                console.error("Error fetching profile:", error.message);
                // Retry up to 2 times on failure (except "not found")
                if (error.code !== 'PGRST116' && retryCount < 2) {
                    await new Promise(r => setTimeout(r, 400));
                    return fetchProfile(userId, retryCount + 1);
                }
                if (error.code === 'PGRST116') setProfile(null);
                return false;
            }

            if (data) {
                setProfile(data as UserProfile);
                // Fetch branch name in background (non-blocking for loading state)
                if (data.branch_id) {
                    supabase
                        .from("branches")
                        .select("name")
                        .eq("id", data.branch_id)
                        .single()
                        .then(({ data: branchData }) => {
                            if (branchData) setBranchName(branchData.name);
                        });
                } else {
                    setBranchName(null);
                }
                return true;
            }
            return false;
        } catch (err: any) {
            console.error("Profile fetch exception:", err.message);
            if (retryCount < 2) {
                await new Promise(r => setTimeout(r, 400));
                return fetchProfile(userId, retryCount + 1);
            }
            return false;
        }
    }, [supabase]);

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    }, [user, fetchProfile]);

    const refreshGlobalLogo = useCallback(async () => {
        try {
            setLogoLoading(true);
            const { data } = await supabase
                .from("app_settings")
                .select("value")
                .eq("key", "global_logo_url")
                .single();
            if (data?.value) {
                setGlobalLogoUrl(data.value);
            } else {
                setGlobalLogoUrl(null);
            }
        } catch (err) {
            console.error("Error fetching global logo:", err);
            setGlobalLogoUrl(null);
        } finally {
            setLogoLoading(false);
        }
    }, [supabase]);

    useEffect(() => {

        let mounted = true;
        
        // Fire logo fetch in parallel 
        refreshGlobalLogo();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: any, session: Session | null) => {
                if (!mounted) return;
                
                // Skip redundant client fetch if server already provided the profile on initial mount
                if (event === 'INITIAL_SESSION' && profile && session?.user?.id === profile.id) {
                    setLoading(false);
                    return;
                }

                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setBranchName(null);
                }
                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile, refreshGlobalLogo]);

    const signOut = async () => {
        try {
            // 1. Show logout screen immediately (feels instant)
            setIsLoggingOut(true);

            // 2. Clear React state immediately so UI reflects logout
            setUser(null);
            setProfile(null);
            setBranchName(null);

            // 3. Clear browser storage immediately (instant, no waiting)
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();

                // Expire all cookies client-side as a fail-safe
                document.cookie.split(";").forEach((cookie) => {
                    const name = cookie.split("=")[0].trim();
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax";
                });
            }

            // 4. Fire server-side cleanup in parallel (runs in the background)
            // Added a safety timeout so it never hangs indefinitely
            await Promise.race([
                Promise.all([
                    supabase.auth.signOut({ scope: 'local' }).catch(console.error),
                    fetch('/api/auth/signout', { method: 'POST' }).catch(console.error),
                ]),
                new Promise((resolve) => setTimeout(resolve, 1500)) // Force continue after 1.5s
            ]);

            // 5. Hard redirect — bypasses Next.js router cache entirely
            window.location.replace("/login");

        } catch (err) {
            console.error("Error during signOut:", err);
            window.location.replace("/login");
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                role: profile?.role ?? null,
                branchId: profile?.branch_id ?? null,
                branchName,
                loading,
                globalLogoUrl,
                logoLoading,
                isLoggingOut,
                signOut,
                refreshProfile,
                refreshGlobalLogo,
                setInitialData,
            }}
        >
            {children}
            {user && (
                <SessionTimeoutHandler
                    timeoutMinutes={15}
                    warningMinutes={1}
                    onLogout={signOut}
                />
            )}
        </AuthContext.Provider>
    );
}
