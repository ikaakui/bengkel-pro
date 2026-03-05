import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function checkOwner() {
    console.log("Checking owner profile...\n");

    // Check profiles table
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "owner");

    if (error) {
        console.error("Error querying profiles:", error.message);
    }

    if (profiles && profiles.length > 0) {
        console.log("Owner profiles found:", profiles.length);
        profiles.forEach(p => {
            console.log("  ID:", p.id);
            console.log("  Name:", p.full_name);
            console.log("  Role:", p.role);
            console.log("  Branch ID:", p.branch_id || "null");
            console.log("---");
        });
    } else {
        console.log("NO owner profile found in profiles table!");
        console.log("Checking all profiles...");
        const { data: all } = await supabase.from("profiles").select("id, full_name, role");
        console.log("All profiles:", JSON.stringify(all, null, 2));
    }

    // Also check if branches table exists
    const { data: branches, error: branchErr } = await supabase.from("branches").select("*");
    if (branchErr) {
        console.log("\nBranches table error:", branchErr.message);
        console.log(">>> Migration has NOT been run yet! <<<");
    } else {
        console.log("\nBranches table exists. Count:", branches?.length || 0);
    }
}

checkOwner();
