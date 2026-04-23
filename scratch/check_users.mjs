import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkUsers() {
  console.log("Checking profiles table...");
  const { data, error } = await supabase.from('profiles').select('id, full_name, role');
  
  if (error) {
    console.error("❌ Error fetching profiles:", error.message);
  } else {
    console.log("✅ Profiles found:", data.length);
    console.table(data);
  }
}

checkUsers();
