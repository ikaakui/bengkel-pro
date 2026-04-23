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

async function testSignUp() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test_auto@inka.com',
    password: 'inka2026',
    options: {
      data: {
        full_name: 'Test Auto',
        role: 'member'
      }
    }
  });
  
  if (error) {
    console.error("Sign up failed:", error.message);
  } else {
    console.log("Sign up success! User ID:", data.user?.id);
    
    // Now try to log in to see if email confirmation is required
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test_auto@inka.com',
      password: 'inka2026'
    });
    
    if (loginError) {
      console.error("Login after signup failed:", loginError.message);
    } else {
      console.log("Login after signup success!");
    }
  }
}

testSignUp();
