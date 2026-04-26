import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBooking() {
  const code = 'BK-BSD-2604-8211';
  console.log('Checking booking:', code);
  
  const { data, error } = await supabase
    .from('bookings')
    .select('*, branches(name)')
    .ilike('booking_code', `%${code.replace('BK-BSD-', '')}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found bookings:', JSON.stringify(data, null, 2));

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('*, branches(name)')
    .eq('role', 'admin_bsd')
    .limit(5);

  console.log('Admin BSD Profiles:', JSON.stringify(adminProfile, null, 2));
}

checkBooking();
