#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createServerToolsTable() {
  console.log(chalk.blue('🔧 Creating server_tools table...'));
  
  // Run SQL to create the table
  const { error } = await supabase.rpc('create_server_tools_table', {});
  
  if (error) {
    console.error(chalk.red('❌ Error creating table:'), error);
    
    // Try direct SQL if RPC fails
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS server_tools (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          parameters JSONB,
          detection_method TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS server_tools_server_id_idx ON server_tools(server_id);
        CREATE INDEX IF NOT EXISTS server_tools_name_idx ON server_tools(name);
        
        ALTER TABLE servers ADD COLUMN IF NOT EXISTS tools_count INTEGER DEFAULT 0;
        
        -- Create update trigger for tools_count
        CREATE OR REPLACE FUNCTION update_server_tools_count()
        RETURNS TRIGGER AS $$
        BEGIN
          IF (TG_OP = 'INSERT') THEN
            UPDATE servers SET tools_count = tools_count + 1 WHERE id = NEW.server_id;
          ELSIF (TG_OP = 'DELETE') THEN
            UPDATE servers SET tools_count = tools_count - 1 WHERE id = OLD.server_id;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS server_tools_count_trigger ON server_tools;
        CREATE TRIGGER server_tools_count_trigger
        AFTER INSERT OR DELETE ON server_tools
        FOR EACH ROW
        EXECUTE FUNCTION update_server_tools_count();
      `
    });
    
    if (sqlError) {
      console.error(chalk.red('❌ Error executing SQL:'), sqlError);
      return;
    }
  }
  
  console.log(chalk.green('✅ Server tools table created successfully!'));
}

// Run the function
createServerToolsTable().catch(err => {
  console.error(chalk.red('❌ Fatal error:'), err);
  process.exit(1);
});
