-- Create a table for storing tools detection logs
CREATE TABLE tools_detection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  detection_source TEXT,
  tools_detected INTEGER,
  duration_ms INTEGER,
  error TEXT,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE tools_detection_logs IS 'Stores logs for tools detection runs';
COMMENT ON COLUMN tools_detection_logs.server_id IS 'Reference to the server that was scanned';
COMMENT ON COLUMN tools_detection_logs.detection_source IS 'Method used to detect tools (standard_mcp_api, alternative_api, github_repository)';
COMMENT ON COLUMN tools_detection_logs.tools_detected IS 'Number of tools detected';
COMMENT ON COLUMN tools_detection_logs.duration_ms IS 'Duration of the detection in milliseconds';
COMMENT ON COLUMN tools_detection_logs.error IS 'Error message if detection failed';
COMMENT ON COLUMN tools_detection_logs.success IS 'Whether the detection was successful';

-- Add indexes for efficient querying
CREATE INDEX tools_detection_logs_server_id_idx ON tools_detection_logs(server_id);
CREATE INDEX tools_detection_logs_created_at_idx ON tools_detection_logs(created_at);
CREATE INDEX tools_detection_logs_detection_source_idx ON tools_detection_logs(detection_source);
CREATE INDEX tools_detection_logs_success_idx ON tools_detection_logs(success);

-- Enable RLS
ALTER TABLE tools_detection_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON tools_detection_logs
  FOR SELECT USING (true);

-- Allow service role to insert
CREATE POLICY "Allow service role to insert" ON tools_detection_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Add last_tools_scan column to servers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'last_tools_scan'
  ) THEN
    ALTER TABLE servers ADD COLUMN last_tools_scan TIMESTAMPTZ;
    
    -- Add an index for efficient filtering
    CREATE INDEX servers_last_tools_scan_idx ON servers(last_tools_scan);
    
    -- Add comment
    COMMENT ON COLUMN servers.last_tools_scan IS 'Timestamp of the last successful tools detection scan';
  END IF;
END
$$;
