#!/usr/bin/env node

/**
 * test-migration-function.js
 * 
 * Simulates the apply-migration edge function by executing the migration locally
 * This is useful for testing before actual deployment to Supabase
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

async function applyMigration(migrationName) {
  console.log(chalk.blue(`Applying migration: ${migrationName}...`));
  
  // For the tools column migration
  if (migrationName === '20250601_add_tools_column') {
    const migrationSql = `
      -- Add the tools column with a default empty array
      ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;
      
      -- Add a comment to explain the column purpose
      COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server, including name, description, parameters, etc.';
      
      -- Create an index to improve query performance on the JSONB field
      CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);
    `;

    // Execute the migration
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });
      
      if (error) {
        throw new Error(`Migration failed: ${error.message}`);
      }
      
      // Log the migration in schema_migrations table if it exists
      await supabase.rpc('exec_sql', { 
        sql: `
          DO $$ 
          BEGIN
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schema_migrations') THEN
              INSERT INTO public.schema_migrations (version, name, applied_at) 
              VALUES ('${migrationName.split('_')[0]}', '${migrationName.split('_').slice(1).join('_')}', CURRENT_TIMESTAMP);
            END IF;
          END $$;
        `
      });
      
      console.log(chalk.green(`Successfully applied migration: ${migrationName}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Error applying migration:`, error));
      return false;
    }
  } else {
    console.error(chalk.red(`Unknown migration: ${migrationName}`));
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrationName = process.argv[2] || '20250601_add_tools_column';
  
  applyMigration(migrationName)
    .then(success => {
      if (success) {
        console.log(chalk.green('Migration completed successfully.'));
        // Verify the column was added by querying the table info
        return supabase.rpc('exec_sql', { 
          sql: `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'servers' 
            AND column_name = 'tools';
          `
        });
      } else {
        console.error(chalk.red('Migration failed.'));
        process.exit(1);
      }
    })
    .then(({ data, error }) => {
      if (error) {
        console.error(chalk.red('Error verifying migration:', error));
        process.exit(1);
      }
      
      if (data && data.length > 0) {
        console.log(chalk.green('Verified tools column exists in servers table:'));
        console.table(data);
      } else {
        console.error(chalk.red('Could not verify the tools column was added.'));
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('Unexpected error:', error));
      process.exit(1);
    });
}

module.exports = { applyMigration };
