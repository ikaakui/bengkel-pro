-- ============================================
-- FIX: RLS Circular Reference for Profiles
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Owner can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Fix: Use auth.jwt() to check role from user metadata (no circular reference)
-- Everyone can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Owner can view ALL profiles (check role from JWT metadata, not from profiles table)
CREATE POLICY "Owner can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- Admin can view profiles in the same branch
CREATE POLICY "Admin can view branch profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id IS NOT NULL
    AND branch_id = (
      SELECT p.branch_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Also fix the bookings RLS
DROP POLICY IF EXISTS "Owner can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can view branch bookings" ON bookings;
DROP POLICY IF EXISTS "Owner can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can update branch bookings" ON bookings;
DROP POLICY IF EXISTS "Owner and Admin can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Owner and Admin can update bookings" ON bookings;

CREATE POLICY "Owner can view all bookings" ON bookings
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

CREATE POLICY "Admin can view branch bookings" ON bookings
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id IS NOT NULL
    AND branch_id = (
      SELECT p.branch_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Owner can update all bookings" ON bookings
  FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

CREATE POLICY "Admin can update branch bookings" ON bookings
  FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id IS NOT NULL
    AND branch_id = (
      SELECT p.branch_id FROM profiles p WHERE p.id = auth.uid()
    )
  );
