-- ==============================================================================
-- SCRIPT BUAT AKUN OTOMATIS BESERTA CABANGNYA
-- Jalankan script ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Perbarui batasan "Role" agar mendukung admin_depok, admin_bsd, dan spv
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'admin', 'admin_depok', 'admin_bsd', 'spv', 'member'));

-- 2. Buat Cabang Depok & BSD jika belum ada
INSERT INTO public.branches (id, name, address)
VALUES 
  (gen_random_uuid(), 'Cabang Depok', 'Depok'),
  (gen_random_uuid(), 'Cabang BSD', 'BSD')
ON CONFLICT DO NOTHING;

-- 3. Hapus email lama jika sudah ada (mencegah error duplikat)
DELETE FROM auth.users WHERE email IN (
  'owner@inka.com', 
  'depok@inka.com', 
  'bsd@inka.com', 
  'spv@inka.com', 
  'member@inka.com'
);

-- 4. Buat Akun & Otomatis Terhubung ke Cabang
DO $$
DECLARE
  v_depok_id UUID;
  v_bsd_id UUID;
BEGIN
  -- Ambil ID Cabang
  SELECT id INTO v_depok_id FROM public.branches WHERE name = 'Cabang Depok' LIMIT 1;
  SELECT id INTO v_bsd_id FROM public.branches WHERE name = 'Cabang BSD' LIMIT 1;

  -- A. Insert Owner
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@inka.com', crypt('inka2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Owner Inka","role":"owner"}', now(), now());

  -- B. Insert Admin Depok
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'depok@inka.com', crypt('inka2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name','Admin Depok','role','admin_depok','branch_id', v_depok_id), now(), now());

  -- C. Insert Admin BSD
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bsd@inka.com', crypt('inka2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name','Admin BSD','role','admin_bsd','branch_id', v_bsd_id), now(), now());

  -- D. Insert SPV
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'spv@inka.com', crypt('inka2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Supervisor Inka","role":"spv"}', now(), now());

  -- E. Insert Member
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@inka.com', crypt('inka2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Member Setia","role":"member"}', now(), now());
END $$;
