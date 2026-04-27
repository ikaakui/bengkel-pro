import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    // Next.js 15: cookies() must be awaited
    const cookieStore = await cookies();

    // Collect all sb-* cookie names BEFORE signing out
    const allCookies = cookieStore.getAll();
    const sbCookieNames = allCookies
        .filter(c => c.name.startsWith('sb-'))
        .map(c => c.name);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    // Sign out on the Supabase server side
    await supabase.auth.signOut();

    // Build response and explicitly expire all sb-* cookies in the browser
    const response = NextResponse.json({ success: true });

    const expiredOptions = {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
    };

    // Add every known sb- cookie as an expired Set-Cookie header
    for (const name of sbCookieNames) {
        response.cookies.set(name, '', expiredOptions);
    }

    // Also clear the generic Supabase auth token cookie names as a fallback
    const genericNames = [
        'sb-access-token',
        'sb-refresh-token',
        'supabase-auth-token',
    ];
    for (const name of genericNames) {
        response.cookies.set(name, '', expiredOptions);
    }

    return response;
}
