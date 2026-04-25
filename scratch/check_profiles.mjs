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

async function main() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, role, branch_id').limit(10);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(profiles, null, 2));
  }
}

main();
