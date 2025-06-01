-- Create a table for caching GitHub repository data
CREATE TABLE github_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_path TEXT NOT NULL,
  content JSONB NOT NULL,
  etag TEXT,
  last_modified TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Add comments
COMMENT ON TABLE github_cache IS 'Caches GitHub repository data to reduce API calls and improve performance';
COMMENT ON COLUMN github_cache.repo_owner IS 'GitHub repository owner';
COMMENT ON COLUMN github_cache.repo_name IS 'GitHub repository name';
COMMENT ON COLUMN github_cache.repo_path IS 'Path within the repository';
COMMENT ON COLUMN github_cache.content IS 'Cached content from the GitHub API';
COMMENT ON COLUMN github_cache.etag IS 'ETag header from GitHub for conditional requests';
COMMENT ON COLUMN github_cache.last_modified IS 'Last-Modified header from GitHub for conditional requests';
COMMENT ON COLUMN github_cache.expires_at IS 'When this cache entry expires';

-- Create a unique constraint on repo path
CREATE UNIQUE INDEX github_cache_repo_path_idx ON github_cache(repo_owner, repo_name, repo_path);

-- Add indexes for efficient querying
CREATE INDEX github_cache_expires_at_idx ON github_cache(expires_at);
CREATE INDEX github_cache_updated_at_idx ON github_cache(updated_at);

-- Enable RLS
ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access" ON github_cache
  FOR SELECT USING (true);

-- Allow service role to insert, update, and delete
CREATE POLICY "Allow service role to insert" ON github_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
  
CREATE POLICY "Allow service role to update" ON github_cache
  FOR UPDATE USING (auth.role() = 'service_role');
  
CREATE POLICY "Allow service role to delete" ON github_cache
  FOR DELETE USING (auth.role() = 'service_role');

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_github_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM github_cache WHERE expires_at < NOW();
END;
$$;

-- Create a cron job to clean expired cache entries daily
-- Note: requires pg_cron extension to be enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule daily cleanup at 3am UTC
    PERFORM cron.schedule('clean-github-cache', '0 3 * * *', 'SELECT clean_expired_github_cache()');
  END IF;
END
$$;
