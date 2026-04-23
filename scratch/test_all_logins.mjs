import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAll() {
  const accounts = [
    { email: 'owner@inka.com', password: 'inka2026' },
    { email: 'member@inka.com', password: 'inka2026' }
  ];

  for (const acc of accounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });
    if (error) {
      console.log(`❌ Login ${acc.email} GAGAL: ${error.message}`);
    } else {
      console.log(`✅ Login ${acc.email} SUKSES! Role: ${data.user.user_metadata.role}`);
    }
  }
}

testAll();
