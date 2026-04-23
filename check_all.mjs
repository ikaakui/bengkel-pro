import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAllLogins() {
  const emails = ['owner@inka.com', 'depok@inka.com', 'bsd@inka.com', 'spv@inka.com', 'member@inka.com'];
  for (const email of emails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'inka2026'
    });
    if (error) {
      console.log(`❌ ${email}: ${error.message}`);
    } else {
      console.log(`✅ ${email}: Login Success!`);
      
      // Check role in profile
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      console.log(`   Role: ${profile?.role}`);
    }
  }
}

checkAllLogins();
