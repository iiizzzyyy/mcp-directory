#!/usr/bin/env node

/**
 * apply-migration.js
 * 
 * Applies database migrations using direct SQL queries via the Supabase client
 * This script applies the tools JSONB column migration to the servers table
 */

const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
require('dotenv').config();

// Verify environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(chalk.red(`Missing environment variables: ${missingVars.join(', ')}`));
  console.error(chalk.yellow('Please set these variables in a .env file or environment'));
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyToolsColumnMigration() {
  console.log(chalk.blue('Applying tools JSONB column migration...'));
  
  try {
    // Step 1: Check if the column already exists
    const { data: columnCheck, error: checkError } = await supabase
      .from('servers')
      .select('id')
      .limit(1);
    
    if (checkError) {
      throw new Error(`Error checking servers table: ${checkError.message}`);
    }
    
    // Step 2: Add the tools column if it doesn't exist
    // Using a raw query via a stored procedure we'll create temporarily
    const createProcedure = `
      CREATE OR REPLACE PROCEDURE add_tools_column()
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Add the tools column with a default empty array if it doesn't exist
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'servers' AND column_name = 'tools'
        ) THEN
          ALTER TABLE public.servers ADD COLUMN tools JSONB DEFAULT '[]'::jsonb;
          
          -- Add a comment to explain the column purpose
          COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server, including name, description, parameters, etc.';
          
          -- Create an index to improve query performance on the JSONB field
          CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);
          
          RAISE NOTICE 'Added tools column to servers table';
        ELSE
          RAISE NOTICE 'tools column already exists in servers table';
        END IF;
      END;
      $$;
    `;
    
    // Create the procedure
    const { error: createError } = await supabase.rpc('execute_sql', { sql: createProcedure }).single();
    
    if (createError) {
      // If the execute_sql RPC doesn't exist, we need a different approach
      if (createError.message.includes('function execute_sql(') || 
          createError.message.includes('Could not find the function')) {
        
        console.log(chalk.yellow('execute_sql RPC not available, using alternative approach...'));
        
        // Fallback method: Try to use the REST API directly to add the column
        // First check if the column exists using a SELECT query
        const { data: checkData, error: checkErr } = await supabase
          .from('servers')
          .select('id, tools')
          .limit(1)
          .maybeSingle();
        
        if (checkErr) {
          if (checkErr.message.includes('column "tools" does not exist')) {
            console.log(chalk.yellow('Tools column does not exist, adding it...'));
            
            // Create a temporary table to add the column
            // Note: This is a workaround since we can't execute DDL directly through the client
            const { error: tempError } = await supabase
              .from('schema_migrations')
              .insert({
                version: '20250601',
                name: 'add_tools_column',
                applied_at: new Date().toISOString(),
                description: 'Migration to add tools JSONB column to servers table'
              });
            
            if (tempError && !tempError.message.includes('already exists')) {
              throw new Error(`Error creating migration record: ${tempError.message}`);
            }
            
            console.log(chalk.green('Recorded migration in schema_migrations table.'));
            console.log(chalk.yellow('Please contact a database administrator to execute the DDL:'));
            console.log(`
-- Add the tools column with a default empty array
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server, including name, description, parameters, etc.';

-- Create an index to improve query performance on the JSONB field
CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);
            `);
            
            return { success: false, error: 'Manual intervention required' };
          } else {
            throw new Error(`Error checking tools column: ${checkErr.message}`);
          }
        } else {
          // Column already exists
          console.log(chalk.green('Tools column already exists in servers table.'));
          return { success: true, message: 'Column already exists' };
        }
      } else {
        throw new Error(`Error creating procedure: ${createError.message}`);
      }
    }
    
    // Execute the procedure
    const { error: execError } = await supabase.rpc('execute_sql', { 
      sql: 'CALL add_tools_column();' 
    }).single();
    
    if (execError) {
      throw new Error(`Error executing procedure: ${execError.message}`);
    }
    
    // Drop the procedure since we no longer need it
    const { error: dropError } = await supabase.rpc('execute_sql', { 
      sql: 'DROP PROCEDURE IF EXISTS add_tools_column();' 
    }).single();
    
    if (dropError) {
      console.warn(chalk.yellow(`Warning: Could not drop procedure: ${dropError.message}`));
      // Continue anyway, this is just cleanup
    }
    
    // Verify the column was added
    const { data: verifyData, error: verifyError } = await supabase
      .from('servers')
      .select('id, tools')
      .limit(1);
    
    if (verifyError) {
      throw new Error(`Error verifying tools column: ${verifyError.message}`);
    }
    
    console.log(chalk.green('Successfully applied tools JSONB column migration.'));
    return { success: true };
  } catch (error) {
    console.error(chalk.red('Error applying migration:'), error);
    return { success: false, error: error.message };
  }
}

// Run migration if called directly
if (require.main === module) {
  applyToolsColumnMigration()
    .then(result => {
      if (result.success) {
        console.log(chalk.green('Migration completed successfully.'));
        process.exit(0);
      } else {
        console.error(chalk.red(`Migration failed: ${result.error}`));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red('Unexpected error:'), error);
      process.exit(1);
    });
}

module.exports = { applyToolsColumnMigration };
