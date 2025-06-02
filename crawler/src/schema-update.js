/**
 * Schema update script for README data integration
 * 
 * This script updates the Supabase database schema to add
 * columns and tables needed for storing README data.
 */
const { supabase } = require('./database');
require('dotenv').config();

/**
 * Updates the schema to support README data storage
 */
async function updateSchema() {
  try {
    console.log('Starting schema update for README data integration...');
    
    // Update servers table to add README overview column
    console.log('Adding readme_overview and readme_last_updated columns to servers table...');
    const { error: serversError } = await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE IF EXISTS public.servers 
        ADD COLUMN IF NOT EXISTS readme_overview TEXT,
        ADD COLUMN IF NOT EXISTS readme_last_updated TIMESTAMP WITH TIME ZONE;
      `
    });
    
    if (serversError) {
      console.error('Error updating servers table:', serversError);
      return false;
    }
    
    // Create server_install_instructions table if it doesn't exist
    console.log('Creating server_install_instructions table if it doesn\'t exist...');
    const { error: installError } = await supabase.rpc('execute_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.server_install_instructions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
          instructions TEXT,
          code_blocks JSONB DEFAULT '[]'::JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT server_install_instructions_server_id_key UNIQUE (server_id)
        );
        
        -- Add comment
        COMMENT ON TABLE public.server_install_instructions IS 'Stores installation instructions extracted from README files';
      `
    });
    
    if (installError) {
      console.error('Error creating server_install_instructions table:', installError);
      return false;
    }
    
    // Create server_api_documentation table if it doesn't exist
    console.log('Creating server_api_documentation table if it doesn\'t exist...');
    const { error: apiError } = await supabase.rpc('execute_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.server_api_documentation (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
          documentation TEXT,
          endpoints JSONB DEFAULT '[]'::JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT server_api_documentation_server_id_key UNIQUE (server_id)
        );
        
        -- Add comment
        COMMENT ON TABLE public.server_api_documentation IS 'Stores API documentation extracted from README files';
      `
    });
    
    if (apiError) {
      console.error('Error creating server_api_documentation table:', apiError);
      return false;
    }
    
    // Create server_compatibility table if it doesn't exist
    console.log('Creating server_compatibility table if it doesn\'t exist...');
    const { error: compatError } = await supabase.rpc('execute_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.server_compatibility (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
          compatibility_info TEXT,
          platforms JSONB DEFAULT '[]'::JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT server_compatibility_server_id_key UNIQUE (server_id)
        );
        
        -- Add comment
        COMMENT ON TABLE public.server_compatibility IS 'Stores compatibility information extracted from README files';
      `
    });
    
    if (compatError) {
      console.error('Error creating server_compatibility table:', compatError);
      return false;
    }
    
    console.log('Schema update completed successfully!');
    return true;
  } catch (error) {
    console.error('Error updating schema:', error);
    return false;
  }
}

// Run the schema update
async function run() {
  const success = await updateSchema();
  console.log(`Schema update ${success ? 'succeeded' : 'failed'}.`);
  process.exit(success ? 0 : 1);
}

// Check if this script is being run directly
if (require.main === module) {
  run();
}

module.exports = { updateSchema };
