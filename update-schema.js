// update-schema.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  try {
    // Read the schema SQL file
    const schemaSQL = fs.readFileSync('./supabase/schema.sql', 'utf8');
    
    console.log('Applying schema changes...');
    
    // Execute each SQL statement separately
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql: statement + ';' 
      });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.warn(`Warning: ${error.message}`);
        } else {
          console.error(`Error executing statement: ${error.message}`);
        }
      }
    }
    
    console.log('Schema update completed.');
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

updateSchema(); 