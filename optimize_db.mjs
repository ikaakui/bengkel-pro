import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function optimizeDatabase() {
    console.log('--- Optimizing Database Performance ---');

    // We can't run raw SQL directly via Supabase JS without an RPC.
    // Let's check if there's an 'exec_sql' or similar RPC.
    // Usually, developers create one. If not, I'll provide the SQL for the user.

    const sql = `
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_mitra_id ON transactions (mitra_id);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id ON bookings (branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_mitra_id ON bookings (mitra_id);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses (branch_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
  `;

    console.log('Required SQL Indexes:');
    console.log(sql);

    // Since I cannot run raw SQL here without a known RPC, 
    // I will try to use the 'query' RPC if it exists, or just log it.
    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.warn('RPC exec_sql not found or failed. Please run the SQL manually in Supabase SQL Editor.');
            console.error(error.message);
        } else {
            console.log('✅ Successfully applied indexes via RPC!');
        }
    } catch (err) {
        console.warn('Could not execute SQL via RPC. Logging SQL for manual execution.');
    }
}

optimizeDatabase();
