import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: bookings, error: e1 } = await supabase.from('bookings').select('id, customer_name, license_plate, status');
    console.log("Bookings:", bookings?.slice(0, 5), e1);

    const { data: txns, error: e2 } = await supabase.from('transactions').select('id, customer_name, status, booking_id');
    console.log("Txns:", txns?.slice(0, 5), e2);
}
check();
