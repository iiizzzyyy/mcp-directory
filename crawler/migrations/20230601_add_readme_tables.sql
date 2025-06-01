-- Migration script to add README data tables and columns
-- Run this in the Supabase SQL Editor or via the CLI

-- Add columns to servers table
ALTER TABLE IF EXISTS public.servers 
ADD COLUMN IF NOT EXISTS readme_overview TEXT,
ADD COLUMN IF NOT EXISTS readme_last_updated TIMESTAMP WITH TIME ZONE;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create server_install_instructions table
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

-- Create server_api_documentation table
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

-- Create server_compatibility table
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

-- Set up RLS (Row Level Security) policies
ALTER TABLE public.server_install_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_api_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_compatibility ENABLE ROW LEVEL SECURITY;

-- Create policies for server_install_instructions
CREATE POLICY "Allow public read of server_install_instructions" 
  ON public.server_install_instructions FOR SELECT 
  USING (true);

CREATE POLICY "Allow service role to manage server_install_instructions" 
  ON public.server_install_instructions FOR ALL 
  USING (auth.role() = 'service_role');

-- Create policies for server_api_documentation
CREATE POLICY "Allow public read of server_api_documentation" 
  ON public.server_api_documentation FOR SELECT 
  USING (true);

CREATE POLICY "Allow service role to manage server_api_documentation" 
  ON public.server_api_documentation FOR ALL 
  USING (auth.role() = 'service_role');

-- Create policies for server_compatibility
CREATE POLICY "Allow public read of server_compatibility" 
  ON public.server_compatibility FOR SELECT 
  USING (true);

CREATE POLICY "Allow service role to manage server_compatibility" 
  ON public.server_compatibility FOR ALL 
  USING (auth.role() = 'service_role');
