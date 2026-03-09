"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import SessionTimeoutHandler from "@/components/auth/SessionTimeoutHandler";

export type UserRole = "owner" | "admin" | "mitra";

export interface UserProfile {
    id: string;
    full_name: string;
    role: UserRole;
    phone: string | null;
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

    const fetchProfile = useCallback(async (userId: string) => {
        console.log("Fetching profile for:", userId);

        try {
            const { data, error }: any = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                console.error("Error fetching profile:", error.message);
                if (error.code === 'PGRST116') setProfile(null);
                return;
            }

            if (data) {
                setProfile(data as UserProfile);
                if (data.branch_id) {
                    const { data: branchData } = await supabase
                        .from("branches")
                        .select("name")
                        .eq("id", data.branch_id)
                        .single();
                    if (branchData) setBranchName(branchData.name);
                } else {
                    setBranchName(null);
                }
            }
        } catch (err: any) {
            console.error("Profile fetch exception:", err.message);
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
                .from("settings")
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

        const getSessionWithTimeout = async () => {
            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error("Session check timed out")), 5000);
            });

            try {
                // Fetch global logo independently
                refreshGlobalLogo();

                // Wrapping getSession in a Promise.race
                const sessionPromise = supabase.auth.getSession();
                const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null } };

                if (!mounted) return;

                const session = sessionResult?.data?.session;

                if (session?.user) {
                    setUser(session.user);
                    // Only fetch if profile isn't already set via setInitialData
                    if (!profile) {
                        try {
                            const fetchPromise = fetchProfile(session.user.id);
                            const fetchTimeout = new Promise<void>((_, reject) => {
                                setTimeout(() => reject(new Error("Profile fetch timed out")), 5000);
                            });
                            await Promise.race([fetchPromise, fetchTimeout]);
                        } catch (profileErr) {
                            console.error("Profile fetch timeout inside session check:", profileErr);
                        }
                    }
                }
            } catch (err) {
                console.error("Session check error or timeout:", err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        getSessionWithTimeout();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

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
    }, [supabase, fetchProfile, refreshGlobalLogo]); // Removed profile from dependency to avoid loop

    const signOut = async () => {
        try {
            // 1. Set global logging out state
            setIsLoggingOut(true);

            // 2. Small delay for smooth transition feel
            await new Promise(resolve => setTimeout(resolve, 300));

            // 3. Clear local data
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();

                // Clear all cookies related to supabase
                const cookies = document.cookie.split(";");
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i];
                    const eqPos = cookie.indexOf("=");
                    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                    if (name.includes('sb-') || name.includes('supabase')) {
                        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                    }
                }
            }

            // 4. Force hard redirect to login to ensure clean state
            // This is actually more professional for logout than router.push 
            // because it guarantees no stale memory remains, but we make it fast
            window.location.assign("/login");

            // 5. Background cleanup (if it even gets to run before navigation)
            supabase.auth.signOut();
            fetch('/api/auth/signout', { method: 'POST' }).catch(() => { });

        } catch (err) {
            console.error("Error during signOut:", err);
            window.location.href = "/login";
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
