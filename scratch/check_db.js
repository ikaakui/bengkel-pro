
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bugycrgmbhiuzagzfkio.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: branches } = await supabase.from('branches').select('*');
    console.log('Branches:', branches);
    
    const { data: bookings } = await supabase.from('bookings').select('booking_code, branch_id').limit(5);
    console.log('Bookings:', bookings);
}
check();
