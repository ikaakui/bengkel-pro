import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bugycrgmbhiuzagzfkio.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    try {
        // 1. Get any user to be the mitra
        let { data: users } = await supabase.from('profiles').select('*').limit(1);

        if (!users || users.length === 0) {
            console.error('No profiles found. Please register a user first.');
            return;
        }

        const targetUser = users[0];

        // update target user to be a mitra with bank details
        const { error: upError } = await supabase.from('profiles').update({
            role: 'mitra',
            bank_name: 'BCA',
            bank_account_number: '1234567890',
            bank_account_name: targetUser.full_name
        }).eq('id', targetUser.id);

        if (upError) throw upError;
        console.log(`Updated user ${targetUser.full_name} to Mitra role.`);

        // 2. Insert withdrawals
        const withdrawals = [
            {
                mitra_id: targetUser.id,
                amount: 500000,
                status: 'pending',
                notes: 'Simulasi: Penarikan mendesak',
                created_at: new Date().toISOString()
            },
            {
                mitra_id: targetUser.id,
                amount: 250000,
                status: 'approved',
                notes: 'Simulasi: Komisi bulanan',
                created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
                mitra_id: targetUser.id,
                amount: 1000000,
                status: 'rejected',
                notes: 'Simulasi: Rekening tidak aktif',
                created_at: new Date(Date.now() - 172800000).toISOString()
            }
        ];

        const { error: insError } = await supabase.from('withdrawals').insert(withdrawals);
        if (insError) throw insError;

        console.log('Successfully seeded 3 simulation withdrawals.');
    } catch (err) {
        console.error('Error during seeding:', err.message);
    }
}

seed();
