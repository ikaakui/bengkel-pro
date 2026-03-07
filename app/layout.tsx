import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = {
  title: 'BENGKEL PRO',
  description: 'Sistem Affiliate dan POS',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient();

  // Pre-fetch session and profile for immediate hydration
  const { data: { session } } = await supabase.auth.getSession();
  let profile = null;

  if (session?.user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="id">
      <body>
        <AuthProvider
          initialUser={session?.user || null}
          initialProfile={profile}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
