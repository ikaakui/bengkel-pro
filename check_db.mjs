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

async function checkProfile() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'owner@inka.com',
    password: 'inka2026'
  });
  console.log('Login:', authError ? authError.message : 'Success');
  
  const userId = authData.user.id;
  
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  console.log('Profiles check for user', userId, ':');
  console.log('Error:', error);
  console.log('Data:', data);
}

checkProfile();
