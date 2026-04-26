
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    console.log('Checking profiles for admins...');
    
    // We can't use ANON_KEY to see other profiles due to RLS
    // but maybe we can see branches?
    const { data: branches, error: bError } = await supabase.from('branches').select('*');
    if (bError) console.error('Error branches:', bError);
    else console.log('Branches:', branches);

    console.log('\nNote: Cannot check other profiles without service role key or being logged in.');
}

checkProfiles();
