-- ============================================
-- BENGKEL PRO - Migration: Multi-Branch System
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- Jalankan SEBELUM menggunakan fitur multi-cabang
-- ============================================

-- 1. Buat tabel branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branches are viewable by authenticated users" ON branches;
CREATE POLICY "Branches are viewable by authenticated users" ON branches
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner can manage branches" ON branches;
CREATE POLICY "Owner can manage branches" ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- 2. Tambah kolom branch_id ke profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- 3. Tambah kolom branch_id ke bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- 4. Update RLS Policies untuk profiles (branch-aware)
-- Hapus policy lama
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Owner bisa lihat semua profiles
DROP POLICY IF EXISTS "Owner can view all profiles" ON profiles;
CREATE POLICY "Owner can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- Admin hanya bisa lihat profiles di cabang yang sama
DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
CREATE POLICY "Admin can view branch profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.branch_id IS NOT NULL
        AND p.branch_id = profiles.branch_id
    )
  );

-- User bisa lihat profil sendiri
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 5. Update RLS Policies untuk bookings (branch-aware)
-- Hapus policy lama
DROP POLICY IF EXISTS "Owner and Admin can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Owner and Admin can update bookings" ON bookings;

-- Owner can view all bookings
DROP POLICY IF EXISTS "Owner can view all bookings" ON bookings;
CREATE POLICY "Owner can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Admin can view bookings from their branch only
DROP POLICY IF EXISTS "Admin can view branch bookings" ON bookings;
CREATE POLICY "Admin can view branch bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND branch_id IS NOT NULL
        AND branch_id = bookings.branch_id
    )
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

-- 6. Update handle_new_user function untuk include branch_id
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
