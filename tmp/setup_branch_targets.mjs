import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bugycrgmbhiuzagzfkio.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I";
const PROJECT_REF = "bugycrgmbhiuzagzfkio";

async function runSQL() {
    // Use Supabase Management API to run SQL
    const sql = `
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

ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_targets' AND policyname = 'Owner can do all on branch_targets') THEN
        CREATE POLICY "Owner can do all on branch_targets" ON branch_targets
            FOR ALL USING ((auth.jwt()->'user_metadata'->>'role') = 'owner');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_targets' AND policyname = 'Authenticated can view branch_targets') THEN
        CREATE POLICY "Authenticated can view branch_targets" ON branch_targets
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;
`;

    // Try using the database connection URL approach
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        db: { schema: 'public' }
    });

    // Approach: Create a temporary function to execute DDL
    console.log("Step 1: Creating exec_ddl helper function...");

    // Use raw SQL through the Supabase REST API
    const postgrestUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_ddl`;

    // First try creating the function using service role
    const createFnRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query_text: sql })
    });

    if (!createFnRes.ok) {
        console.log("Method 1 failed. Trying app_settings approach...");

        // Alternative: Use app_settings to store branch targets as JSON
        // This works without creating a new table
        console.log("\n🔧 Using app_settings as fallback storage for branch targets...");

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Get branches
        const { data: branches } = await supabase.from('branches').select('id, name');

        if (!branches || branches.length === 0) {
            console.log("No branches found!");
            return;
        }

        // Create initial targets JSON
        const targets = {};
        for (const branch of branches) {
            targets[branch.id] = {
                name: branch.name,
                target: 250000000
            };
        }

        const settingKey = `branch_targets_${currentYear}_${currentMonth}`;

        // Try upsert into app_settings
        const { error: upsertError } = await supabase
            .from('app_settings')
            .upsert({
                key: settingKey,
                value: JSON.stringify(targets),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (upsertError) {
            console.log("Error saving to app_settings:", upsertError.message);
        } else {
            console.log("✅ Branch targets saved to app_settings with key:", settingKey);
            console.log("Targets:", JSON.stringify(targets, null, 2));
        }

        // Also save a general format target
        const { error: generalError } = await supabase
            .from('app_settings')
            .upsert({
                key: 'branch_targets',
                value: JSON.stringify(targets),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (generalError) {
            console.log("Error saving general targets:", generalError.message);
        } else {
            console.log("✅ General branch_targets also saved!");
        }
    }
}

runSQL();
