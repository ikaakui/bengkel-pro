-- Add points_required to catalog table to allow items to be rewards
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0;

-- Update RLS for catalog to ensure members can see it too (if not already)
DROP POLICY IF EXISTS "Catalog viewable by authenticated" ON catalog;
CREATE POLICY "Catalog viewable by authenticated" ON catalog
  FOR SELECT USING (auth.role() = 'authenticated');
