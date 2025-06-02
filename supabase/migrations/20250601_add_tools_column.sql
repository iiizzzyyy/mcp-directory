-- Migration: Add tools JSONB column to servers table
-- Date: 2025-06-01

-- Description: This migration adds a tools JSONB column to the servers table
-- to store complete tool definitions for each MCP server.

-- Add the tools column with a default empty array
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server, including name, description, parameters, etc.';

-- Create an index to improve query performance on the JSONB field
CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);

-- Update existing RLS policies to ensure they apply to the new column
-- (No need to modify RLS here since the existing row-level policies for servers will automatically apply to the new column)

-- Log migration in schema_migrations table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, name, applied_at) 
    VALUES ('20250601', 'add_tools_column', CURRENT_TIMESTAMP);
  END IF;
END $$;
