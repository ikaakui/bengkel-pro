
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bugycrgmbhiuzagzfkio.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooking() {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_code', 'BK-CAB-3058');
    
    console.log('Data:', data);
    console.log('Error:', error);
    
    const { data: allData } = await supabase
        .from('bookings')
        .select('booking_code')
        .limit(10);
    console.log('Some codes:', allData);
}

checkBooking();
