import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY";

async function testRls() {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);

    // Sign in as Abidin
    console.log("Signing in as Abidin...");
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: "abidin1190@gmail.com",
        password: "123456"
    });

    if (loginError) {
        console.error("Login failed:", loginError.message);
        return;
    }

    console.log("Logged in! UID:", data.user.id);

    // Try to fetch own profile
    console.log("Fetching own profile via client-side client...");
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (fetchError) {
        console.error("Fetch profile failed via client:", fetchError.message);
    } else {
        console.log("Successfully fetched profile:", profile.role);
    }
}

testRls();
