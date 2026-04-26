
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bugycrgmbhiuzagzfkio.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBranches() {
    console.log("--- BRANCHES ---");
    const { data: branches } = await supabase.from('branches').select('id, name');
    console.log(JSON.stringify(branches, null, 2));
    
    console.log("\n--- ADMIN PROFILES ---");
    const { data: profiles } = await supabase.from('profiles').select('full_name, role, branch_id').in('role', ['admin', 'admin_bsd', 'admin_depok']);
    console.log(JSON.stringify(profiles, null, 2));
}

debugBranches();
