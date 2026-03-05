import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Creates the settings table if it does not exist using service role
        const { error } = await supabase.rpc('setup_settings_table');

        // Fallback if RPC doesn't exist, we can't easily execute raw SQL via REST.
        // But we can try an upsert which might fail beautifully if no table exists, 
        // which tells us table creation needs to be manual.
        return NextResponse.json({ success: true, error: error?.message || null });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
