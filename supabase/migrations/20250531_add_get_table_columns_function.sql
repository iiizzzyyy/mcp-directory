-- Function to get table columns for schema validation
-- This helps the test script verify the database structure

CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    (c.is_nullable = 'YES')::BOOLEAN
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public' AND
    c.table_name = table_name
  ORDER BY
    c.ordinal_position;
END;
$$;

-- Grant access to anon users
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT) TO service_role;

COMMENT ON FUNCTION get_table_columns IS 'Helper function for test scripts to verify database schema';
