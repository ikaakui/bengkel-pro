import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
    console.log("Fetching rewards...");
    const { data: rewards, error: rError } = await supabase.from('rewards').select('*');
    console.log("Rewards count:", rewards?.length, rError?.message || "");

    console.log("Fetching catalog with points...");
    const { data: catalog, error: cError } = await supabase.from('catalog').select('*').gt('points_required', 0);
    console.log("Catalog rewards count:", catalog?.length, cError?.message || "");
    
    if (catalog) {
        catalog.forEach(item => console.log(`- ${item.name}: ${item.points_required} pts`));
    }
}

checkData();
