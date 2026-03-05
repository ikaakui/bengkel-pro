import { createClient } from '@supabase/supabase-js';

const url = "https://bugycrgmbhiuzagzfkio.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I"; // SERVICE ROLE KEY
const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.rpc('run_sql', {
        sql_query: "SELECT cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'transactions';"
    });

    if (error) {
        console.log("No rpc run_sql, trying fallback...");
        // Fallback if no RPC
    } else {
        console.log("Policies:", data);
    }
}
check();
