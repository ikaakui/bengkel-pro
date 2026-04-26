
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCatalog() {
    console.log('Checking catalog table...');
    
    // Check total count
    const { count, error: countError } = await supabase
        .from('catalog')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error('Error fetching count:', countError);
    } else {
        console.log('Total items in catalog:', count);
    }

    // Search for specific items
    const { data: specificItems, error: searchError } = await supabase
        .from('catalog')
        .select('id, name, branch_id, updated_by_name')
        .in('name', ['kampas rem', 'machine shaker', 'lower arm']);
    
    if (searchError) {
        console.error('Error searching for specific items:', searchError);
    } else {
        console.log('\nSpecific Items Check:');
        specificItems.forEach(item => {
            console.log(`- ${item.name} (ID: ${item.id}, Branch ID: ${item.branch_id}, Updated by: ${item.updated_by_name})`);
        });
    }

    // Check for BSD items
    const { data: bsdItems, error: bsdError } = await supabase
        .from('catalog')
        .select('id, name, branch_id, updated_by_name')
        .ilike('updated_by_name', '%BSD%')
        .limit(10);
    
    if (bsdError) {
        console.error('Error fetching BSD items:', bsdError);
    } else {
        console.log('Items updated by BSD:', bsdItems.length);
        bsdItems.forEach(item => {
            console.log(`- ${item.name} (ID: ${item.id}, Branch ID: ${item.branch_id}, Updated by: ${item.updated_by_name})`);
        });
    }

    // Check RLS policies
    console.log('\nChecking RLS policies (via information_schema)...');
    const { data: policies, error: policyError } = await supabase.rpc('get_policies', { table_name: 'catalog' });
    
    // Note: get_policies might not exist, alternative:
    const { data: policiesRaw, error: policyRawError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'catalog');

    if (policyRawError) {
        // Fallback if pg_policies is not accessible via client
        console.log('Could not fetch policies directly. You might need to check Supabase Dashboard.');
    } else {
        console.log('Policies for catalog table:', policiesRaw);
    }
}

checkCatalog();
