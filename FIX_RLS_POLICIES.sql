-- ================================================================
-- FIX RLS POLICIES FOR BRANCH ADMINS (BSD/DEPOK)
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. Update BOOKINGS Policies
DROP POLICY IF EXISTS "Admin can manage branch bookings" ON bookings;
CREATE POLICY "Admin can manage branch bookings" ON bookings
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
    AND branch_id = get_auth_user_branch()
  );

-- 2. Update TRANSACTIONS Policies
DROP POLICY IF EXISTS "Admin can manage branch transactions" ON transactions;
CREATE POLICY "Admin can manage branch transactions" ON transactions
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
    AND branch_id = get_auth_user_branch()
  );

-- 3. Update TRANSACTION_ITEMS Policies
DROP POLICY IF EXISTS "Admin can manage branch transaction_items" ON transaction_items;
CREATE POLICY "Admin can manage branch transaction_items" ON transaction_items
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
  );

-- 4. Update PROFILES Policies (Select)
DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
CREATE POLICY "Admin can view branch profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
    AND branch_id = get_auth_user_branch()
  );

-- 5. Ensure "admin_bsd" and "admin_depok" can INSERT into bookings
-- (This is often covered by FOR ALL, but good to be explicit for INSERT WITH CHECK if needed)
-- Note: FOR ALL covers INSERT, UPDATE, DELETE, SELECT.

SELECT 'Kebijakan RLS Berhasil Diperbarui untuk Semua Cabang!' AS status;
