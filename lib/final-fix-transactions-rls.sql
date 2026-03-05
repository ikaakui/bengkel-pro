-- ============================================
-- FIX: RLS untuk tabel transactions & transaction_items
-- Jalankan SQL ini di Supabase Dashboard -> SQL Editor
-- ============================================

-- 1. Bersihkan semua policy lama
DROP POLICY IF EXISTS "Owner access all transactions" ON transactions;
DROP POLICY IF EXISTS "Admin access branch transactions" ON transactions;
DROP POLICY IF EXISTS "Admin access branch transactions select" ON transactions;
DROP POLICY IF EXISTS "Admin access branch transactions insert" ON transactions;
DROP POLICY IF EXISTS "Admin access branch transactions update" ON transactions;
DROP POLICY IF EXISTS "Owner access all items" ON transaction_items;
DROP POLICY IF EXISTS "Admin access branch items" ON transaction_items;

-- 2. Policy untuk Owner (Bisa melihat & mengelola semua data)
CREATE POLICY "Owner access all transactions" ON transactions 
FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');

CREATE POLICY "Owner access all items" ON transaction_items 
FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');

-- 3. Policy untuk Admin (Menggunakan explicit policy untuk tiap operasi + branch dari JWT)
-- Karena fungsi get_auth_user_branch() mungkin gagal saat operasi INSERT dengan RLS, 
-- kita gunakan auth.jwt()->'user_metadata'->>'branch_id' langsung yang lebih cepat dan bebas loop.

-- SELECT transactions
CREATE POLICY "Admin select transactions" ON transactions 
FOR SELECT USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
);

-- INSERT transactions (Pakai WITH CHECK)
CREATE POLICY "Admin insert transactions" ON transactions 
FOR INSERT WITH CHECK (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
);

-- UPDATE transactions (Pakai USING & WITH CHECK)
CREATE POLICY "Admin update transactions" ON transactions 
FOR UPDATE USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
);

-- SELECT transaction_items (Admin hanya bisa melihat item dari transaksi di cabang mereka)
CREATE POLICY "Admin select items" ON transaction_items 
FOR SELECT USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_items.transaction_id 
    AND t.branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
  )
);

-- INSERT transaction_items
CREATE POLICY "Admin insert items" ON transaction_items 
FOR INSERT WITH CHECK (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_items.transaction_id 
    AND t.branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
  )
);

-- UPDATE transaction_items
CREATE POLICY "Admin update items" ON transaction_items 
FOR UPDATE USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_items.transaction_id 
    AND t.branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
  )
);

-- DELETE transaction_items
CREATE POLICY "Admin delete items" ON transaction_items 
FOR DELETE USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_items.transaction_id 
    AND t.branch_id = (auth.jwt()->'user_metadata'->>'branch_id')::uuid
  )
);
