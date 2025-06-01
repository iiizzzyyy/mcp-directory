import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with multiple file fallbacks
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

// Check required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error(`
Please create a .env file with the following content:

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_TOKEN=your-github-token

Optionally, you can also set:
MAX_PARALLEL_SERVERS=5
CACHE_EXPIRY_HOURS=24
`);
  process.exit(1);
}

// Test configuration
const MAX_PARALLEL_SERVERS = Number(process.env.MAX_PARALLEL_SERVERS || '2');
const CACHE_EXPIRY_HOURS = Number(process.env.CACHE_EXPIRY_HOURS || '24');

// Detection timeout configuration (ms)
const DETECTION_TIMEOUTS = {
  standard_mcp_api: 10000, // 10 seconds for standard API
  alternative_api: 15000, // 15 seconds for alternative API
  github_repository: 30000, // 30 seconds for GitHub repository analysis
  default: 20000 // Default timeout
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const githubToken = process.env.GITHUB_TOKEN!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`🔗 Connected to Supabase project: ${supabaseUrl}`);
console.log(`🔑 GitHub token is ${githubToken ? 'configured' : 'missing'} (${githubToken ? '✅' : '❌'})`);

// Define real MCP servers to test against
const REAL_TEST_SERVERS = {
  // Tier 1: Standard MCP API (/list_resources endpoint)
  standard_mcp_api: [
    {
      name: "puppeteer-mcp",
      url: "https://puppeteer-mcp.mcpland.cloud",
      api_documentation: "https://puppeteer-mcp.mcpland.cloud/api",
      github_url: "https://github.com/puppeteer/puppeteer-mcp-server",
      expected_tools: 7
    },
    {
      name: "supabase-mcp-server",
      url: "https://supabase-mcp-server.mcpland.cloud",
      api_documentation: "https://supabase-mcp-server.mcpland.cloud/api",
      github_url: "https://github.com/supabase/supabase-mcp-server",
      expected_tools: 10
    },
    {
      name: "linear-mcp",
      url: "https://linear-mcp.mcpland.cloud",
      api_documentation: "https://linear-mcp.mcpland.cloud/api",
      github_url: "https://github.com/linear/linear-mcp",
      expected_tools: 12
    }
  ],
  // Tier 2: Alternative API endpoints
  alternative_api: [
    {
      name: "firecrawl-mcp",
      url: "https://firecrawl-mcp.mcpland.cloud",
      api_documentation: "https://firecrawl-mcp.mcpland.cloud/api",
      github_url: "https://github.com/firecrawl/firecrawl-mcp",
      expected_tools: 5
    },
    {
      name: "hubspot-mcp",
      url: "https://hubspot-mcp.mcpland.cloud",
      api_documentation: "https://hubspot-mcp.mcpland.cloud/api",
      github_url: "https://github.com/hubspot/hubspot-mcp",
      expected_tools: 14
    }
  ],
  // Tier 3: GitHub repository analysis fallback
  github_repository: [
    {
      name: "gitmcp",
      url: "https://gitmcp.mcpland.cloud",
      github_url: "https://github.com/gitmcp/gitmcp-server",
      expected_tools: 3
    },
    {
      name: "netlify-mcp",
      url: "https://netlify-mcp.mcpland.cloud",
      github_url: "https://github.com/netlify/netlify-mcp",
      expected_tools: 4
    },
    {
      name: "pulsemcp",
      url: "https://pulsemcp.mcpland.cloud",
      github_url: "https://github.com/pulse/pulsemcp-server",
      expected_tools: 2
    },
    {
      name: "brave-search",
      url: "https://brave-search-mcp.mcpland.cloud",
      github_url: "https://github.com/brave/brave-search-mcp",
      expected_tools: 3
    }
  ]
};

interface TestServer {
  name: string;
  url: string;
  api_documentation?: string;
  github_url?: string;
  expected_tools: number;
}

interface TestResult {
  server_name: string;
  detection_tier: string;
  expected_tier: string;
  tools_detected: number;
  expected_tools: number;
  passed: boolean;
  error?: string;
  execution_time_ms: number;
  tools?: any[];
}

interface TestReport {
  timestamp: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  duration_ms: number;
  tier_results: Record<string, {
    total: number;
    passed: number;
    failed: number;
  }>;
}

/**
 * Main test function for real servers
 */
async function testRealServers(): Promise<TestReport> {
  console.log('🧪 Starting MCP Tools Detection Tests with REAL Servers');
  console.log('====================================================');
  console.log(`📅 ${new Date().toISOString()}`)
  console.log(`🔧 Test Configuration: ${Object.values(REAL_TEST_SERVERS).flat().length} servers across ${Object.keys(REAL_TEST_SERVERS).length} detection tiers`)
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Test each detection tier with real servers
  for (const [tier, servers] of Object.entries(REAL_TEST_SERVERS)) {
    console.log(`\n📋 Testing ${tier} detection with ${(servers as TestServer[]).length} real servers:`);
    
    for (const server of servers as TestServer[]) {
      const startTime = Date.now();
      console.log(`  🔍 Testing ${server.name}...`);
      
      try {
        // Create or get server record
        const { data: existingServer } = await supabase
          .from('servers')
          .select('id, name')
          .eq('name', server.name)
          .maybeSingle();
          
        let serverId: string;
        
        if (existingServer) {
          serverId = existingServer.id;
          console.log(`    ℹ️ Found existing server record for ${server.name}`);
        } else {
          // Insert test server
          // The tools-detector function expects specific fields (url, api_url, github_url)
          // But the database has different column names
          // We'll insert both versions to satisfy both requirements
          const serverData: Record<string, any> = {
            name: server.name,
            description: `Test server for ${tier} detection tier`,
            category: 'test',
            // Add timestamp to name to avoid unique constraint violations
            slug: `test-${Date.now()}`
          };
          
          // Map fields correctly to database schema
          if (tier === 'standard_mcp_api' || tier === 'alternative_api') {
            // Use api_documentation for the database schema
            serverData.api_documentation = server.api_documentation;
          }
          
          if (tier === 'github_repository') {
            // For database schema - add unique suffix to avoid constraints
            serverData.github_url = `${server.github_url}?test=${Date.now()}`;
          }
          
          // Map fields correctly to database schema
          serverData.health_check_url = server.url; // Database uses health_check_url instead of url
          
          // Handle API URL based on detection tier
          if (server.api_documentation) {
            serverData.api_documentation = server.api_documentation; // Database uses api_documentation instead of api_url
          }
          
          const { data: newServer, error: insertError } = await supabase
            .from('servers')
            .insert(serverData)
            .select()
            .single();
            
          if (insertError) {
            throw new Error(`Failed to insert test server: ${insertError.message}`);
          }
          
          serverId = newServer.id;
          console.log(`    ℹ️ Created new server record for ${server.name}`);
        }

        // Invoke the tools-detector edge function
        console.log(`  ⏳ Invoking tools-detector for ${server.name}...`);
        
        // Add tier-specific timeout
        const timeout = DETECTION_TIMEOUTS[tier] || DETECTION_TIMEOUTS.default;
        
        // Call the edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/tools-detector`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ 
            server_ids: [serverId],
            run_mode: 'test'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to invoke tools-detector: ${response.statusText}`);
        }
        
        // Wait for detection to complete with progressive feedback
        console.log(`    ⏳ Waiting for detection to complete...`);
        
        // Add dynamic wait based on detection method - GitHub detection can take longer
        const waitTime = tier === 'github_repository' ? 10000 : 5000;
        const waitInterval = 1000;
        
        for (let waited = 0; waited < waitTime; waited += waitInterval) {
          await setTimeout(waitInterval);
          process.stdout.write('.');
        }
        process.stdout.write('\n');
        
        // Check the results
        const { data: tools, error: toolsError } = await supabase
          .from('server_tools')
          .select(`
            id, 
            name, 
            description, 
            method, 
            endpoint, 
            detection_source,
            tool_parameters:tool_parameters(id, name, description, type, required)
          `)
          .eq('server_id', serverId);
          
        if (toolsError) {
          throw new Error(`Failed to fetch tools: ${toolsError.message}`);
        }
        
        const toolsDetected = tools?.length || 0;
        const detectionTier = tools && tools.length > 0 ? tools[0].detection_source : null;
        const executionTime = Date.now() - startTime;
        
        // Record test result
        const result: TestResult = {
          server_name: server.name,
          detection_tier: detectionTier || 'none',
          expected_tier: tier,
          tools_detected: toolsDetected,
          expected_tools: server.expected_tools,
          passed: detectionTier === tier && toolsDetected >= server.expected_tools,
          execution_time_ms: executionTime,
          tools: tools
        };
        
        results.push(result);
        
        // Log result
        if (result.passed) {
          console.log(`    ✅ Detected ${toolsDetected} tools using ${detectionTier} in ${executionTime}ms`);
        } else {
          console.log(`    ❌ Failed: Expected tier ${tier}, got ${detectionTier || 'none'} with ${toolsDetected} tools`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`    ❌ Error testing ${server.name}:`, errorMessage);
        
        // Record failed test
        results.push({
          server_name: server.name,
          detection_tier: 'error',
          expected_tier: tier,
          tools_detected: 0,
          expected_tools: server.expected_tools,
          passed: false,
          error: errorMessage,
          execution_time_ms: Date.now() - startTime
        });
      }
    }
  }
  
  // Calculate overall test duration
  const totalDuration = Date.now() - startTime;
  
  // Print summary
  console.log('\n📊 Real Server Test Results:');
  console.log('===========================');
  console.log(`⏱️ Total test duration: ${totalDuration/1000}s`);
  
  let passed = 0;
  let failed = 0;
  const tierResults: Record<string, {total: number, passed: number, failed: number}> = {};
  
  // Process results and build tier statistics
  for (const result of results) {
    const expectedTier = result.expected_tier;
    
    // Initialize tier stats if needed
    if (!tierResults[expectedTier]) {
      tierResults[expectedTier] = {total: 0, passed: 0, failed: 0};
    }
    
    tierResults[expectedTier].total++;
    
    if (result.passed) {
      passed++;
      tierResults[expectedTier].passed++;
      console.log(`✅ ${result.server_name} (${result.detection_tier}): ${result.tools_detected} tools in ${result.execution_time_ms}ms`);
    } else {
      failed++;
      tierResults[expectedTier].failed++;
      console.log(`❌ ${result.server_name}: FAILED - ${result.error || `Expected ${result.expected_tier}, got ${result.detection_tier} with ${result.tools_detected}/${result.expected_tools} tools`}`);
    }
  }
  
  // Print tier-specific results
  console.log('\n📈 Results by Detection Tier:');
  for (const [tier, stats] of Object.entries(tierResults)) {
    const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
    console.log(`  ${tier}: ${stats.passed}/${stats.total} passed (${passRate}% success rate)`);
  }
  
  // Print overall results
  const overallPassRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
  console.log(`\n🏁 Overall: ${passed}/${passed + failed} tests passed (${overallPassRate}% success rate)`);
  
  // Create report
  const report: TestReport = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: passed + failed,
      passed,
      failed
    },
    duration_ms: totalDuration,
    tier_results: tierResults
  };
  
  return report;
}

/**
 * Save test report to file
 */
async function saveReportToFile(report: TestReport): Promise<string> {
  try {
    const reportsDir = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
    
    // Create reports directory if it doesn't exist
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `real-server-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to ${filepath}`);
    
    return filepath;
  } catch (err) {
    console.error(`Error saving report: ${err}`);
    return `Error: ${err}`;
  }
}

/**
 * Save test report to database
 */
async function saveReportToDatabase(report: TestReport): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('test_reports')
      .insert({
        test_name: `Tools Detection Test - ${report.timestamp}`,
        test_type: 'tools_detection_real',
        data: report,
        results: { results: report.results },
        summary: report.summary,
        duration_ms: report.duration_ms,
        passed: report.summary.failed === 0
      });
      
    if (error) {
      console.error('Error saving test report to database:', error);
    } else {
      console.log('✅ Test report saved to database');
    }
  } catch (err) {
    console.error('Failed to save report to database:', err);
  }
}

/**
 * Create test_reports table if it doesn't exist
 */
async function ensureTestReportsTable(): Promise<void> {
  try {
    // Check if table exists
    const { error: checkError } = await supabase
      .from('test_reports')
      .select('id')
      .limit(1);
      
    if (checkError && checkError.message.includes('does not exist')) {
      console.log('Creating test_reports table...');
      
      // Create the table with service_role
      await supabase.rpc('create_test_reports_table');
      console.log('✅ Created test_reports table');
    }
  } catch (err) {
    console.error('Error checking/creating test_reports table:', err);
  }
}

/**
 * Verify server table schema by fetching a sample record
 */
async function verifyServerTableSchema(): Promise<void> {
  console.log('🔍 Verifying database schema...');
  
  try {
    // Check for required columns by inspecting an existing record
    const { data: serverSample, error } = await supabase
      .from('servers')
      .select('*')
      .limit(1)
      .maybeSingle();
      
    if (error) {
      throw new Error(`Failed to get sample server: ${error.message}`);
    }
    
    if (!serverSample) {
      console.log('⚠️ No existing servers found. Schema verification will be minimal.');
      // At minimum, check if the table exists
      return;
    }
    
    // Get column names from the sample record
    const columnNames = Object.keys(serverSample);
    console.log(`Found columns: ${columnNames.join(', ')}`);
    
    // Required columns for testing based on actual schema
    const requiredColumns = {
      'standard_mcp_api': ['name', 'api_documentation'],
      'alternative_api': ['name', 'api_documentation'], 
      'github_repository': ['name', 'github_url']
    };
    
    // Check each detection tier's requirements
    let missingColumnsWarning = false;
    for (const [tier, columns] of Object.entries(requiredColumns)) {
      const missingColumns = columns.filter(col => !columnNames.includes(col));
      if (missingColumns.length > 0) {
        console.warn(`⚠️ ${tier} tests require columns that are missing: ${missingColumns.join(', ')}`);
        missingColumnsWarning = true;
      }
    }
    
    if (missingColumnsWarning) {
      console.log('⚠️ Tests may fail due to missing columns. Continuing anyway...');
    } else {
      console.log('✅ Database schema verification passed');
    }
  } catch (err) {
    console.error('❌ Schema verification failed:', err);
    console.log('⚠️ Continuing despite schema verification failure...');
    // Don't rethrow, allow tests to run anyway and fail with more specific errors
  }
}

// Run the tests
async function run() {
  try {
    // Verify server table schema
    await verifyServerTableSchema();
    
    // Ensure the test_reports table exists
    await ensureTestReportsTable();
    
    // Run tests
    const report = await testRealServers();
    
    // Save report
    await saveReportToFile(report);
    await saveReportToDatabase(report);
    
    // Exit with success/failure code
    process.exit(report.summary.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

run();
