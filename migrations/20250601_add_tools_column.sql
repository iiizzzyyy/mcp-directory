-- Add tools JSONB column migration
-- 2025-06-01

-- Add the tools column with a default empty array if it doesn't exist
DO $$
BEGIN
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
