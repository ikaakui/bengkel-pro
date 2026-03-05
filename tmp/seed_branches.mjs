import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bugycrgmbhiuzagzfkio.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MTU2NSwiZXhwIjoyMDg3ODY3NTY1fQ.YW0_rkEhNEuSW9fMNmLdou6bGK6mqvyQgL7UFarbY4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedBranches() {
    try {
        const branches = [
            {
                name: 'Cabang Depok',
                address: 'Jl. Margonda Raya No. 123, Depok, Jawa Barat',
                phone: '021-77889900'
            },
            {
                name: 'Cabang Bekasi',
                address: 'Jl. Ahmad Yani No. 45, Bekasi Sel., Kota Bekasi',
                phone: '021-88997766'
            }
        ];

        const { data, error } = await supabase.from('branches').insert(branches).select();

        if (error) throw error;

        console.log('Successfully seeded branches:', data.map(b => b.name).join(', '));
    } catch (err) {
        console.error('Error seeding branches:', err.message);
    }
}

seedBranches();
