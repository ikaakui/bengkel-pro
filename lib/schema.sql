-- ============================================
-- BENGKEL PRO - Database Schema
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 0. Tabel Branches (Cabang Bengkel)
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Semua authenticated user bisa baca branches
DROP POLICY IF EXISTS "Branches are viewable by authenticated users" ON branches;
CREATE POLICY "Branches are viewable by authenticated users" ON branches
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya Owner yang bisa manage branches
DROP POLICY IF EXISTS "Owner can manage branches" ON branches;
CREATE POLICY "Owner can manage branches" ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- 1. Tabel Profiles (menyimpan data role per user)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  phone TEXT,
  total_points INTEGER DEFAULT 0,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel App Settings (konfigurasi komisi, dll)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default points per rupiah (1 poin per Rp 10.000)
INSERT INTO app_settings (key, value) VALUES ('points_per_rupiah', '10000')
ON CONFLICT (key) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 3.5. Helper Functions for RLS (Security Definer to avoid recursion)
CREATE OR REPLACE FUNCTION get_auth_user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. RLS Policies untuk profiles
-- User bisa lihat profil sendiri (policy dasar agar bisa login)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Owner bisa lihat semua profiles (cek role dari metadata JWT untuk menghindari circular reference)
DROP POLICY IF EXISTS "Owner can view all profiles" ON profiles;
CREATE POLICY "Owner can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- Admin hanya bisa lihat profiles di cabang yang sama
DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
CREATE POLICY "Admin can view branch profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- User bisa update profile sendiri
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Owner & Admin bisa insert profiles (untuk tambah user baru)
DROP POLICY IF EXISTS "Admin and Owner can insert profiles" ON profiles;
CREATE POLICY "Admin and Owner can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR auth.uid() = id  -- allow self-registration
  );

-- Owner bisa update semua profiles
DROP POLICY IF EXISTS "Owner can update all profiles" ON profiles;
CREATE POLICY "Owner can update all profiles" ON profiles
  FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- 5. RLS Policies untuk app_settings
-- Semua authenticated user bisa baca settings
DROP POLICY IF EXISTS "Settings are viewable by authenticated users" ON app_settings;
CREATE POLICY "Settings are viewable by authenticated users" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya Owner bisa update settings
DROP POLICY IF EXISTS "Only owner can update settings" ON app_settings;
CREATE POLICY "Only owner can update settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- 6. Function untuk auto-create profile saat register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, referral_code, bank_name, bank_account_number, bank_account_name, branch_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'mitra'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'referral_code', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bank_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bank_account_number', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bank_account_name', NULL),
    (NEW.raw_user_meta_data->>'branch_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger: jalankan function saat user baru register
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. Tabel Bookings
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  car_model TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  service_date DATE NOT NULL,
  service_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')) DEFAULT 'pending',
  mitra_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies untuk bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Mitra can view their own bookings
DROP POLICY IF EXISTS "Mitra can view own bookings" ON bookings;
CREATE POLICY "Mitra can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = mitra_id);

-- Mitra can insert their own bookings
DROP POLICY IF EXISTS "Mitra can insert own bookings" ON bookings;
CREATE POLICY "Mitra can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = mitra_id);

-- Owner can view all bookings
DROP POLICY IF EXISTS "Owner can view all bookings" ON bookings;
CREATE POLICY "Owner can view all bookings" ON bookings
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- Admin can view bookings from their branch only
DROP POLICY IF EXISTS "Admin can view branch bookings" ON bookings;
CREATE POLICY "Admin can view branch bookings" ON bookings
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- Owner can update any booking
DROP POLICY IF EXISTS "Owner can update all bookings" ON bookings;
CREATE POLICY "Owner can update all bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Admin can update bookings from their branch only
DROP POLICY IF EXISTS "Admin can update branch bookings" ON bookings;
CREATE POLICY "Admin can update branch bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND branch_id IS NOT NULL
        AND branch_id = bookings.branch_id
    )
  );

-- ============================================
-- 9. Tabel Withdrawals (Penarikan Komisi)
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitra_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies untuk withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Mitra can view their own withdrawals
DROP POLICY IF EXISTS "Mitra can view own withdrawals" ON withdrawals;
CREATE POLICY "Mitra can view own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = mitra_id);

-- Mitra can insert their own withdrawals
DROP POLICY IF EXISTS "Mitra can insert own withdrawals" ON withdrawals;
CREATE POLICY "Mitra can insert own withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = mitra_id);

-- Owner and Admin can view all withdrawals
DROP POLICY IF EXISTS "Owner and Admin can view all withdrawals" ON withdrawals;
CREATE POLICY "Owner and Admin can view all withdrawals" ON withdrawals
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

-- Owner and Admin can update any withdrawal
DROP POLICY IF EXISTS "Owner and Admin can update withdrawals" ON withdrawals;
CREATE POLICY "Owner and Admin can update withdrawals" ON withdrawals
  FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

-- ============================================
-- 10. Tabel Catalog (Layanan & Suku Cadang)
-- ============================================
CREATE TABLE IF NOT EXISTS catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Service', 'Spare Part')),
  price BIGINT NOT NULL,
  description TEXT,
  stock INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies untuk catalog
ALTER TABLE catalog ENABLE ROW LEVEL SECURITY;

-- Semua authenticated user bisa baca catalog
DROP POLICY IF EXISTS "Catalog is viewable by authenticated users" ON catalog;
CREATE POLICY "Catalog is viewable by authenticated users" ON catalog
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya Owner dan Admin yang bisa insert/update/delete catalog
DROP POLICY IF EXISTS "Owner and Admin can manage catalog" ON catalog;
CREATE POLICY "Owner and Admin can manage catalog" ON catalog
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

-- Data Default untuk Catalog
INSERT INTO catalog (name, category, price, description, stock) 
VALUES 
('Ganti Oli Shell Helix', 'Service', 450000, 'Layanan ganti oli mesin menggunakan Shell Helix Ultra.', NULL),
('Kampas Rem Depan (Ori)', 'Spare Part', 350000, 'Kampas rem depan orisinal Toyota/Honda.', 12),
('Service Rutin 10rb KM', 'Service', 1200000, 'Pengecekan menyeluruh dan perawatan berkala 10.000 KM.', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. Migration SQL & Performance Indexes
-- ============================================
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_mitra_id ON transactions (mitra_id);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id ON bookings (branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_mitra_id ON bookings (mitra_id);

CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses (branch_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_catalog_is_active ON catalog (is_active);

-- 12. Tabel Rewards (Katalog Penukaran Poin)
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('discount', 'item')) DEFAULT 'discount',
  discount_value INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabel Point Transactions (Histori Poin)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL, -- Positif untuk earn, negatif untuk redeem
  type TEXT CHECK (type IN ('earn', 'redeem', 'adjustment')),
  description TEXT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_member_id ON point_transactions (member_id);
CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards (is_active);
