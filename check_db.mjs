import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("Checking rewards table...");
    const { data: rewards, error: rError } = await supabase.from('rewards').select('*').limit(1);
    if (rError) console.error("Rewards Error:", rError.message);
    else console.log("Rewards table OK");

    console.log("Checking catalog table points_required...");
    const { data: catalog, error: cError } = await supabase.from('catalog').select('points_required').limit(1);
    if (cError) console.error("Catalog Error:", cError.message);
    else console.log("Catalog points_required OK");
}

checkSchema();
