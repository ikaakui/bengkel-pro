import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspect() {
    console.log("Checking profiles table...");
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error("Error fetching profiles:", pError.message);
    else {
        console.log("Profiles found:", profiles.length);
        profiles.forEach(p => console.log(`- ID: ${p.id}, FullName: ${p.full_name}, Role: ${p.role}`));

        // Find abidin1190@gmail.com by checking auth
        const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
        if (uError) console.error("Error fetching users:", uError.message);
        else {
            const abidin = users.find(u => u.email === 'abidin1190@gmail.com');
            if (abidin) {
                console.log("Abidin UserID:", abidin.id);
                const prof = profiles.find(p => p.id === abidin.id);
                if (!prof) {
                    console.log("MISSING PROFILE FOR ABIDIN. Attempting fix...");
                    const { error: iError } = await supabase.from('profiles').insert({
                        id: abidin.id,
                        full_name: "Bos bidin",
                        role: "owner"
                    });
                    if (iError) console.error("Insert failed:", iError.message);
                    else console.log("Profile created successfully!");
                } else {
                    console.log("Profile exists for Abidin:", prof.role);
                }
            } else {
                console.error("Abidin not found in auth.users.");
            }
        }
    }
}

inspect();
