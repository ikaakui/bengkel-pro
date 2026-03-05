-- ============================================
-- TRANSACTIONS & EXPENSES for Financial Reports
-- ============================================

-- 1. Tambahkan cost_price ke Katalog
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS cost_price BIGINT DEFAULT 0;

-- 2. Tabel Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  mitra_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- untuk affiliate
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  total_amount BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  status TEXT DEFAULT 'Paid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES catalog(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  price_at_sale BIGINT NOT NULL,
  cost_at_sale BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Expenses (Beban Operasional)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('Gaji', 'Listrik', 'Sewa', 'Pemasaran', 'Lainnya')),
  amount BIGINT NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Owner can see everything
CREATE POLICY "Owner access all transactions" ON transactions FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');
CREATE POLICY "Owner access all items" ON transaction_items FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');
CREATE POLICY "Owner access all expenses" ON expenses FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');

-- Admin can see their branch data
CREATE POLICY "Admin access branch transactions" ON transactions 
FOR ALL USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin access branch expenses" ON expenses 
FOR ALL USING (
  (auth.jwt()->'user_metadata'->>'role') = 'admin' 
  AND branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
);

-- Insert some dummy data for demo
-- (Nanti akan diisi lewat POS)
