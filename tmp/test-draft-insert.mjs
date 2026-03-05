import { createClient } from '@supabase/supabase-js';

// Setup admin client
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

// Admin credentials used in previous tests
const email = "adminbsd@test.com"; // Maybe need to check the actual admin test account?
const password = "password123";

async function testDraft() {
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !session) {
        console.log("Auth Error:", authError);
        return;
    }
    console.log("Logged in as Admin");

    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.user.id).single();
    console.log("Profile:", profile);

    if (!profile) {
        console.log("Failed to get profile");
        return;
    }

    const { data: insertResult, error } = await supabase
        .from("transactions")
        .insert({
            customer_name: "Test Customer",
            total_amount: 150000,
            branch_id: profile.branch_id,
            payment_method: "Cash",
            status: "Draft",
        })
        .select()
        .single();

    if (error) {
        console.log("Insert Draft Error:", error);
    } else {
        console.log("Inserted Draft Data:", insertResult);
    }
}

testDraft();
