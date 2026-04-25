-- Jalankan script ini di Supabase Dashboard -> SQL Editor
-- Untuk memperbaiki masalah simpan reward (Constraint & RLS)

-- 1. Hapus constraint reward_type yang lama jika ada, dan ganti dengan yang baru
-- Kita buat lebih fleksibel dengan mengizinkan 'item'
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_reward_type_check;
ALTER TABLE rewards ADD CONSTRAINT rewards_reward_type_check 
  CHECK (reward_type IN ('discount', 'free_service', 'voucher', 'merchandise', 'item'));

-- 2. Beri izin ke role 'admin' dan 'spv' untuk mengelola reward (RLS)
DROP POLICY IF EXISTS "Owner can manage rewards" ON rewards;
DROP POLICY IF EXISTS "Management can manage rewards" ON rewards;

CREATE POLICY "Management can manage rewards" ON rewards
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin', 'spv')
  );

-- 3. Pastikan kolom-kolom baru tersedia (jika belum ada)
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
