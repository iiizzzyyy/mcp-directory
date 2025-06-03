-- Create server metrics table for storing collected metrics data
CREATE TABLE IF NOT EXISTS server_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('count', 'gauge', 'histogram', 'distribution')),
  metric_tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create daily aggregated metrics for faster dashboard queries
CREATE TABLE IF NOT EXISTS server_metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  min_value FLOAT,
  max_value FLOAT,
  avg_value FLOAT,
  sum_value FLOAT,
  count_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a table for server events and status changes
CREATE TABLE IF NOT EXISTS server_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('status_change', 'version_change', 'restart', 'outage', 'maintenance', 'error')),
  previous_value TEXT,
  new_value TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create usage tracking table for detailed API usage stats
CREATE TABLE IF NOT EXISTS server_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('view', 'install', 'test', 'invoke')),
  tool_id UUID REFERENCES server_tools(id),
  details JSONB DEFAULT '{}',
  client_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add metrics column to servers table
ALTER TABLE servers ADD COLUMN IF NOT EXISTS metrics_enabled BOOLEAN DEFAULT true;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS metrics_last_received TIMESTAMPTZ;

-- Create indexes for faster queries
CREATE INDEX idx_server_metrics_server_id ON server_metrics(server_id);
CREATE INDEX idx_server_metrics_metric_name ON server_metrics(metric_name);
CREATE INDEX idx_server_metrics_recorded_at ON server_metrics(recorded_at);
CREATE INDEX idx_server_metrics_daily_server_id ON server_metrics_daily(server_id);
CREATE INDEX idx_server_metrics_daily_metric_date ON server_metrics_daily(metric_date);
CREATE INDEX idx_server_events_server_id ON server_events(server_id);
CREATE INDEX idx_server_events_event_type ON server_events(event_type);
CREATE INDEX idx_server_events_created_at ON server_events(created_at);
CREATE INDEX idx_server_usage_server_id ON server_usage(server_id);
CREATE INDEX idx_server_usage_user_id ON server_usage(user_id);
CREATE INDEX idx_server_usage_created_at ON server_usage(created_at);

-- Add composite indexes for common queries
CREATE UNIQUE INDEX idx_server_metrics_daily_composite ON server_metrics_daily(server_id, metric_name, metric_date);

-- RLS Policies
ALTER TABLE server_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_usage ENABLE ROW LEVEL SECURITY;

-- Everyone can read metrics and events
CREATE POLICY "Public read access for metrics" ON server_metrics
  FOR SELECT USING (true);

CREATE POLICY "Public read access for daily metrics" ON server_metrics_daily
  FOR SELECT USING (true);

CREATE POLICY "Public read access for events" ON server_events
  FOR SELECT USING (true);

-- Usage data is restricted to admins and the user themselves
CREATE POLICY "Public read access for usage" ON server_usage
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (user_id = auth.uid() OR auth.role() = 'service_role')
  );

-- Only authenticated service role can insert/update metrics data
CREATE POLICY "Service role insert for metrics" ON server_metrics
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role insert for daily metrics" ON server_metrics_daily
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update for daily metrics" ON server_metrics_daily
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role insert for events" ON server_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create analytics helper function for dashboard stats
CREATE OR REPLACE FUNCTION get_server_metrics_summary(
  p_server_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  metric_name TEXT,
  avg_value FLOAT,
  max_value FLOAT,
  total_count INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.metric_name,
    AVG(m.metric_value) as avg_value,
    MAX(m.metric_value) as max_value,
    COUNT(*) as total_count
  FROM 
    server_metrics m
  WHERE
    m.server_id = p_server_id AND
    m.recorded_at BETWEEN p_start_date AND p_end_date
  GROUP BY
    m.metric_name;
END;
$$;

-- Function to calculate daily metric aggregates
CREATE OR REPLACE FUNCTION aggregate_daily_metrics()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_yesterday DATE := (CURRENT_DATE - INTERVAL '1 day')::DATE;
  v_processed INTEGER := 0;
BEGIN
  -- Delete any existing aggregates for yesterday (in case of rerun)
  DELETE FROM server_metrics_daily
  WHERE metric_date = v_yesterday;
  
  -- Insert aggregated metrics for yesterday
  INSERT INTO server_metrics_daily (
    server_id, 
    metric_name, 
    metric_type, 
    metric_date, 
    min_value, 
    max_value, 
    avg_value, 
    sum_value, 
    count_value
  )
  SELECT 
    server_id,
    metric_name,
    metric_type,
    v_yesterday as metric_date,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    AVG(metric_value) as avg_value,
    SUM(metric_value) as sum_value,
    COUNT(*) as count_value
  FROM server_metrics
  WHERE 
    recorded_at >= (v_yesterday)::TIMESTAMPTZ AND
    recorded_at < (v_yesterday + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY 
    server_id, 
    metric_name,
    metric_type;
  
  GET DIAGNOSTICS v_processed = ROW_COUNT;
  RETURN v_processed;
END;
$$;
