
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_SERVICE_ROLE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1];

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function apply() {
    console.log("Adding updated_at column to transactions...");
    // Supabase JS client cannot directly run ALTER TABLE unless through RPC or if we use the underlying postgres connection
    // But we can try to use RPC "exec_sql" if it exists, or just tell the user.
    // Most Supabase setups have a "reload_schema" but not "exec_sql" by default.
    
    // Check if we can use a simpler approach: update the code to NOT use updated_at if not present?
    // No, better to have the column.
    
    console.log("Please run this SQL in your Supabase Dashboard:");
    console.log("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();");
    console.log("NOTIFY pgrst, \"reload schema\";");
}
apply();
