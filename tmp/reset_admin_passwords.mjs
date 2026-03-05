import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function resetPasswords() {
    console.log("Resetting passwords for admins...");

    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
    if (uError) {
        console.error("Error fetching users:", uError.message);
        return;
    }

    const targetEmails = ["admin.bsd@bengkel.com", "admin.depok@bengkel.com"];

    for (const email of targetEmails) {
        const user = users.find(u => u.email === email);
        if (user) {
            console.log(`Resetting password for ${email}...`);
            const { error: resetError } = await supabase.auth.admin.updateUserById(user.id, {
                password: "123456"
            });
            if (resetError) console.error(`Failed to reset ${email}:`, resetError.message);
            else console.log(`Success resetting ${email} to 123456`);
        } else {
            console.log(`User ${email} not found.`);
        }
    }
}

resetPasswords();
