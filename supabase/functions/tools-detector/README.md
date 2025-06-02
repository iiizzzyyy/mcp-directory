# MCP Tools Detector - Optimized Implementation

This directory contains the optimized implementation of the MCP tools detector, which detects tools provided by MCP servers using a 3-tier approach.

## Architecture

The optimized tools detector uses the following components:

1. **Main Edge Function (`index-optimized.ts`)**: 
   - Processes servers in parallel with controlled concurrency
   - Implements the 3-tier detection approach
   - Performs batch database operations
   - Logs detection activities

2. **GitHub Cache Utility (`github-cache.ts`)**:
   - Caches GitHub repository data to reduce API calls
   - Implements conditional requests with ETag/Last-Modified headers
   - Manages cache expiration and cleanup

3. **Logger Utility (`logger.ts`)**:
   - Records detection activities and errors
   - Tracks performance metrics
   - Provides detection statistics

## Database Tables

The system uses the following database tables:

1. **`server_tools`**: Stores detected tools and their parameters
2. **`github_cache`**: Caches GitHub repository data
3. **`tools_detection_logs`**: Logs detection activities
4. **`test_reports`**: Stores test execution reports

## Detection Tiers

The tools detector uses a 3-tier approach:

1. **Standard MCP API** (`/list_resources`): Tries the standard MCP API endpoint first
2. **Alternative Endpoints**: Falls back to alternative endpoints if standard fails
3. **GitHub Repository Analysis**: Uses GitHub repository as a last resort

## Performance Optimizations

The optimized implementation includes:

1. **Parallel Processing**: Processes multiple servers concurrently
2. **GitHub Caching**: Reduces API calls and parsing overhead
3. **Batch Database Operations**: Minimizes database round-trips
4. **Detailed Logging**: Enables monitoring and troubleshooting

## Configuration

The following environment variables can be configured:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_TOKEN=your-github-token
MAX_PARALLEL_SERVERS=5  # Optional, default: 5
CACHE_EXPIRY_HOURS=24   # Optional, default: 24
```

## Testing

Use the following scripts to test the tools detector:

- `npm run test:tools`: Run the basic tools detection tests
- `npm run test:tools:real`: Run tests against real MCP servers

Test reports are saved to the `test_reports` table and as JSON files in the `reports` directory.

## Deployment

Deploy the optimized tools detector using:

```bash
supabase functions deploy tools-detector
```

Or apply the migration script:

```bash
psql -f supabase/migrations/20240531_deploy_optimized_tools_detector.sql
```

## Monitoring

Monitor the tools detector using:

1. The `tools_detection_logs` table for detection activities
2. The `test_reports` table for test results
3. The upcoming admin dashboard (XOM-49)
