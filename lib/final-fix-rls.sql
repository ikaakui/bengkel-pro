-- ============================================
-- FINAL FIX: RLS Infinite Recursion for Profiles
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Bersihkan semua aturan lama pada tabel profiles
DROP POLICY IF EXISTS "Owner can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and Owner can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Owner can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- 2. Buat fungsi pembantu yang AMAN (Security Definer)
-- Ini diperlukan untuk mengambil data tanpa memicu RLS rekursif
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Buat aturan baru yang BERSIH (Tanpa subquery langsung ke tabel sendiri)

-- A. Setiap user bisa lihat data sendiri
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- B. Owner bisa lihat & update SEMUA data (Cek lewat JWT demi kecepatan & menghindari loop)
CREATE POLICY "Owner access all" ON profiles
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- C. Admin bisa lihat data di cabang yang sama (Cek lewat fungsi pembantu)
CREATE POLICY "Admin view branch profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- D. Izin Insert (Pendaftaran)
CREATE POLICY "Allow self registration" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );
