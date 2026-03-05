import { createClient } from '@supabase/supabase-js';

const url = "https://bugycrgmbhiuzagzfkio.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I"; // SERVICE ROLE KEY
const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.rpc('run_sql', {
        sql_query: "SELECT get_auth_user_branch() as result; "
    });
    console.log(data, error);
}
check();
