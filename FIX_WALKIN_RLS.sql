-- ================================================================
-- FIX: Walk-In Registration RLS for Branch Admins
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. BOOKINGS: Izinkan semua admin cabang INSERT & manage
DROP POLICY IF EXISTS "Admin can manage branch bookings" ON bookings;
CREATE POLICY "Admin can manage branch bookings" ON bookings
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
  );

-- 2. TRANSACTIONS: Izinkan semua admin cabang INSERT & manage
DROP POLICY IF EXISTS "Admin can manage branch transactions" ON transactions;
CREATE POLICY "Admin can manage branch transactions" ON transactions
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
  );

-- 3. TRANSACTION_ITEMS: Izinkan semua admin cabang
DROP POLICY IF EXISTS "Admin can manage branch transaction_items" ON transaction_items;
CREATE POLICY "Admin can manage branch transaction_items" ON transaction_items
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
  );

-- 4. PROFILES: Izinkan admin cabang melihat member (untuk search member di walk-in)
DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
CREATE POLICY "Admin can view branch profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
  );

SELECT 'RLS Walk-In berhasil diperbaiki!' AS status;
