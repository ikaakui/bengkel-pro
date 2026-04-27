import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log("Mulai pembuatan akun Manager...");

  const acc = { 
    email: 'manager@inka.com', 
    password: 'inka2026', 
    meta: { full_name: 'Manager Inka', role: 'owner' } 
  };

  const { data, error } = await supabase.auth.signUp({
    email: acc.email,
    password: acc.password,
    options: { data: acc.meta }
  });
  
  if (error) {
    console.log(`❌ Gagal buat ${acc.email}:`, error.message);
  } else {
    console.log(`✅ Sukses buat ${acc.email} (ID: ${data.user?.id})`);
    
    // Update profile with the correct role
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: acc.meta.role })
      .eq('id', data.user.id);
      
    if (updateErr) {
      console.log(`   ⚠️ Gagal update profile role untuk ${acc.email}:`, updateErr.message);
    } else {
      console.log(`   ✅ Profile role diupdate ke ${acc.meta.role}`);
    }
  }
  console.log("Selesai!");
}

main();
