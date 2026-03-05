"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";

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
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshGlobalLogo: () => Promise<void>;
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
    signOut: async () => { },
    refreshProfile: async () => { },
    refreshGlobalLogo: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [branchName, setBranchName] = useState<string | null>(null);
    const [globalLogoUrl, setGlobalLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const fetchProfile = useCallback(async (userId: string) => {
        console.log("Fetching profile for:", userId);

        try {
            // Add a timeout to the fetch
            const fetchPromise = supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 15000)
            );

            const { data, error }: any = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) {
                console.error("Error fetching profile:", error.message, error?.code);
                if (error.code === 'PGRST116') {
                    // Only clear profile if it genuinely does not exist in the database
                    setProfile(null);
                }
                // Do not clear the existing profile on network errors/timeouts
                return;
            }

            if (data) {
                console.log("Profile found:", data.role);
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
            } else {
                console.warn("No data returned for user profile:", userId);
            }
        } catch (err: any) {
            console.error("Profile fetch exception:", err.message);
            // Do not clear the existing profile on timeout/network exceptions
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

        // Get initial session
        const getSession = async () => {
            console.log("Checking initial session...");
            try {
                // Fetch global logo independently
                refreshGlobalLogo();

                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error("Session check error:", err);
            } finally {
                if (mounted) {
                    console.log("Initial session check complete. Loading: false");
                    setLoading(false);
                }
            }
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log("Auth state changed:", event);
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
    }, [supabase, fetchProfile]);

    const signOut = async () => {
        try {
            // Clear all possible storage to ensure a clean state
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();
            }

            // Clear state immediately for instant UI feedback
            setUser(null);
            setProfile(null);
            setBranchName(null);
            setGlobalLogoUrl(null);
            setLogoLoading(true);

            // Sign out from Supabase client-side
            await supabase.auth.signOut();

            // Also call server-side signout to clear server cookies
            // This prevents middleware from seeing stale session
            try {
                await fetch('/api/auth/signout', { method: 'POST' });
            } catch {
                // Non-critical, continue with redirect
            }
        } catch (err) {
            console.error("Error during signOut:", err);
        } finally {
            // Also manually clear Supabase auth cookies as a safety net
            if (typeof document !== 'undefined') {
                const cookies = document.cookie.split(';');
                for (const cookie of cookies) {
                    const name = cookie.split('=')[0].trim();
                    if (name.startsWith('sb-') || name.includes('supabase')) {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    }
                }
            }
            // Force a hard navigation to login
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
                signOut,
                refreshProfile,
                refreshGlobalLogo,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
