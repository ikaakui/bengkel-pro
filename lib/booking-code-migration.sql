-- ============================================
-- Migration: Booking Code System
-- Tambah kolom booking_code dan booking_type
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Tambah kolom booking_code (unique per booking)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_code TEXT UNIQUE;

-- 2. Tambah kolom booking_type (referral dari mitra / direct walk-in)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT 
  DEFAULT 'referral' CHECK (booking_type IN ('referral', 'direct'));

-- 3. RLS: Admin bisa insert booking direct ke cabangnya
DROP POLICY IF EXISTS "Admin can insert branch bookings" ON bookings;
CREATE POLICY "Admin can insert branch bookings" ON bookings
  FOR INSERT WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- 4. Owner bisa insert booking ke cabang manapun
DROP POLICY IF EXISTS "Owner can insert any booking" ON bookings;
CREATE POLICY "Owner can insert any booking" ON bookings
  FOR INSERT WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- 5. Generate booking_code untuk booking yang sudah ada (backfill)
-- Ini opsional, hanya jika ada data booking lama
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn,
         CASE WHEN mitra_id IS NOT NULL THEN 'referral' ELSE 'direct' END AS btype
  FROM bookings WHERE booking_code IS NULL
)
UPDATE bookings b
SET booking_code = 'BK-OLD-' || LPAD(n.rn::TEXT, 4, '0'),
    booking_type = n.btype
FROM numbered n
WHERE b.id = n.id;
