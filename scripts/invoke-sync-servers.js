// Script to invoke the sync-pulse-servers edge function
// This script authenticates with Supabase and calls the edge function

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../crawler/.env') });

// Debug to see if env vars are loaded
console.log('Env vars loaded:', {
  supabaseUrl: process.env.SUPABASE_URL ? 'Found' : 'Not found',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY ? 'Found' : 'Not found'
});

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function invokeSyncServersFunction() {
  console.log('Invoking sync-pulse-servers function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('sync-pulse-servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('Error invoking function:', error);
      return;
    }

    console.log('Sync completed successfully:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

// Invoke the function
invokeSyncServersFunction();
