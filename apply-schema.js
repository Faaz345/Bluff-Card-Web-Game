// apply-schema.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applySchema() {
  // Read environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials in environment variables.');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }

  // Create Supabase client with service role key (admin privileges)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the schema SQL file
    const schemaSQL = fs.readFileSync('./supabase/schema.sql', 'utf8');
    
    console.log('Applying schema changes...');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error applying schema:', error);
      process.exit(1);
    }
    
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applySchema(); 