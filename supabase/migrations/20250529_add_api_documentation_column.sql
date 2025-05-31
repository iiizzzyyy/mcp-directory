-- Add api_documentation JSONB column to servers table
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS api_documentation JSONB;

-- Add comment to document the column's purpose
COMMENT ON COLUMN servers.api_documentation IS 'Structured API documentation for the MCP server, including descriptions and endpoint details';

-- Create index for faster queries on API documentation
CREATE INDEX IF NOT EXISTS idx_servers_api_documentation ON servers USING GIN (api_documentation);

-- Update RLS policies to include the new column
ALTER POLICY "Enable read access for all users" ON servers USING (true);

-- Make sure the search_vector gets updated when api_documentation changes
CREATE OR REPLACE FUNCTION update_servers_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.platform, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.api_documentation->>'description', '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
