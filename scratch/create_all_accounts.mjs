import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createAccount(email, password, fullName, role) {
  console.log(`Mencoba membuat akun: ${email} (${role})...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      }
    }
  });

  if (error) {
    console.log(`   ❌ ${email}: ${error.message}`);
  } else {
    console.log(`   ✅ ${email}: Sukses! (ID: ${data.user?.id})`);
  }
}

async function main() {
  console.log("--- PROSES PEMBUATAN AKUN INKA OTOSERVICE ---");
  
  await createAccount('owner@inka.com', 'inka2026', 'Owner Inka', 'owner');
  await createAccount('depok@inka.com', 'inka2026', 'Admin Depok', 'admin_depok');
  await createAccount('bsd@inka.com', 'inka2026', 'Admin BSD', 'admin_bsd');
  await createAccount('spv@inka.com', 'inka2026', 'Supervisor Inka', 'spv');
  await createAccount('member@inka.com', 'inka2026', 'Member Setia', 'member');

  console.log("--- SELESAI ---");
}

main();
