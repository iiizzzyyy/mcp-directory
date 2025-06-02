# MCP Tools Detection System

The MCP Tools Detection system automatically scans and indexes tools from MCP servers, making them discoverable and usable within the MCP Directory.

## Architecture

The tools detection system uses a 3-tier approach to detect and extract tools from MCP servers:

1. **Standard MCP API** - Queries the `/list_resources` endpoint
2. **Alternative Endpoints** - Attempts alternative API patterns if standard fails
3. **GitHub Repository Analysis** - Falls back to analyzing the server's GitHub repository

### Components

- **Database Tables**:
  - `server_tools` - Stores detected tools with metadata
  - `tool_parameters` - Stores parameters for each tool
  - `last_tools_scan` - Timestamp column in servers table

- **Edge Functions**:
  - `tools-detector` - Scheduled function that scans servers and detects tools
  - `server-tools` - API endpoint to retrieve tools for a specific server

- **Frontend**:
  - `ToolsTab.tsx` - Component that displays tools for a server
  - `/api/server-tools` - Next.js API route that proxies to the Supabase edge function

## Database Schema

### server_tools

```sql
CREATE TABLE server_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT,
  endpoint TEXT,
  detection_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### tool_parameters

```sql
CREATE TABLE tool_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES server_tools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Detection Process

1. The `tools-detector` function runs on a schedule (daily at 2:00 AM UTC)
2. For each server, it attempts to detect tools using the 3-tier approach
3. Detected tools and parameters are stored in the database
4. The server's `last_tools_scan` timestamp is updated

## API Endpoints

### GET /server-tools?id={server_id}

Retrieves tools for a specific server, including their parameters.

**Parameters**:
- `id` (required): UUID of the server to fetch tools for

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "tool_name",
      "description": "Tool description",
      "method": "POST",
      "endpoint": "/endpoint",
      "detection_source": "standard_mcp_api",
      "parameters": [
        {
          "name": "parameter_name",
          "description": "Parameter description",
          "type": "string",
          "required": true
        }
      ]
    }
  ]
}
```

## Testing

The tools detection system includes a comprehensive test suite that validates all detection tiers:

1. **Setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Create .env file from example
   cp scripts/.env.example scripts/.env
   # Edit .env to add your Supabase credentials
   
   # Run tests
   npm run test:tools
   ```

2. **Test Categories**:
   - Standard MCP API servers
   - Alternative API endpoint servers
   - GitHub repository-only servers

The test script outputs detailed results showing detection method, execution time, and tools detected vs. expected.

## Security

The tools detection system follows these security practices:

1. **Database**:
   - Row-level security (RLS) policies for public read access
   - Service role required for write operations

2. **API**:
   - JWT validation for authenticated endpoints
   - Input validation to prevent injection attacks

3. **GitHub Access**:
   - Uses GitHub token with minimal permissions
   - Token stored securely in environment variables

## Maintenance

To maintain the tools detection system:

1. **Monitoring**:
   - Check server logs for detection failures
   - Monitor `last_tools_scan` timestamps to ensure regular updates

2. **Manual Triggering**:
   - To manually trigger a scan, invoke the tools-detector function:
     ```bash
     curl -X POST "https://{SUPABASE_URL}/functions/v1/tools-detector" \
       -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
       -H "Content-Type: application/json" \
       -d '{"server_ids": ["uuid"]}'
     ```

3. **Troubleshooting**:
   - Detection issues are logged with the detection tier that failed
   - Check the server's API and GitHub repository URLs
