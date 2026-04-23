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

async function main() {
  console.log("Mulai pembuatan akun via API...");

  // Get Branch IDs (assumes they are already created by the previous SQL script)
  const { data: branches } = await supabase.from('branches').select('*');
  let depokId = branches.find(b => b.name === 'Cabang Depok')?.id;
  let bsdId = branches.find(b => b.name === 'Cabang BSD')?.id;

  const accounts = [
    { email: 'owner@inka.com', password: 'inka2026', meta: { full_name: 'Owner Inka', role: 'owner' } },
    { email: 'depok@inka.com', password: 'inka2026', meta: { full_name: 'Admin Depok', role: 'admin_depok', branch_id: depokId } },
    { email: 'bsd@inka.com', password: 'inka2026', meta: { full_name: 'Admin BSD', role: 'admin_bsd', branch_id: bsdId } },
    { email: 'spv@inka.com', password: 'inka2026', meta: { full_name: 'Supervisor Inka', role: 'spv' } },
    { email: 'member@inka.com', password: 'inka2026', meta: { full_name: 'Member Setia', role: 'member' } },
  ];

  for (const acc of accounts) {
    const { data, error } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: { data: acc.meta }
    });
    
    if (error) {
      console.log(`❌ Gagal buat ${acc.email}:`, error.message);
    } else {
      console.log(`✅ Sukses buat ${acc.email} (ID: ${data.user?.id})`);
      
      // Update profile with the correct role (trigger defaults it to member or throws error if constraint)
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: acc.meta.role, branch_id: acc.meta.branch_id })
        .eq('id', data.user.id);
        
      if (updateErr) {
        console.log(`   ⚠️ Gagal update profile role untuk ${acc.email}:`, updateErr.message);
      } else {
        console.log(`   ✅ Profile role diupdate ke ${acc.meta.role}`);
      }
    }
  }
  console.log("Selesai!");
}

main();
