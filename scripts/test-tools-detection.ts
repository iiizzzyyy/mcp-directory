import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define test server categories by expected detection method
const TEST_SERVERS = {
  standard_mcp_api: [
    {
      name: 'puppeteer',
      url: 'https://puppeteer-mcp.example.com',
      api_url: 'https://puppeteer-mcp.example.com/api',
      github_url: 'https://github.com/puppeteer/puppeteer',
      expected_tool_count: 7
    },
    {
      name: 'supabase-mcp-server',
      url: 'https://supabase-mcp-server.example.com',
      api_url: 'https://supabase-mcp-server.example.com/api',
      github_url: 'https://github.com/supabase/supabase',
      expected_tool_count: 10
    }
  ],
  alternative_api: [
    {
      name: 'firecrawl',
      url: 'https://firecrawl.example.com',
      api_url: 'https://firecrawl.example.com/api',
      github_url: 'https://github.com/firecrawl/firecrawl',
      expected_tool_count: 5
    }
  ],
  github_repository: [
    {
      name: 'gitmcp',
      url: 'https://gitmcp.example.com',
      github_url: 'https://github.com/gitmcp/gitmcp',
      expected_tool_count: 3
    }
  ]
};

interface TestServer {
  name: string;
  url?: string;
  api_url?: string;
  github_url: string;
  expected_tool_count: number;
}

interface TestResult {
  server_name: string;
  detection_tier: string;
  passed: boolean;
  tools_detected: number;
  expected_tools: number;
  error?: string;
  execution_time_ms: number;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting MCP Tools Detection Tests');
  console.log('=====================================');
  
  const results: TestResult[] = [];
  
  // Test each detection tier
  for (const [tier, servers] of Object.entries(TEST_SERVERS)) {
    console.log(`\n📋 Testing ${tier} detection:`);
    
    for (const server of servers) {
      await testServer(server, tier, results);
    }
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log('=====================');
  
  let passed = 0;
  let failed = 0;
  
  for (const result of results) {
    if (result.passed) {
      passed++;
      console.log(`✅ ${result.server_name} (${result.detection_tier}): ${result.tools_detected} tools detected in ${result.execution_time_ms}ms`);
    } else {
      failed++;
      console.log(`❌ ${result.server_name} (${result.detection_tier}): FAILED - ${result.error || `Expected ${result.expected_tools} tools, got ${result.tools_detected}`}`);
    }
  }
  
  console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  
  // Return test success/failure for CI/CD pipelines
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Test a single server's tools detection
 */
async function testServer(server: TestServer, tier: string, results: TestResult[]) {
  console.log(`  🔍 Testing ${server.name}...`);
  
  const startTime = Date.now();
  let toolsDetected = 0;
  let error: string | undefined = undefined;
  
  try {
    // 1. First, clear any existing tools for this test server
    await clearTestServer(server.name);
    
    // 2. Insert test server into database
    const { data: insertedServer, error: insertError } = await supabase
      .from('servers')
      .insert({
        name: server.name,
        description: `Test server for ${tier} detection`,
        url: server.url,
        api_url: server.api_url,
        github_url: server.github_url,
        category: 'test',
        status: 'active'
      })
      .select()
      .single();
    
    if (insertError) {
      throw new Error(`Failed to insert test server: ${insertError.message}`);
    }
    
    // 3. Invoke the tools-detector function for this server
    const serverId = insertedServer.id;
    const detectorUrl = `${supabaseUrl}/functions/v1/tools-detector`;
    
    const response = await fetch(detectorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ server_ids: [serverId] })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to invoke tools-detector: ${response.statusText}`);
    }
    
    // 4. Wait for the detection to complete (may take some time for GitHub analysis)
    await setTimeout(5000);
    
    // 5. Check the results using the server-tools API
    const { data: tools, error: toolsError } = await supabase
      .from('server_tools')
      .select('id, name, detection_source')
      .eq('server_id', serverId);
    
    if (toolsError) {
      throw new Error(`Failed to fetch tools: ${toolsError.message}`);
    }
    
    toolsDetected = tools?.length || 0;
    
    // 6. Check detection source matches expected tier
    const detectionSource = tools && tools.length > 0 ? tools[0].detection_source : null;
    
    if (detectionSource !== tier && toolsDetected > 0) {
      error = `Wrong detection source: expected ${tier}, got ${detectionSource}`;
    }
    
    // 7. Cleanup: remove the test server
    await cleanupTestServer(serverId);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  
  const executionTime = Date.now() - startTime;
  
  // Record test result
  results.push({
    server_name: server.name,
    detection_tier: tier,
    passed: !error && toolsDetected >= server.expected_tool_count,
    tools_detected: toolsDetected,
    expected_tools: server.expected_tool_count,
    error,
    execution_time_ms: executionTime
  });
  
  // Log result
  if (!error && toolsDetected >= server.expected_tool_count) {
    console.log(`    ✅ Detected ${toolsDetected} tools using ${tier} in ${executionTime}ms`);
  } else {
    console.log(`    ❌ Failed: ${error || `Expected at least ${server.expected_tool_count} tools, got ${toolsDetected}`}`);
  }
}

/**
 * Clear existing test server by name
 */
async function clearTestServer(serverName: string) {
  const { data, error } = await supabase
    .from('servers')
    .delete()
    .eq('name', serverName);
  
  if (error) {
    console.warn(`Warning: Failed to clear existing test server ${serverName}: ${error.message}`);
  }
}

/**
 * Clean up a test server and its associated tools
 */
async function cleanupTestServer(serverId: string) {
  const { error } = await supabase
    .from('servers')
    .delete()
    .eq('id', serverId);
  
  if (error) {
    console.warn(`Warning: Failed to clean up test server ${serverId}: ${error.message}`);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
