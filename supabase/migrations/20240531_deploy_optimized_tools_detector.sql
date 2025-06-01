-- This migration deploys the optimized tools detector by updating the function code
-- Note: Actual function deployment should be done using Supabase CLI or admin dashboard

-- Add comment to document the migration
COMMENT ON FUNCTION "supabase_functions"."tools-detector" IS 'Optimized tools detector with GitHub caching, parallel processing, and detailed logging. Updated: 2024-05-31';

-- Clean up expired GitHub cache entries if any exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_cache'
  ) THEN
    DELETE FROM public.github_cache WHERE expires_at < NOW();
  END IF;
END
$$;

-- Create a scheduled job to clean up the GitHub cache daily
-- This requires pg_cron extension
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Drop the job if it already exists
    BEGIN
      PERFORM cron.unschedule('clean-github-cache');
    EXCEPTION
      WHEN OTHERS THEN
        -- Job doesn't exist, ignore
    END;
    
    -- Schedule daily cleanup at 3am UTC
    PERFORM cron.schedule('clean-github-cache', '0 3 * * *', 'SELECT clean_expired_github_cache()');
  END IF;
END
$$;
