# MCP Directory Real-Time Metrics System

## Overview

The MCP Directory metrics system provides real-time data collection, processing, and visualization for server performance, usage analytics, and health monitoring. This system helps MCP server authors understand their server's performance and usage patterns while giving directory users insights into server reliability and popularity.

## Architecture

The metrics system consists of several interconnected components:

### Database Schema

- **server_metrics**: Raw metrics data collected from servers
- **server_metrics_daily**: Aggregated daily metrics for efficient dashboard queries
- **server_events**: Significant server events (restarts, deployments, config changes)
- **server_usage**: User interactions with servers (views, installations, tool usage)

### Edge Functions

- **metrics-collect**: Securely receives and stores metrics from MCP servers
- **metrics-aggregate**: Processes raw metrics into aggregated statistics
- **metrics-fetch**: Retrieves and formats metrics data for UI visualization
- **usage-track**: Records user interactions with MCP servers

### Frontend Components

- **MetricsTab**: UI component displaying server metrics and charts
- **metrics-client**: Client library for interacting with metrics API endpoints

## Security

The metrics system implements multiple security layers:

1. **API Key Authentication**: Each server has a unique API key verified on metrics submission
2. **Webhook Signature Verification**: HMAC signatures verify payload authenticity
3. **Row Level Security (RLS)**: Database policies restrict access to metrics data
4. **Data Privacy**: User data is anonymized to protect privacy

## Usage Flow

### Server Authors

1. MCP server authors integrate their server with the metrics API
2. Servers periodically submit performance metrics via the `metrics-collect` endpoint
3. Authors can view detailed analytics on the metrics tab of their server page

### Directory Users

1. User actions (page views, installations, tool usage) are tracked via `usage-track`
2. Users can view server performance metrics on the server detail page
3. Metrics provide transparency into server reliability and popularity

## Implementation Details

### Metrics Collection

Each MCP server can submit metrics using a secure POST request:

```typescript
// Example metrics collection payload
const payload = {
  server_id: "server-123",
  metrics: [
    {
      name: "response_time",
      value: 120.5,
      type: "gauge",
      tags: { endpoint: "query" },
      timestamp: "2025-06-02T14:30:00Z"
    }
  ]
};
```

### Data Aggregation

Raw metrics are automatically aggregated daily for efficient dashboard queries:

- Minimum, maximum, average values
- Sum and count for statistical analysis
- Retention policies to manage data growth

### Metrics Types

The system supports various metric types:

- **Counters**: Cumulative metrics (API calls, requests, errors)
- **Gauges**: Point-in-time measurements (memory usage, CPU load)
- **Timers**: Duration measurements (response times, processing delays)

## API Reference

### Metrics Collection API

- **Endpoint**: `/functions/v1/metrics-collect`
- **Method**: POST
- **Authentication**: API key + webhook signature
- **Payload**: Server ID and array of metrics

### Metrics Fetch API

- **Endpoint**: `/functions/v1/metrics-fetch`
- **Method**: GET
- **Parameters**: 
  - `server_id`: ID of the server
  - `period`: Time period ('1h', '6h', '12h', '1d', '7d', '30d', '90d')
  - `metrics`: Optional comma-separated metric names

### Usage Tracking API

- **Endpoint**: `/functions/v1/usage-track`
- **Method**: POST
- **Payload**: Server ID, action type, and optional details

## Testing

The metrics system includes comprehensive tests:

- Unit tests for individual edge functions
- Integration tests for database operations
- End-to-end system tests via `metrics-system-test.ts`

Run the test suite with:

```bash
deno run --allow-net --allow-env supabase/functions/metrics-system-test.ts <supabase-url> <service-role-key> <api-key>
```

## Extending the System

The metrics system is designed to be extensible:

1. Add new metric types by extending the database schema
2. Implement additional aggregations in `aggregate_daily_metrics()`
3. Create custom visualizations in the frontend MetricsTab component
