-- ============================================
-- EXPENSE TRACKER SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('gaji', 'sewa', 'listrik', 'stok', 'lainnya', 'pemasaran', 'operasional')),
    amount NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES profiles(id)
);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Owner can do all on expenses" ON expenses
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- Admin can view and insert for their own branch
CREATE POLICY "Admin can view branch expenses" ON expenses
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin can insert branch expenses" ON expenses
  FOR INSERT WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );
