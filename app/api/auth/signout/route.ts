import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const cookieStore = cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: '', ...options, maxAge: 0 });
                    cookieStore.delete(name);
                },
            },
        }
    );

    await supabase.auth.signOut();

    // Ensure all supabase related cookies are completely removed
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
            cookieStore.delete(cookie.name);
        }
    });

    return NextResponse.json({ success: true });
}
