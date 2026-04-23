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
  console.log("🚀 Memulai Inisialisasi Database Inka Otoservice...");

  // 1. Pastikan Cabang Ada
  console.log("📍 Mengecek Cabang...");
  let { data: branches } = await supabase.from('branches').select('*');
  
  if (!branches || branches.length === 0) {
    console.log("➕ Membuat Cabang Depok & BSD...");
    const { data: newBranches, error: branchErr } = await supabase.from('branches').insert([
      { name: 'Cabang Depok', address: 'Jl. Raya Depok No. 1' },
      { name: 'Cabang BSD', address: 'BSD City, Tangerang' }
    ]).select();
    
    if (branchErr) {
      console.error("❌ Gagal membuat cabang:", branchErr.message);
      return;
    }
    branches = newBranches;
  }
  
  const depokId = branches.find(b => b.name.includes('Depok'))?.id;
  const bsdId = branches.find(b => b.name.includes('BSD'))?.id;

  // 2. Buat Akun-Akun Default
  const accounts = [
    { email: 'owner@inka.com', password: 'inka2026', meta: { full_name: 'Owner Inka', role: 'owner' } },
    { email: 'depok@inka.com', password: 'inka2026', meta: { full_name: 'Admin Depok', role: 'admin_depok', branch_id: depokId } },
    { email: 'bsd@inka.com', password: 'inka2026', meta: { full_name: 'Admin BSD', role: 'admin_bsd', branch_id: bsdId } },
    { email: 'spv@inka.com', password: 'inka2026', meta: { full_name: 'Supervisor Inka', role: 'spv' } },
    { email: 'member@inka.com', password: 'inka2026', meta: { full_name: 'Member Setia', role: 'member' } },
  ];

  console.log("👤 Mendaftarkan Akun...");
  for (const acc of accounts) {
    // Cek apakah user sudah ada di auth (ini sulit via anon key, jadi kita coba signUp saja)
    // Supabase signUp akan error jika user sudah ada
    const { data, error } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: { data: acc.meta }
    });
    
    if (error) {
      if (error.message.includes("already registered")) {
        console.log(`ℹ️  ${acc.email} sudah terdaftar.`);
      } else {
        console.log(`❌ Gagal buat ${acc.email}:`, error.message);
      }
    } else {
      console.log(`✅ Sukses buat ${acc.email}`);
      
      // Update profile role secara eksplisit (untuk memastikan metadata masuk ke tabel profiles)
      if (data.user) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ 
            role: acc.meta.role, 
            branch_id: acc.meta.branch_id,
            full_name: acc.meta.full_name
          })
          .eq('id', data.user.id);
          
        if (updateErr) {
          console.log(`   ⚠️ Gagal sinkronisasi profil untuk ${acc.email}:`, updateErr.message);
        }
      }
    }
  }

  // 3. Inisialisasi Settings
  console.log("⚙️  Mengatur Konfigurasi Dasar...");
  const settings = [
    { key: 'global_logo_url', value: 'https://bugycrgmbhiuzagzfkio.supabase.co/storage/v1/object/public/assets/logo-inka.png' },
    { key: 'points_per_rupiah', value: '1000' },
    { key: 'app_name', value: 'Inka Otoservice' }
  ];

  for (const s of settings) {
    await supabase.from('app_settings').upsert(s);
  }

  console.log("\n✨ Inisialisasi Selesai! Silakan coba login sekarang.");
  console.log("📧 Email: owner@inka.com | depok@inka.com | member@inka.com");
  console.log("🔑 Password: inka2026");
}

main();
