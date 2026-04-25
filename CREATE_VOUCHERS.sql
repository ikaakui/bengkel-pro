-- Create reward_vouchers table
CREATE TABLE IF NOT EXISTS reward_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
    reward_name TEXT NOT NULL,
    voucher_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    branch_id TEXT -- 'BSD' or 'DEPOK'
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_voucher_code ON reward_vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_member_id ON reward_vouchers(member_id);

-- Enable RLS
ALTER TABLE reward_vouchers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own vouchers" 
    ON reward_vouchers FOR SELECT 
    USING (auth.uid() = member_id);

CREATE POLICY "Admins/Owners can view all vouchers" 
    ON reward_vouchers FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'owner', 'spv')
        )
    );

CREATE POLICY "Admins/Owners can update vouchers" 
    ON reward_vouchers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'owner', 'spv')
        )
    );
