import { createClient } from '@supabase/supabase-js';

const url = "https://bugycrgmbhiuzagzfkio.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I"; // SERVICE ROLE KEY
const supabase = createClient(url, key);

async function check() {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.log("Error fetching users:", error);
        return;
    }

    for (const user of users.users) {
        if (user.user_metadata?.role === 'admin') {
            console.log(`Admin found: ${user.email} UID: ${user.id}`);
        }
    }
}
check();
