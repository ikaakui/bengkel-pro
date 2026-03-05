import { createClient } from '@supabase/supabase-js';

const url = "https://bugycrgmbhiuzagzfkio.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY"; // ANON KEY
const supabase = createClient(url, key);

async function testQuery() {
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: "admin.bsd@bengkel.com",
        password: "password123" // Common fallback, or 123456
    });

    if (loginError) {
        const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
            email: "admin.bsd@bengkel.com",
            password: "123456"
        });
        if (e2) return;
    }

    const { data: callRes, error } = await supabase.rpc('get_auth_user_branch');
    console.log("Branch ID from RPC:", callRes, error);
}
testQuery();
