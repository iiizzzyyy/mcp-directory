import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// Test config
const BASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const TEST_SERVER_ID = "00000000-0000-0000-0000-000000000000"; // Replace with a real test server ID
const TEST_API_KEY = "test-api-key"; // Replace with a real API key

/**
 * Simulates the metrics collection payload
 * 
 * @returns Test metrics payload
 */
function getTestMetrics() {
  return {
    serverId: TEST_SERVER_ID,
    metrics: [
      {
        name: "api_requests",
        value: 152,
        type: "count",
        tags: { path: "/api/v1", method: "GET" }
      },
      {
        name: "response_time",
        value: 127.5,
        type: "gauge",
        tags: { path: "/api/v1", method: "GET" }
      },
      {
        name: "memory_usage",
        value: 345.6,
        type: "gauge",
        tags: { unit: "MB" }
      }
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Tests the metrics collection endpoint
 */
Deno.test("Metrics Collection - Valid Payload", async () => {
  const response = await fetch(`${BASE_URL}/functions/v1/metrics-collect/${TEST_SERVER_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TEST_API_KEY
    },
    body: JSON.stringify(getTestMetrics())
  });

  assertEquals(response.status, 200);
  
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.metrics_processed, 3);
  assertEquals(data.server_id, TEST_SERVER_ID);
  assertExists(data.timestamp);
});

/**
 * Tests the endpoint with invalid server ID
 */
Deno.test("Metrics Collection - Invalid Server ID", async () => {
  const response = await fetch(`${BASE_URL}/functions/v1/metrics-collect/invalid-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TEST_API_KEY
    },
    body: JSON.stringify(getTestMetrics())
  });

  assertEquals(response.status, 404);
  
  const data = await response.json();
  assertEquals(data.success, false);
  assertExists(data.error);
});

/**
 * Tests the endpoint with invalid API key
 */
Deno.test("Metrics Collection - Invalid API Key", async () => {
  const response = await fetch(`${BASE_URL}/functions/v1/metrics-collect/${TEST_SERVER_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "invalid-api-key"
    },
    body: JSON.stringify(getTestMetrics())
  });

  assertEquals(response.status, 401);
  
  const data = await response.json();
  assertEquals(data.success, false);
  assertExists(data.error);
});

/**
 * Tests the endpoint with invalid payload
 */
Deno.test("Metrics Collection - Invalid Payload", async () => {
  const response = await fetch(`${BASE_URL}/functions/v1/metrics-collect/${TEST_SERVER_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TEST_API_KEY
    },
    body: JSON.stringify({ metrics: [] }) // Empty metrics array
  });

  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.success, false);
  assertExists(data.error);
});
