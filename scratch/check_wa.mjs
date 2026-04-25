import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bugycrgmbhiuzagzfkio.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Z3ljcmdtYmhpdXphZ3pma2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTE1NjUsImV4cCI6MjA4Nzg2NzU2NX0.daGhpPgnIV99cURXHKdRFokQWK18IvJ4GhZPBWseaYY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWA() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'owner_wa_number')
    .maybeSingle()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data found:', data)
  }
}

checkWA()
