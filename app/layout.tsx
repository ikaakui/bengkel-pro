import "./globals.css";
import { Inter } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'INKA OTOSERVICE',
  description: 'Sistem Affiliate dan POS',
  icons: {
    icon: '/favicon.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient();
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
    <html lang="id" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider initialUser={session?.user || null} initialProfile={profile || null}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

