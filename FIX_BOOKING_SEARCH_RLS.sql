-- ================================================================
-- FIX BOOKING SEARCH BRANCH ISOLATION (RLS)
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. Perbarui Kebijakan RLS agar Admin bisa MELIHAT semua booking pending
-- Ini memungkinkan admin mencari booking dari cabang lain (misal jika ada duplikasi data)
DROP POLICY IF EXISTS "Admin can manage branch bookings" ON bookings;
CREATE POLICY "Admin can manage branch bookings" ON bookings
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'spv') -- Owner & SPV bisa akses semua
    OR (
      (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'admin_bsd', 'admin_depok')
      AND (
        branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()) -- Akses cabang sendiri
        OR status = 'pending' -- IZINKAN MELIHAT SEMUA YANG PENDING UNTUK DIKONFIRMASI
      )
    )
  );

-- 2. Tambahkan Fungsi Pencarian Global (Bypass RLS secara aman)
-- Fungsi ini akan mengembalikan data booking jika kodenya cocok tepat, 
-- meskipun berbeda cabang.
CREATE OR REPLACE FUNCTION search_booking_global(target_code TEXT)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  car_model TEXT,
  license_plate TEXT,
  booking_code TEXT,
  booking_type TEXT,
  service_date DATE,
  service_time TEXT,
  status TEXT,
  member_id UUID,
  branch_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
SECURITY DEFINER -- Berjalan dengan hak akses sistem (bypass RLS)
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM bookings 
  WHERE UPPER(booking_code) = UPPER(target_code)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Berikan akses eksekusi ke user terautentikasi
GRANT EXECUTE ON FUNCTION search_booking_global(TEXT) TO authenticated;

SELECT 'RLS Fix & Global Search Function Created Successfully!' AS status;
