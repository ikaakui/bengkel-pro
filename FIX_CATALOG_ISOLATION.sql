-- ================================================================
-- FIX CATALOG BRANCH ISOLATION & RLS
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. DATA CLEANUP: Pindahkan item yang bocor ke cabang masing-masing
-- Kita identifikasi berdasarkan nama Admin yang mengubahnya (updated_by_name)

-- Pindahkan item BSD yang tersimpan sebagai 'Global' ke cabang BSD
UPDATE catalog 
SET branch_id = (SELECT id FROM branches WHERE name ILIKE '%BSD%' LIMIT 1)
WHERE branch_id IS NULL AND updated_by_name ILIKE '%BSD%';

-- Pindahkan item Depok yang tersimpan sebagai 'Global' ke cabang Depok
UPDATE catalog 
SET branch_id = (SELECT id FROM branches WHERE name ILIKE '%Depok%' LIMIT 1)
WHERE branch_id IS NULL AND updated_by_name ILIKE '%Depok%';


-- 2. TIGHTEN RLS POLICIES
-- Pastikan Admin cabang hanya bisa melihat item cabang mereka atau item Global (NULL)

-- Policy untuk SELECT (Melihat data)
DROP POLICY IF EXISTS "Catalog viewable by authenticated" ON catalog;
CREATE POLICY "Catalog viewable by authenticated" ON catalog
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
    OR branch_id = get_auth_user_branch()
    OR branch_id IS NULL
  );

-- Policy untuk ALL (Manage data)
DROP POLICY IF EXISTS "Owner and Admin can manage catalog" ON catalog;
CREATE POLICY "Owner and Admin can manage catalog" ON catalog
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
    OR (
      (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'spv', 'admin_bsd', 'admin_depok')
      AND (branch_id = get_auth_user_branch() OR branch_id IS NULL)
    )
  );

SELECT 'Fix Katalog & RLS Berhasil Diterapkan!' as status;
