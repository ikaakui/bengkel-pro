const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function clean() {
    const { data: branches, error } = await supabase.from('branches').select('*');
    if (error) {
        console.error("Error fetching branches:", error);
        return;
    }
    
    console.log("Found branches:", branches.length);
    
    // Find duplicates based on name
    const seen = new Set();
    const toDelete = [];
    
    for (const branch of branches) {
        if (seen.has(branch.name)) {
            toDelete.push(branch.id);
            console.log("Duplicate found for deletion:", branch.name, "ID:", branch.id);
        } else {
            seen.add(branch.name);
        }
    }
    
    if (toDelete.length > 0) {
        const { error: delError } = await supabase.from('branches').delete().in('id', toDelete);
        if (delError) {
            console.error("Error deleting:", delError);
        } else {
            console.log("Successfully deleted", toDelete.length, "duplicate branches.");
        }
    } else {
        console.log("No duplicates found.");
    }
}

clean();
