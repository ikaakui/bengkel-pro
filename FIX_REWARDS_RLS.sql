-- Fix RLS for rewards table to allow members to see rewards
DROP POLICY IF EXISTS "Rewards viewable by authenticated" ON rewards;
CREATE POLICY "Rewards viewable by authenticated" ON rewards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Ensure management can still do everything
DROP POLICY IF EXISTS "Management can manage rewards" ON rewards;
CREATE POLICY "Management can manage rewards" ON rewards
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin', 'spv')
  );
