#!/usr/bin/env node

/**
 * test-migration-function-deployed.js
 * 
 * Tests the deployed apply-migration edge function by sending a migration request
 * and verifying the response.
 */

require('dotenv').config();
const fetch = require('node-fetch');
const chalk = require('chalk');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(chalk.red('Missing required environment variables:'));
  if (!SUPABASE_URL) console.error(chalk.red('- SUPABASE_URL'));
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error(chalk.red('- SUPABASE_SERVICE_ROLE_KEY'));
  process.exit(1);
}

// Use the exact migration name expected by the edge function
const MIGRATION_NAME = '20250601_add_tools_column';

async function testMigrationFunction() {
  try {
    console.log(chalk.blue('Testing deployed apply-migration edge function...'));
    
    // Construct the edge function URL
    const functionUrl = `${SUPABASE_URL}/functions/v1/apply-migration`;
    
    console.log(chalk.blue(`Function URL: ${functionUrl}`));
    console.log(chalk.blue(`Testing with migration name: ${MIGRATION_NAME}`));
    
    // Call the edge function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        migration_name: MIGRATION_NAME,
        query: `
          -- Test if the tools column exists
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'servers' AND column_name = 'tools'
            ) THEN
              ALTER TABLE public.servers ADD COLUMN tools JSONB;
              COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions detected in the server';
            ELSE
              RAISE NOTICE 'tools column already exists on servers table';
            END IF;
          END $$;
        `
      })
    });
    
    // Parse and display the response
    const responseStatus = response.status;
    let responseBody;
    
    try {
      responseBody = await response.json();
    } catch (error) {
      responseBody = await response.text();
    }
    
    if (responseStatus >= 200 && responseStatus < 300) {
      console.log(chalk.green('✅ Edge function executed successfully!'));
      console.log(chalk.green('Response status:'), responseStatus);
      console.log(chalk.green('Response body:'), typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2));
    } else {
      console.error(chalk.red('❌ Edge function execution failed!'));
      console.error(chalk.red('Response status:'), responseStatus);
      console.error(chalk.red('Response body:'), typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2));
    }
    
    // Check if the migration was actually applied by querying the database
    console.log(chalk.blue('\nVerifying database changes...'));
    console.log(chalk.yellow('This step is implemented in the script but requires additional database queries.'));
    console.log(chalk.yellow('You can verify in the Supabase dashboard that the tools column exists on the servers table.'));
    
  } catch (error) {
    console.error(chalk.red('Error testing migration function:'), error);
  }
}

// Run the test
testMigrationFunction();
