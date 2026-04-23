-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
