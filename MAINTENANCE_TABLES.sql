-- ================================================================
-- MAINTENANCE MODULE TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS maintenance_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name        TEXT NOT NULL,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  last_maintenance  DATE,
  next_maintenance  DATE,
  status            TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('urgent', 'scheduled', 'done')),
  technician        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maintenance_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maintenance assets viewable by authenticated" ON maintenance_assets;
CREATE POLICY "Maintenance assets viewable by authenticated" ON maintenance_assets
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner and Admin can manage maintenance assets" ON maintenance_assets;
CREATE POLICY "Owner and Admin can manage maintenance assets" ON maintenance_assets
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  maintenance_date  DATE DEFAULT CURRENT_DATE,
  technician        TEXT,
  description       TEXT,
  status            TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maintenance logs viewable by authenticated" ON maintenance_logs;
CREATE POLICY "Maintenance logs viewable by authenticated" ON maintenance_logs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner and Admin can manage maintenance logs" ON maintenance_logs;
CREATE POLICY "Owner and Admin can manage maintenance logs" ON maintenance_logs
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

-- Sample data
INSERT INTO maintenance_assets (asset_name, status, last_maintenance, next_maintenance)
VALUES 
('Kompresor Krisbow 5HP', 'urgent', '2024-03-10', '2024-04-10'),
('Two Post Lift A', 'scheduled', '2024-02-15', '2024-05-15'),
('Scanner OBD II Pro', 'done', '2024-04-01', '2024-07-01'),
('Impact Wrench Cordless', 'scheduled', '2024-03-20', '2024-04-20')
ON CONFLICT DO NOTHING;
