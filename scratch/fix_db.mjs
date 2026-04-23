import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabase() {
  console.log("Adding image_url column to rewards table...");
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: 'ALTER TABLE rewards ADD COLUMN IF NOT EXISTS image_url TEXT;'
  });

  if (error) {
    // If RPC doesn't exist, we might have to use another way or tell user
    console.error("Error using RPC:", error.message);
    console.log("Please run this SQL in Supabase Dashboard:");
    console.log("ALTER TABLE rewards ADD COLUMN IF NOT EXISTS image_url TEXT;");
  } else {
    console.log("Successfully added image_url column.");
  }
}

fixDatabase();
