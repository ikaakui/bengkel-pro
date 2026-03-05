import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspect() {
    console.log("Checking session for Abidin...");
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const abidin = users.find(u => u.email === 'abidin1190@gmail.com');

    if (abidin) {
        console.log("Auth User Meta:", abidin.user_metadata);

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', abidin.id).single();
        console.log("Profile Data:", profile);

        if (profile && !abidin.user_metadata?.role) {
            console.log("FIXING AUTH METADATA: No role found in auth.users.");
            // Supabase Auth metadata must have role=owner for RLS to pass Owner policies
            const { error: updateError } = await supabase.auth.admin.updateUserById(abidin.id, {
                user_metadata: { ...abidin.user_metadata, role: 'owner' }
            });
            if (updateError) console.error("Metadata update failed:", updateError.message);
            else console.log("Auth metadata updated!");
        }
    }
}

inspect();
