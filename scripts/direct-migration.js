#!/usr/bin/env node

/**
 * direct-migration.js
 * 
 * A simplified direct migration script to add the tools JSONB column to servers
 * Using REST API and pgSQL
 */

const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

async function applyMigration() {
  console.log(chalk.blue('Starting direct tools column migration...'));
  
  try {
    // Check if we can access the servers table
    console.log(chalk.blue('Checking access to servers table...'));
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id')
      .limit(1);
    
    if (serversError) {
      throw new Error(`Cannot access servers table: ${serversError.message}`);
    }
    
    console.log(chalk.green('✓ Access to servers table confirmed'));
    
    // Try adding a dummy column to test ALTER TABLE permissions
    console.log(chalk.blue('Attempting to add the tools column...'));
    
    // Use PostgreSQL function
    const addColumnQuery = `
      DO $$
      BEGIN
        -- Check if column exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'servers' 
          AND column_name = 'tools'
        ) THEN
          -- Add column if it doesn't exist
          ALTER TABLE public.servers ADD COLUMN tools JSONB DEFAULT '[]'::jsonb;
          
          -- Add comment
          COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server';
          
          -- Add index
          CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);
          
          RAISE NOTICE 'Added tools column successfully';
        ELSE
          RAISE NOTICE 'tools column already exists';
        END IF;
      END;
      $$;
    `;
    
    // Perform request to SQL endpoint directly
    console.log(chalk.blue('Executing SQL migration directly...'));
    
    // Create a temporary PostgreSQL function to run our migration
    const { data, error } = await supabase
      .rpc('pg_sql', { sql: addColumnQuery })
      .single();
    
    if (error) {
      // If pg_sql RPC doesn't exist, try the REST API approach
      if (error.message.includes('pg_sql') || error.message.includes('Could not find the function')) {
        console.log(chalk.yellow('Using REST API approach instead...'));
        
        // Try a different approach: Using a system table to detect if column exists
        try {
          // Check if we can query the column
          const { data, error: toolsColumnError } = await supabase
            .from('servers')
            .select('tools')
            .limit(1);
          
          if (toolsColumnError && toolsColumnError.message.includes('column "tools" does not exist')) {
            console.log(chalk.yellow('Column does not exist. Need manual intervention.'));
            console.log(chalk.blue('Please run the following SQL in the Supabase SQL editor:'));
            console.log(chalk.cyan(`
-- Add the tools column with a default empty array
ALTER TABLE public.servers ADD COLUMN tools JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server';

-- Create an index to improve query performance on the JSONB field
CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);`));
            
            return {
              success: false,
              message: 'Manual SQL execution required. Please run SQL in Supabase SQL editor.'
            };
          } else if (toolsColumnError) {
            throw new Error(`Error checking tools column: ${toolsColumnError.message}`);
          } else {
            console.log(chalk.green('✓ The tools column already exists!'));
            return {
              success: true,
              message: 'Column already exists'
            };
          }
        } catch (innerError) {
          console.error(chalk.red('Error during migration:'), innerError);
          throw innerError;
        }
      } else {
        throw new Error(`Error executing migration SQL: ${error.message}`);
      }
    } else {
      console.log(chalk.green('✓ Migration applied successfully!'));
      return {
        success: true,
        message: 'Migration applied successfully'
      };
    }
  } catch (error) {
    console.error(chalk.red('Migration failed:'), error.message);
    throw error;
  }
}

// Run the migration if script is executed directly
if (require.main === module) {
  applyMigration()
    .then(result => {
      if (result && result.success) {
        console.log(chalk.green(`Migration complete: ${result.message}`));
        process.exit(0);
      } else if (result) {
        console.log(chalk.yellow(`Migration needs attention: ${result.message}`));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    });
}

module.exports = { applyMigration };
