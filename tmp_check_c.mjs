import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY";

async function testRls() {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);

    // Sign in as Abidin (owner)
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: "abidin1190@gmail.com",
        password: "123456"
    });

    if (loginError) {
        console.error("Login failed:", loginError.message);
        return;
    }

    console.log("Logged in! UID:", data.user.id);

    const { data: bookings, error: e1 } = await supabase.from('bookings').select('id, customer_name, license_plate, status');
    console.log("Bookings:", bookings?.slice(0, 10), e1);

    const { data: txns, error: e2 } = await supabase.from('transactions').select('id, customer_name, status, booking_id');
    console.log("Txns:", txns?.slice(0, 10), e2);
}

testRls();
