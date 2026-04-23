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

async function testLogin() {
  console.log("Testing login for owner@inka.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'owner@inka.com',
    password: 'inka2026'
  });
  
  if (error) {
    console.error("❌ Login failed:", error.message);
  } else {
    console.log("✅ Login success! User ID:", data.user.id);
    
    console.log("Fetching profile...");
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profError) {
      console.error("❌ Profile fetch failed:", profError.message);
    } else {
      console.log("✅ Profile found:", profile);
    }
  }
}

testLogin();
