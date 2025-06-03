#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Comprehensive test script for the MCP Directory metrics system
 * 
 * This script tests the complete metrics collection pipeline:
 * 1. Metrics collection endpoint (metrics-collect)
 * 2. Usage tracking endpoint (usage-track)
 * 3. Metrics aggregation (metrics-aggregate)
 * 4. Metrics fetching API (metrics-fetch)
 * 
 * Run with:
 *   deno run --allow-net --allow-env metrics-system-test.ts <supabase-url> <service-role-key> <api-key>
 */

// Test configuration
const TEST_SERVER_ID = "test-metrics-server-1";
const TEST_API_KEY = "test-api-key-for-metrics";
const TEST_WEBHOOK_SECRET = "test-webhook-secret";

// Get Supabase URL and key from command line args
const args = Deno.args;
if (args.length < 3) {
  console.error("Usage: deno run --allow-net --allow-env metrics-system-test.ts <supabase-url> <service-role-key> <api-key>");
  Deno.exit(1);
}

const SUPABASE_URL = args[0];
const SERVICE_ROLE_KEY = args[1];
const API_KEY = args[2]; // API key for the test server

// Utility to measure response time
function measureTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = Date.now();
  return fn().then(result => [result, Date.now() - start]);
}

// Utility for colorized output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Create a test server record if it doesn't exist
async function setupTestServer() {
  console.log(`${colors.bright}${colors.blue}Setting up test server...${colors.reset}`);
  try {
    // Check if server exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/servers?id=eq.${TEST_SERVER_ID}`, {
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    
    const existingServers = await checkResponse.json();
    
    if (existingServers.length === 0) {
      // Create test server
      const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/servers`, {
        method: "POST",
        headers: {
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          id: TEST_SERVER_ID,
          name: "Metrics Test Server",
          description: "A server for testing the metrics system",
          api_key: TEST_API_KEY,
          webhook_secret: TEST_WEBHOOK_SECRET,
          category: "testing",
          tags: ["test", "metrics"],
          version: "1.0.0",
          license: "MIT",
          health_status: "online",
          homepage_url: "https://example.com/metrics-test",
          created_at: new Date().toISOString(),
        }),
      });

      if (createResponse.ok) {
        console.log(`${colors.green}Test server created successfully${colors.reset}`);
      } else {
        console.error(`${colors.red}Failed to create test server: ${await createResponse.text()}${colors.reset}`);
        Deno.exit(1);
      }
    } else {
      console.log(`${colors.green}Test server already exists${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error setting up test server: ${error}${colors.reset}`);
    Deno.exit(1);
  }
}

// Test the metrics collection endpoint
async function testMetricsCollection() {
  console.log(`${colors.bright}${colors.blue}Testing metrics collection endpoint...${colors.reset}`);
  
  const timestamp = new Date().toISOString();
  const payload = {
    server_id: TEST_SERVER_ID,
    metrics: [
      {
        name: "response_time",
        value: 120.5,
        type: "gauge",
        tags: { endpoint: "test" },
        timestamp
      },
      {
        name: "api_requests",
        value: 50,
        type: "counter",
        tags: { endpoint: "test" },
        timestamp
      },
      {
        name: "memory_usage",
        value: 256.75,
        type: "gauge",
        tags: { process: "main" },
        timestamp
      }
    ]
  };
  
  // Create signature for webhook verification
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(TEST_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(JSON.stringify(payload))
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  try {
    const [response, elapsedTime] = await measureTime(() => 
      fetch(`${SUPABASE_URL}/functions/v1/metrics-collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TEST_API_KEY,
          "X-Signature": signatureHex,
        },
        body: JSON.stringify(payload),
      })
    );
    
    const responseData = await response.json();
    
    if (response.ok && responseData.success) {
      console.log(`${colors.green}✓ Metrics collection successful (${elapsedTime}ms)${colors.reset}`);
      console.log(`  Records processed: ${responseData.metrics_inserted}`);
    } else {
      console.error(`${colors.red}✗ Metrics collection failed: ${JSON.stringify(responseData)}${colors.reset}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error testing metrics collection: ${error}${colors.reset}`);
    return false;
  }
}

// Test the usage tracking endpoint
async function testUsageTracking() {
  console.log(`${colors.bright}${colors.blue}Testing usage tracking endpoint...${colors.reset}`);
  
  // Test different usage events
  const events = [
    { serverId: TEST_SERVER_ID, action: "view" },
    { serverId: TEST_SERVER_ID, action: "install", details: { method: "npm" } },
    { serverId: TEST_SERVER_ID, action: "test" }
  ];
  
  let allSuccess = true;
  
  for (const event of events) {
    try {
      const [response, elapsedTime] = await measureTime(() => 
        fetch(`${SUPABASE_URL}/functions/v1/usage-track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        })
      );
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        console.log(`${colors.green}✓ Usage tracking successful for ${event.action} (${elapsedTime}ms)${colors.reset}`);
      } else {
        console.error(`${colors.red}✗ Usage tracking failed for ${event.action}: ${JSON.stringify(responseData)}${colors.reset}`);
        allSuccess = false;
      }
    } catch (error) {
      console.error(`${colors.red}✗ Error testing usage tracking for ${event.action}: ${error}${colors.reset}`);
      allSuccess = false;
    }
  }
  
  return allSuccess;
}

// Test the metrics aggregation endpoint
async function testMetricsAggregation() {
  console.log(`${colors.bright}${colors.blue}Testing metrics aggregation endpoint...${colors.reset}`);
  
  try {
    // Need to use service role key for authentication
    const [response, elapsedTime] = await measureTime(() => 
      fetch(`${SUPABASE_URL}/functions/v1/metrics-aggregate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          retentionDays: 7
        }),
      })
    );
    
    const responseData = await response.json();
    
    if (response.ok && responseData.success) {
      console.log(`${colors.green}✓ Metrics aggregation successful (${elapsedTime}ms)${colors.reset}`);
      console.log(`  Aggregated date: ${responseData.date}`);
    } else {
      console.error(`${colors.red}✗ Metrics aggregation failed: ${JSON.stringify(responseData)}${colors.reset}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error testing metrics aggregation: ${error}${colors.reset}`);
    return false;
  }
}

// Test the metrics fetch endpoint
async function testMetricsFetch() {
  console.log(`${colors.bright}${colors.blue}Testing metrics fetch endpoint...${colors.reset}`);
  
  const periods = ["1h", "1d", "7d"];
  let allSuccess = true;
  
  for (const period of periods) {
    try {
      const [response, elapsedTime] = await measureTime(() => 
        fetch(`${SUPABASE_URL}/functions/v1/metrics-fetch?server_id=${TEST_SERVER_ID}&period=${period}`, {
          headers: {
            "Content-Type": "application/json",
          }
        })
      );
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        console.log(`${colors.green}✓ Metrics fetch successful for period=${period} (${elapsedTime}ms)${colors.reset}`);
      } else {
        console.error(`${colors.red}✗ Metrics fetch failed for period=${period}: ${JSON.stringify(responseData)}${colors.reset}`);
        allSuccess = false;
      }
    } catch (error) {
      console.error(`${colors.red}✗ Error testing metrics fetch for period=${period}: ${error}${colors.reset}`);
      allSuccess = false;
    }
  }
  
  return allSuccess;
}

// Run end-to-end tests for the metrics system
async function runAllTests() {
  console.log(`${colors.bright}${colors.magenta}Starting MCP Directory Metrics System Tests${colors.reset}`);
  console.log(`${colors.dim}Supabase URL: ${SUPABASE_URL}${colors.reset}`);
  console.log(`${colors.dim}Test Server ID: ${TEST_SERVER_ID}${colors.reset}`);
  console.log("-----------------------------------------------");
  
  try {
    // Setup test data
    await setupTestServer();
    console.log("-----------------------------------------------");
    
    // Run tests
    const collectResult = await testMetricsCollection();
    console.log("-----------------------------------------------");
    
    const usageResult = await testUsageTracking();
    console.log("-----------------------------------------------");
    
    const aggregateResult = await testMetricsAggregation();
    console.log("-----------------------------------------------");
    
    const fetchResult = await testMetricsFetch();
    console.log("-----------------------------------------------");
    
    // Summary
    console.log(`${colors.bright}${colors.blue}Test Summary:${colors.reset}`);
    console.log(`Metrics Collection: ${collectResult ? colors.green + "PASS" : colors.red + "FAIL"}${colors.reset}`);
    console.log(`Usage Tracking: ${usageResult ? colors.green + "PASS" : colors.red + "FAIL"}${colors.reset}`);
    console.log(`Metrics Aggregation: ${aggregateResult ? colors.green + "PASS" : colors.red + "FAIL"}${colors.reset}`);
    console.log(`Metrics Fetching: ${fetchResult ? colors.green + "PASS" : colors.red + "FAIL"}${colors.reset}`);
    
    const overallResult = collectResult && usageResult && aggregateResult && fetchResult;
    console.log("-----------------------------------------------");
    console.log(`${colors.bright}Overall Result: ${overallResult ? colors.green + "PASS" : colors.red + "FAIL"}${colors.reset}`);
    
    return overallResult;
  } catch (error) {
    console.error(`${colors.red}Unexpected error during tests: ${error}${colors.reset}`);
    return false;
  }
}

// Run the tests
runAllTests()
  .then(success => {
    if (!success) {
      Deno.exit(1);
    }
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
    Deno.exit(1);
  });
