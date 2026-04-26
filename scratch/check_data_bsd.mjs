
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Try to find any catalog item that has "BSD" in updated_by_name and see its branch_id
    console.log('Searching for items updated by BSD...');
    const { data, error } = await supabase
        .from('catalog')
        .select('name, branch_id, updated_by_name')
        .ilike('updated_by_name', '%BSD%');
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Results:', data);
    }
}

check();
