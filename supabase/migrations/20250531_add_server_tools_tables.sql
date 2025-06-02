-- Create tools table
CREATE TABLE IF NOT EXISTS server_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT DEFAULT 'POST',
  endpoint TEXT,
  detection_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tool parameters table
CREATE TABLE IF NOT EXISTS tool_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES server_tools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'string',
  required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add tools scan timestamp to servers table
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_tools_scan TIMESTAMPTZ;

-- Create indexes for faster lookups
CREATE INDEX idx_server_tools_server_id ON server_tools(server_id);
CREATE INDEX idx_tool_parameters_tool_id ON tool_parameters(tool_id);

-- RLS policies
ALTER TABLE server_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_parameters ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Public read access for tools" ON server_tools
  FOR SELECT USING (true);
  
CREATE POLICY "Public read access for parameters" ON tool_parameters
  FOR SELECT USING (true);
  
-- Only authenticated service role can insert/update
CREATE POLICY "Service role insert for tools" ON server_tools
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
  
CREATE POLICY "Service role update for tools" ON server_tools
  FOR UPDATE USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role delete for tools" ON server_tools
  FOR DELETE USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role insert for parameters" ON tool_parameters
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
  
CREATE POLICY "Service role delete for parameters" ON tool_parameters
  FOR DELETE USING (auth.role() = 'service_role');
