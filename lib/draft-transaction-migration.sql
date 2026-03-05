-- ============================================
-- MIGRATION: Draft Transaction Support
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Fix RLS untuk transactions - tambah policy untuk admin INSERT
-- Drop old policies dulu
DROP POLICY IF EXISTS "Owner access all transactions" ON transactions;
DROP POLICY IF EXISTS "Admin access branch transactions" ON transactions;
DROP POLICY IF EXISTS "Owner access all items" ON transaction_items;
DROP POLICY IF EXISTS "Admin access branch items" ON transaction_items;

-- 2. Recreate policies yang benar
-- Owner full access
CREATE POLICY "Owner access all transactions" ON transactions 
FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');

CREATE POLICY "Owner access all items" ON transaction_items 
FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');

-- Admin access (menggunakan helper function yang sudah ada)
CREATE POLICY "Admin access branch transactions" ON transactions 
FOR ALL USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND branch_id = get_auth_user_branch()
);

-- Admin access transaction_items (via JOIN ke transactions)
CREATE POLICY "Admin access branch items" ON transaction_items 
FOR ALL USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_items.transaction_id 
    AND t.branch_id = get_auth_user_branch()
  )
);

-- 3. Pastikan kolom notes ada untuk draft
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
