# MCP Directory Database Schema

This document provides a comprehensive overview of the database schema for the MCP Directory application. It serves as the authoritative reference for database structure, column names, relationships, and access policies.

## Tables Overview

| Table Name | Description |
|------------|-------------|
| `servers` | Main table for MCP server records |
| `server_tools` | Tools provided by MCP servers |
| `tool_parameters` | Parameters for tools |
| `server_metrics` | Metrics related to MCP server performance and usage |
| `health_data` | Health check data for MCP servers |
| `pending_servers` | Queue for servers pending verification or processing |
| `server_install_instructions` | Installation instructions for MCP servers |
| `profiles` | User profiles |

## Important Column Name Clarifications

To avoid confusion, please note these specific column names:

- Use `health_check_url` (not `url`) for the server's health check endpoint
- Use `api_documentation` (not `api_url` or `api_endpoint`) for API documentation reference 
- `github_url` is used consistently across tables

## Table Schemas

### `servers`

Primary table storing MCP server information.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `name` | text | NO | | Server name |
| `description` | text | YES | | Server description |
| `category` | text | YES | | Server category |
| `tags` | text[] | YES | | Array of tags |
| `platform` | text | YES | | Platform (language, framework) |
| `install_method` | text | YES | | Installation method |
| `github_url` | text | YES | | GitHub repository URL |
| `stars` | integer | YES | 0 | GitHub stars count |
| `forks` | integer | YES | 0 | GitHub forks count |
| `open_issues` | integer | YES | 0 | GitHub open issues count |
| `contributors` | integer | YES | 0 | GitHub contributors count |
| `last_updated` | timestamptz | YES | | Last update timestamp |
| `source` | text | YES | | Source of the server information |
| `created_at` | timestamptz | YES | now() | Record creation timestamp |
| `updated_at` | timestamptz | YES | now() | Record update timestamp |
| `search_vector` | tsvector | YES | | Full text search vector |
| `health_check_url` | text | YES | | URL for health checks |
| `api_documentation` | jsonb | YES | | Structured API documentation |
| `slug` | text | YES | | URL-friendly identifier |
| `last_tools_scan` | timestamptz | YES | | Last tool detection scan timestamp |

**Indexes:**
- `servers_pkey` (Primary Key, btree) on `id`
- `servers_github_url_unique` (Unique, btree) on `github_url`
- `idx_servers_github_url` (btree) on `github_url`
- `idx_servers_platform` (btree) on `platform`
- `idx_servers_search` (gin) on `search_vector`
- `idx_servers_slug` (btree) on `slug`
- `idx_servers_slug_search` (btree) on `slug`
- `idx_servers_tags` (gin) on `tags`
- `idx_servers_api_documentation` (gin) on `api_documentation`

**RLS Policies:**
- `Allow anonymous read access` (SELECT): `true`
- `Allow public read access` (SELECT): `true`
- `Allow service role write access` (ALL): `true`

### `server_tools`

Contains tools provided by MCP servers.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `server_id` | uuid | NO | | Foreign key to servers table |
| `name` | text | NO | | Tool name |
| `description` | text | YES | | Tool description |
| `method` | text | YES | 'POST' | HTTP method used by the tool |
| `endpoint` | text | YES | | Tool endpoint URL |
| `detection_source` | text | YES | | Source of tool detection |
| `created_at` | timestamptz | NO | NOW() | Record creation timestamp |
| `updated_at` | timestamptz | NO | NOW() | Record update timestamp |

**Indexes:**
- `idx_server_tools_server_id` on `server_id`

**RLS Policies:**
- `Public read access for tools` (SELECT): `true`
- `Service role insert for tools` (INSERT): `auth.role() = 'service_role'`
- `Service role update for tools` (UPDATE): `auth.role() = 'service_role'`
- `Service role delete for tools` (DELETE): `auth.role() = 'service_role'`

### `tool_parameters`

Contains parameters for tools.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `tool_id` | uuid | NO | | Foreign key to server_tools table |
| `name` | text | NO | | Parameter name |
| `description` | text | YES | | Parameter description |
| `type` | text | YES | 'string' | Parameter data type |
| `required` | boolean | YES | false | Whether parameter is required |
| `created_at` | timestamptz | NO | NOW() | Record creation timestamp |

**Indexes:**
- `idx_tool_parameters_tool_id` on `tool_id`

**RLS Policies:**
- `Public read access for parameters` (SELECT): `true`
- `Service role insert for parameters` (INSERT): `auth.role() = 'service_role'`
- `Service role delete for parameters` (DELETE): `auth.role() = 'service_role'`

## Database Functions

### `update_servers_search_vector()`

Trigger function that updates the search_vector column in the servers table for full-text search.

## Relationships Diagram

```
servers
  ↓ id
  ↓
server_tools
  ↓ id
  ↓
tool_parameters
```

## Common Schema-Related Issues

1. **Column Name Mismatches**: The most common issues are using incorrect column names:
   - Use `health_check_url` instead of `url`
   - Use `api_documentation` instead of `api_url`

2. **Missing Columns**: Always check if a column exists before using it in code:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'servers' AND column_name = 'your_column_name';
   ```

3. **RLS Policy Violations**: Remember that non-service role users can only read data, not modify it.

## Best Practices

1. **Schema Verification**: Before deployment, verify schema compatibility with:
   ```typescript
   const { error } = await supabase.from('table_name').select('column_that_should_exist').limit(1);
   if (error) {
     console.error('Schema verification failed:', error);
     // Take appropriate action
   }
   ```

2. **Use Type Safety**: Define TypeScript interfaces that match your database schema:
   ```typescript
   interface ServerRecord {
     id: string;
     name: string;
     description?: string;
     health_check_url?: string; // Note the correct column name
     api_documentation?: any; // JSONB type
     github_url?: string;
     // ...other fields
   }
   ```

3. **Supabase Client Usage**: When using the Supabase client, explicitly select the columns you need:
   ```typescript
   const { data, error } = await supabase
     .from('servers')
     .select(`
       id, 
       name,
       description,
       health_check_url, 
       api_documentation,
       github_url
     `)
     .eq('id', serverId)
     .single();
   ```

## Change Management

When adding or modifying schema:

1. Create a migration file in `supabase/migrations/` with a timestamped name
2. Update this SCHEMA.md documentation
3. Update any affected TypeScript interfaces
4. Run schema verification tests
