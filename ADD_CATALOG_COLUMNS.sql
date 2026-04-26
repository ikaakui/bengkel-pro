-- Add missing columns to catalog table
-- Run this in Supabase SQL Editor

ALTER TABLE catalog ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Ensure points_required also exists (from previous updates)
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0;

-- Refresh schema cache notification (comment)
-- SELECT 'Catalog table updated successfully' as status;
