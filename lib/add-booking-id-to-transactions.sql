-- ============================================
-- Add booking_id to transactions table
-- Links POS transactions to bookings
-- ============================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
