import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import * as mf from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";

// Create mock functions and data for testing
const mockSupabaseData = {
  servers: [
    { id: "test-server-1", name: "Test Server 1" },
    { id: "test-server-2", name: "Test Server 2" },
  ],
  metrics: [
    { 
      server_id: "test-server-1", 
      metric_name: "response_time", 
      metric_value: 120, 
      metric_type: "gauge",
      recorded_at: new Date().toISOString(),
      metric_tags: {}
    },
    { 
      server_id: "test-server-1", 
      metric_name: "api_requests", 
      metric_value: 50, 
      metric_type: "counter",
      recorded_at: new Date().toISOString(),
      metric_tags: {}
    }
  ],
  daily_metrics: [
    {
      server_id: "test-server-1",
      metric_name: "response_time",
      metric_date: new Date().toISOString().split('T')[0],
      min_value: 100,
      max_value: 350,
      avg_value: 220,
      sum_value: 2200,
      count_value: 10,
      metric_tags: {}
    }
  ],
  health_data: [
    {
      server_id: "test-server-1",
      status: "online",
      last_check_time: new Date().toISOString()
    },
    {
      server_id: "test-server-1",
      status: "online",
      last_check_time: new Date(Date.now() - 60000).toISOString()
    }
  ],
  usage_data: [
    {
      server_id: "test-server-1",
      action: "view",
      created_at: new Date().toISOString()
    },
    {
      server_id: "test-server-1",
      action: "install",
      created_at: new Date(Date.now() - 120000).toISOString()
    }
  ]
};

// Setup mock fetch
mf.install();

// Mock Supabase client
function setupMockSupabase() {
  // Mock select
  mf.mock("POST", new RegExp("/rest/v1/.*"), (req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    if (path.includes("/servers")) {
      return new Response(JSON.stringify(mockSupabaseData.servers.filter(s => s.id === "test-server-1")));
    } else if (path.includes("/server_metrics")) {
      return new Response(JSON.stringify(mockSupabaseData.metrics));
    } else if (path.includes("/server_metrics_daily")) {
      return new Response(JSON.stringify(mockSupabaseData.daily_metrics));
    } else if (path.includes("/health_data")) {
      return new Response(JSON.stringify(mockSupabaseData.health_data));
    } else if (path.includes("/server_usage")) {
      return new Response(JSON.stringify(mockSupabaseData.usage_data));
    }
    
    return new Response(JSON.stringify([]));
  });
}

// Mock environment variables
Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key");

Deno.test("metrics-fetch - valid server id", async () => {
  setupMockSupabase();

  const { default: handler } = await import("./index.ts");
  
  const url = new URL("https://example.com/metrics-fetch?server_id=test-server-1&period=7d");
  const request = new Request(url.toString());
  const response = await handler(request);
  const responseData = await response.json();
  
  // Verify response structure
  assertEquals(responseData.success, true);
  assertExists(responseData.metrics);
  assertEquals(responseData.metrics.server_id, "test-server-1");
  assertExists(responseData.metrics.uptime);
  assertExists(responseData.metrics.latency);
  assertExists(responseData.metrics.requests);
});

Deno.test("metrics-fetch - missing server id", async () => {
  const { default: handler } = await import("./index.ts");
  
  const url = new URL("https://example.com/metrics-fetch?period=7d");
  const request = new Request(url.toString());
  const response = await handler(request);
  const responseData = await response.json();
  
  assertEquals(response.status, 400);
  assertEquals(responseData.success, false);
  assertExists(responseData.error);
  assertEquals(responseData.error, "Server ID is required");
});

Deno.test("metrics-fetch - invalid server id", async () => {
  setupMockSupabase();

  const { default: handler } = await import("./index.ts");
  
  const url = new URL("https://example.com/metrics-fetch?server_id=nonexistent-server&period=7d");
  const request = new Request(url.toString());
  const response = await handler(request);
  const responseData = await response.json();
  
  assertEquals(response.status, 404);
  assertEquals(responseData.success, false);
  assertExists(responseData.error);
  assertEquals(responseData.error, "Server not found");
});

Deno.test("metrics-fetch - different time periods", async () => {
  setupMockSupabase();

  const { default: handler } = await import("./index.ts");
  
  const testPeriods = ["1h", "6h", "12h", "1d", "7d", "30d", "90d"];
  
  for (const period of testPeriods) {
    const url = new URL(`https://example.com/metrics-fetch?server_id=test-server-1&period=${period}`);
    const request = new Request(url.toString());
    const response = await handler(request);
    const responseData = await response.json();
    
    assertEquals(responseData.success, true);
    assertEquals(responseData.metrics.period, period);
    assertExists(responseData.metrics.uptime);
  }
});

mf.uninstall();

// Run tests
if (import.meta.main) {
  Deno.test("Run all metrics-fetch tests", async (t) => {
    await t.step("Valid server ID test", async () => {
      await Deno.test("metrics-fetch - valid server id");
    });
    
    await t.step("Missing server ID test", async () => {
      await Deno.test("metrics-fetch - missing server id");
    });
    
    await t.step("Invalid server ID test", async () => {
      await Deno.test("metrics-fetch - invalid server id");
    });
    
    await t.step("Different time periods test", async () => {
      await Deno.test("metrics-fetch - different time periods");
    });
  });
}
