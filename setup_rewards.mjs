import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function addRewards() {
    console.log("Setting up rewards...");
    
    // 500 poin gratis ganti oli
    // 250 poin free cuci mobil
    const rewards = [
        {
            name: "Gratis Ganti Oli",
            points_required: 500,
            reward_type: "item",
            description: "Dapatkan layanan ganti oli gratis untuk kendaraan Anda.",
            is_active: true
        },
        {
            name: "Gratis Cuci Mobil",
            points_required: 250,
            reward_type: "item",
            description: "Dapatkan layanan cuci mobil gratis untuk kendaraan Anda.",
            is_active: true
        }
    ];

    for (const reward of rewards) {
        // check if exists
        const { data: existing } = await supabase.from('rewards').select('id').eq('name', reward.name).single();
        if (!existing) {
            const { error } = await supabase.from('rewards').insert([reward]);
            if (error) {
                console.error("Error adding", reward.name, ":", error.message);
            } else {
                console.log("Added", reward.name);
            }
        } else {
            console.log(reward.name, "already exists.");
        }
    }
}

addRewards();
