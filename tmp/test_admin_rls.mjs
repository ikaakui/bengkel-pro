import { createClient } from '@supabase/supabase-js';

const url = "https://bugycrgmbhiuzagzfkio.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY"; // ANON KEY
const supabase = createClient(url, key);

async function testRls() {
    console.log("Signing in as admin.bsd@bengkel.com...");
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: "admin.bsd@bengkel.com",
        password: "password123" // Common fallback, or 123456
    });

    if (loginError) {
        const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
            email: "admin.bsd@bengkel.com",
            password: "123456"
        });
        if (e2) {
            console.log("Login failed with both passwords:", e2);
            return;
        }
        console.log("Logged in with 123456!");
    } else {
        console.log("Logged in with password123!");
    }

    const { data: user } = await supabase.auth.getUser();
    console.log("UID:", user.user.id);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.user.id).single();
    console.log("Profile DB Branch ID:", profile.branch_id);

    console.log("Testing insert Draft into transactions...");
    const { data: insertResult, error } = await supabase
        .from("transactions")
        .insert({
            customer_name: "Test RLS",
            total_amount: 1000,
            branch_id: profile.branch_id,
            payment_method: "Cash",
            status: "Draft",
        })
        .select()
        .single();

    if (error) {
        console.log("Insert Draft Error:", error);
    } else {
        console.log("Draft Insert Success:", insertResult);
    }
}
testRls();
