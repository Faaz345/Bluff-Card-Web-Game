// fix-ambiguous-columns.js
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

async function fixAmbiguousColumns() {
  try {
    // Read the fix SQL file
    const fixSQL = fs.readFileSync('./fix-ambiguous-columns.sql', 'utf8');
    
    console.log('Applying fixes for ambiguous column references...');
    
    // Split the SQL into individual statements
    const statements = fixSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement separately using the REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i+1}/${statements.length}] Executing SQL statement...`);
      
      try {
        // Use the REST API to execute SQL directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ 
            sql: statement + ';' 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error executing statement:`, errorData);
          console.error(`Full statement: ${statement}`);
        }
      } catch (stmtError) {
        console.error(`Error executing statement: ${stmtError.message}`);
        console.error(`Full statement: ${statement}`);
      }
    }
    
    console.log('Fixes for ambiguous column references completed.');
    
    // Create the exec_sql function if it doesn't exist
    console.log('Checking if exec_sql function exists...');
    
    const createExecSqlFn = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    try {
      // Use the REST API to create the exec_sql function
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: createExecSqlFn
      });
      
      if (!response.ok) {
        console.log('Could not create exec_sql function. This is normal if it already exists.');
      } else {
        console.log('Created exec_sql function successfully.');
      }
    } catch (fnError) {
      console.log('Could not create exec_sql function:', fnError.message);
    }
    
  } catch (error) {
    console.error('Error fixing ambiguous columns:', error);
  }
}

fixAmbiguousColumns(); 