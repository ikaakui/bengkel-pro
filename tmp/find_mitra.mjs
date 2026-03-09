import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function findMitra() {
    console.log("Searching for a mitra user...");
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mitra')
        .limit(1);

    if (pError) {
        console.error("Error fetching mitra profile:", pError.message);
        return;
    }

    if (profiles && profiles.length > 0) {
        const mitraProfile = profiles[0];
        console.log("Found Mitra Profile:", mitraProfile.full_name);

        const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
        if (uError) {
            console.error("Error fetching auth users:", uError.message);
            return;
        }

        const mitraUser = users.find(u => u.id === mitraProfile.id);
        if (mitraUser) {
            console.log("Mitra Email:", mitraUser.email);
            console.log("Mitra UID:", mitraUser.id);
        } else {
            console.log("No matching auth user found for mitra profile.");
        }
    } else {
        console.log("No mitra user found in profiles table.");
    }
}

findMitra();
