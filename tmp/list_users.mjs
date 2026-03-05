import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listUsers() {
    console.log("Listing all users from Auth...");
    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();

    if (uError) {
        console.error("Error fetching users:", uError.message);
        return;
    }

    console.log("Listing all profiles...");
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');

    if (pError) {
        console.error("Error fetching profiles:", pError.message);
    }

    users.forEach(u => {
        const profile = profiles ? profiles.find(p => p.id === u.id) : null;
        console.log(`Email: ${u.email}, Name: ${profile?.full_name || 'N/A'}, Role: ${profile?.role || 'N/A'}`);
    });
}

listUsers();
