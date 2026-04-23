-- ============================================
-- BRANCH TARGETS - Target Omzet per Cabang
-- ============================================

CREATE TABLE IF NOT EXISTS branch_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    target_amount BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, month, year)
);

-- RLS
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Owner can do all on branch_targets" ON branch_targets
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- Admin can view targets for their branch
CREATE POLICY "Admin can view branch_targets" ON branch_targets
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );
