-- Create a table for storing test reports
CREATE TABLE test_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_type TEXT NOT NULL,
  data JSONB NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE test_reports IS 'Stores test execution reports for various system components';
COMMENT ON COLUMN test_reports.test_type IS 'Type of test (e.g., tools_detection, tools_detection_real)';
COMMENT ON COLUMN test_reports.data IS 'Full test report data in JSON format';
COMMENT ON COLUMN test_reports.passed IS 'Whether all tests in the report passed';

-- Add indexes for efficient querying
CREATE INDEX test_reports_test_type_idx ON test_reports(test_type);
CREATE INDEX test_reports_passed_idx ON test_reports(passed);
CREATE INDEX test_reports_created_at_idx ON test_reports(created_at);

-- Enable RLS
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all test reports
CREATE POLICY "Allow public read access" ON test_reports
  FOR SELECT USING (true);

-- Allow service role to insert
CREATE POLICY "Allow service role to insert" ON test_reports
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create a function to create the test_reports table via RPC
-- This is used by the test script if the table doesn't exist
CREATE OR REPLACE FUNCTION create_test_reports_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_reports'
  ) THEN
    -- Create the table
    CREATE TABLE public.test_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      test_type TEXT NOT NULL,
      data JSONB NOT NULL,
      passed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add indexes
    CREATE INDEX test_reports_test_type_idx ON public.test_reports(test_type);
    CREATE INDEX test_reports_passed_idx ON public.test_reports(passed);
    CREATE INDEX test_reports_created_at_idx ON public.test_reports(created_at);
    
    -- Enable RLS
    ALTER TABLE public.test_reports ENABLE ROW LEVEL SECURITY;
    
    -- Add policies
    CREATE POLICY "Allow public read access" ON public.test_reports
      FOR SELECT USING (true);
    
    CREATE POLICY "Allow service role to insert" ON public.test_reports
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END;
$$;
