import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ClientDashboardWrapper from "@/components/dashboard/ClientDashboardWrapper";

export default async function DashboardPage() {
    const supabase = createServerSupabaseClient();

    // Fetch session on the server
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    }

    // Fetch profile on the server to avoid waterfall
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

    return (
        <DashboardLayout>
            <ClientDashboardWrapper
                initialUser={session.user}
                initialProfile={profile}
            />
        </DashboardLayout>
    );
}
