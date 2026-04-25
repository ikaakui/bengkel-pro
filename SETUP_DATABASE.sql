-- ================================================================
-- INKA OTOSERVICE - FRESH DATABASE SETUP
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ================================================================
-- Versi bersih, dibuat ulang dari scratch
-- Roles: owner | admin | member
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. BRANCHES (Cabang Bengkel)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branches viewable by authenticated" ON branches;
CREATE POLICY "Branches viewable by authenticated" ON branches
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner can manage branches" ON branches;
CREATE POLICY "Owner can manage branches" ON branches
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- ────────────────────────────────────────────────────────────────
-- 2. PROFILES (Data User / Role)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name    TEXT NOT NULL DEFAULT 'User',
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('owner', 'admin', 'member')),
  phone        TEXT,
  total_points INTEGER DEFAULT 0,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function (hindari recursive RLS)
CREATE OR REPLACE FUNCTION get_auth_user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owner can view all profiles" ON profiles;
CREATE POLICY "Owner can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin can view branch profiles" ON profiles;
CREATE POLICY "Admin can view branch profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owner can update all profiles" ON profiles;
CREATE POLICY "Owner can update all profiles" ON profiles
  FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin and Owner can insert profiles" ON profiles;
CREATE POLICY "Admin and Owner can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
    OR auth.uid() = id
  );

-- ────────────────────────────────────────────────────────────────
-- 3. AUTO-CREATE PROFILE ON REGISTER
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, branch_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    (NEW.raw_user_meta_data->>'branch_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- 4. APP SETTINGS (Konfigurasi Aplikasi)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings viewable by authenticated" ON app_settings;
CREATE POLICY "Settings viewable by authenticated" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner can manage settings" ON app_settings;
CREATE POLICY "Admins and Owner can manage settings" ON app_settings
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin', 'spv', 'admin_bsd', 'admin_depok')
  );

-- Default settings
INSERT INTO app_settings (key, value) VALUES
  ('points_per_rupiah', '10000'),
  ('points_enabled',    'true'),
  ('app_name',          'Inka Otoservice'),
  ('montir_ai_quota',   '10'),
  ('montir_ai_days',    '30')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 5. CATALOG (Layanan & Suku Cadang)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('Service', 'Spare Part')),
  price       BIGINT NOT NULL DEFAULT 0,
  cost_price  BIGINT DEFAULT 0,
  description TEXT,
  stock       INTEGER,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catalog viewable by authenticated" ON catalog;
CREATE POLICY "Catalog viewable by authenticated" ON catalog
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner and Admin can manage catalog" ON catalog;
CREATE POLICY "Owner and Admin can manage catalog" ON catalog
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

-- Sample data
INSERT INTO catalog (name, category, price, cost_price, description, stock) VALUES
  ('Ganti Oli Shell Helix',    'Service',    450000, 320000, 'Ganti oli mesin Shell Helix Ultra',   NULL),
  ('Service Rutin 10.000 KM',  'Service',   1200000, 800000, 'Pengecekan menyeluruh berkala 10K KM', NULL),
  ('Kampas Rem Depan (Ori)',    'Spare Part',  350000, 210000, 'Kampas rem depan orisinal',           12),
  ('Filter Udara',              'Spare Part',   85000,  45000, 'Filter udara standar',                20),
  ('Tune Up Mesin',             'Service',    750000, 500000, 'Tune up lengkap mesin',               NULL)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 6. BOOKINGS (Reservasi Pelanggan)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  car_model     TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  booking_code  TEXT,
  booking_type  TEXT DEFAULT 'walk-in',
  service_date  DATE NOT NULL,
  service_time  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  member_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage all bookings" ON bookings;
CREATE POLICY "Owner can manage all bookings" ON bookings
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin can manage branch bookings" ON bookings;
CREATE POLICY "Admin can manage branch bookings" ON bookings
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

DROP POLICY IF EXISTS "Member can view own bookings" ON bookings;
CREATE POLICY "Member can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Member can insert own bookings" ON bookings;
CREATE POLICY "Member can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- ────────────────────────────────────────────────────────────────
-- 7. TRANSACTIONS (Transaksi POS)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  total_amount   BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  status         TEXT DEFAULT 'Paid'
                   CHECK (status IN ('Draft', 'In Progress', 'Paid', 'Cancelled')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage all transactions" ON transactions;
CREATE POLICY "Owner can manage all transactions" ON transactions
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin can manage branch transactions" ON transactions;
CREATE POLICY "Admin can manage branch transactions" ON transactions
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- ────────────────────────────────────────────────────────────────
-- 8. TRANSACTION ITEMS (Detail Item per Transaksi)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  catalog_id     UUID REFERENCES catalog(id) ON DELETE SET NULL,
  qty            INTEGER NOT NULL DEFAULT 1,
  price_at_sale  BIGINT NOT NULL,
  cost_at_sale   BIGINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage all transaction_items" ON transaction_items;
CREATE POLICY "Owner can manage all transaction_items" ON transaction_items
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin can manage branch transaction_items" ON transaction_items;
CREATE POLICY "Admin can manage branch transaction_items" ON transaction_items
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- ────────────────────────────────────────────────────────────────
-- 9. EXPENSES (Beban Operasional)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  category     TEXT NOT NULL
                 CHECK (category IN ('Gaji', 'Listrik', 'Sewa', 'Pemasaran', 'Stok', 'Operasional', 'Lainnya')),
  amount       BIGINT NOT NULL DEFAULT 0,
  description  TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage all expenses" ON expenses;
CREATE POLICY "Owner can manage all expenses" ON expenses
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin can manage branch expenses" ON expenses;
CREATE POLICY "Admin can manage branch expenses" ON expenses
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- ────────────────────────────────────────────────────────────────
-- 10. BRANCH TARGETS (Target Omzet per Cabang)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  month         INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year          INTEGER NOT NULL CHECK (year >= 2020),
  target_amount BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, month, year)
);

ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage branch_targets" ON branch_targets;
CREATE POLICY "Owner can manage branch_targets" ON branch_targets
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

DROP POLICY IF EXISTS "Admin can view branch_targets" ON branch_targets;
CREATE POLICY "Admin can view branch_targets" ON branch_targets
  FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    AND branch_id = get_auth_user_branch()
  );

-- ────────────────────────────────────────────────────────────────
-- 11. REWARDS (Katalog Penukaran Poin)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  points_required INTEGER NOT NULL,
  reward_type     TEXT NOT NULL DEFAULT 'discount'
                    CHECK (reward_type IN ('discount', 'free_service', 'voucher', 'merchandise')),
  discount_value  BIGINT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rewards viewable by authenticated" ON rewards;
CREATE POLICY "Rewards viewable by authenticated" ON rewards
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner can manage rewards" ON rewards;
CREATE POLICY "Owner can manage rewards" ON rewards
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'owner'
  );

-- Sample rewards
INSERT INTO rewards (name, description, points_required, reward_type, discount_value) VALUES
  ('Diskon 50K', 'Potongan Rp 50.000 untuk servis berikutnya', 50, 'discount', 50000),
  ('Diskon 100K', 'Potongan Rp 100.000 untuk servis berikutnya', 100, 'discount', 100000)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 12. POINT TRANSACTIONS (Histori Poin Member)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  points         INTEGER NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjustment', 'bonus', 'expired')),
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member can view own points" ON point_transactions;
CREATE POLICY "Member can view own points" ON point_transactions
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Owner and Admin can manage points" ON point_transactions;
CREATE POLICY "Owner and Admin can manage points" ON point_transactions
  FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin')
  );

-- ────────────────────────────────────────────────────────────────
-- 13. PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id      ON transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status         ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at     ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id     ON transactions (booking_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id     ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_catalog   ON transaction_items (catalog_id);

CREATE INDEX IF NOT EXISTS idx_bookings_branch_id          ON bookings (branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status             ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at         ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_license_plate      ON bookings (license_plate);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code       ON bookings (booking_code);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id          ON expenses (branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at         ON expenses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_role               ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id          ON profiles (branch_id);

CREATE INDEX IF NOT EXISTS idx_catalog_is_active           ON catalog (is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_category            ON catalog (category);

CREATE INDEX IF NOT EXISTS idx_point_tx_member_id          ON point_transactions (member_id);
CREATE INDEX IF NOT EXISTS idx_rewards_is_active           ON rewards (is_active);

-- ────────────────────────────────────────────────────────────────
-- 14. MEMBER FEEDBACK (Kritik & Saran)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name   TEXT,
  subject     TEXT,
  message     TEXT NOT NULL,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE member_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member can insert own feedback" ON member_feedback;
CREATE POLICY "Member can insert own feedback" ON member_feedback
  FOR INSERT WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Member can view own feedback" ON member_feedback;
CREATE POLICY "Member can view own feedback" ON member_feedback
  FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Owner can manage all feedback" ON member_feedback;
CREATE POLICY "Owner can manage all feedback" ON member_feedback
  FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');

-- ────────────────────────────────────────────────────────────────
-- 15. MEMBER VEHICLES (Garasi Member)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  brand_model   TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  year          INTEGER,
  color         TEXT,
  is_primary    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE member_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member can manage own vehicles" ON member_vehicles;
CREATE POLICY "Member can manage own vehicles" ON member_vehicles
  FOR ALL USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Owner and Admin can view member vehicles" ON member_vehicles;
CREATE POLICY "Owner and Admin can view member vehicles" ON member_vehicles
  FOR SELECT USING ((auth.jwt()->'user_metadata'->>'role') IN ('owner', 'admin'));

-- ────────────────────────────────────────────────────────────────
-- ✅ SETUP SELESAI!
-- Langkah selanjutnya:
--   1. Buat akun Owner melalui halaman /register atau Supabase Auth
--   2. Login dan mulai konfigurasi cabang & katalog
-- ────────────────────────────────────────────────────────────────
SELECT 'Database Inka Otoservice berhasil disetup!' AS status;
