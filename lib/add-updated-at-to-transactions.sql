-- ============================================
-- MIGRATION: Add updated_at to transactions
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- ============================================

-- Menambahkan kolom updated_at jika belum ada
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reload schema cache PostgREST agar API Supabase segera mengenal kolom baru ini
NOTIFY pgrst, 'reload schema';
