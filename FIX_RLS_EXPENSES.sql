-- Jalankan script ini di Supabase Dashboard -> SQL Editor -> New Query
-- Script ini untuk memperbaiki error RLS (Row Level Security) saat Supervisor / Admin menyimpan data pengeluaran (expenses)

-- 1. Mengizinkan 'owner' dan 'spv' (Supervisor) untuk mengelola semua data pengeluaran (expenses)
DROP POLICY IF EXISTS "Owner can manage all expenses" ON expenses;
DROP POLICY IF EXISTS "Owner and SPV can manage all expenses" ON expenses;

CREATE POLICY "Owner and SPV can manage all expenses" ON expenses
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'spv')
  );

-- 2. Memastikan 'admin' tetap bisa mengelola pengeluaran khusus di cabangnya sendiri
DROP POLICY IF EXISTS "Admin can manage branch expenses" ON expenses;
CREATE POLICY "Admin can manage branch expenses" ON expenses
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );
