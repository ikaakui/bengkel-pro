import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    "https://bugycrgmbhiuzagzfkio.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
    // Get branches
    const { data: branches } = await supabase.from("branches").select("id, name");
    console.log("Branches:", JSON.stringify(branches, null, 2));

    // Get admins with branch info
    const { data: admins } = await supabase
        .from("profiles")
        .select("id, full_name, role, branch_id")
        .eq("role", "admin");
    console.log("\nAdmins:", JSON.stringify(admins, null, 2));

    // Get admin emails from auth
    if (admins && admins.length > 0) {
        for (const admin of admins) {
            const { data } = await supabase.auth.admin.getUserById(admin.id);
            const branch = branches?.find(b => b.id === admin.branch_id);
            console.log(`\nAdmin: ${admin.full_name}`);
            console.log(`  Email: ${data?.user?.email}`);
            console.log(`  Branch: ${branch?.name || 'none'} (${admin.branch_id})`);
        }
    }
}

main();
