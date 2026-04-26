-- Hapus versi lama
DROP FUNCTION IF EXISTS search_booking_global(TEXT);

-- Buat versi "Super Robust" (Mengabaikan tanda hubung dan spasi secara total)
-- Telah diperbaiki: menggunakan "bookings.booking_code" agar tidak rancu (ambiguous)
CREATE OR REPLACE FUNCTION search_booking_global(target_code TEXT)
RETURNS TABLE (
  id UUID, customer_name TEXT, customer_phone TEXT, car_model TEXT, 
  license_plate TEXT, booking_code TEXT, booking_type TEXT, 
  service_date DATE, service_time TEXT, status TEXT, 
  member_id UUID, branch_id UUID, notes TEXT, 
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
) 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM bookings 
  WHERE regexp_replace(UPPER(bookings.booking_code), '[^A-Z0-9]', '', 'g') = regexp_replace(UPPER(target_code), '[^A-Z0-9]', '', 'g')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION search_booking_global(TEXT) TO authenticated;
