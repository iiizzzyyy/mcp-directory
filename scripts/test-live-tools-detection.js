#!/usr/bin/env node

/**
 * test-live-tools-detection.js
 * 
 * Tests the tools detection functionality on the live site
 * Verifies that the tools JSONB column is being populated correctly
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const chalk = require('chalk');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Constants
const VERCEL_URL = 'https://frontend-5f2lke8xn-tuiizzyy-gmailcoms-projects.vercel.app';
const TEST_SERVER_COUNT = 3;

/**
 * Get a sample of servers with GitHub URLs
 * @param {number} limit - Maximum number of servers to retrieve
 * @returns {Promise<Array>} - Array of server objects
 */
async function getSampleServers(limit = TEST_SERVER_COUNT) {
  console.log(chalk.blue(`Fetching ${limit} sample servers with GitHub URLs...`));
  
  const { data, error } = await supabase
    .from('servers')
    .select('id, name, github_url, tools')
    .not('github_url', 'is', null)
    .limit(limit);
  
  if (error) {
    throw new Error(`Error fetching servers: ${error.message}`);
  }
  
  console.log(chalk.green(`Found ${data.length} servers to test`));
  return data;
}

/**
 * Check if the server has tools in the database
 * @param {string} serverId - Server ID to check
 * @returns {Promise<Object>} - Server with tools data
 */
async function checkServerTools(serverId) {
  const { data, error } = await supabase
    .from('servers')
    .select('id, name, tools')
    .eq('id', serverId)
    .single();
  
  if (error) {
    throw new Error(`Error checking server tools: ${error.message}`);
  }
  
  return data;
}

/**
 * Test the tools API endpoint on the live site
 * @param {string} serverId - Server ID to test
 * @returns {Promise<Object>} - API response data
 */
async function testLiveToolsEndpoint(serverId) {
  console.log(chalk.blue(`Testing live tools endpoint for server ID: ${serverId}`));
  
  const response = await fetch(`${VERCEL_URL}/api/server-tools?id=${serverId}`);
  
  if (!response.ok) {
    throw new Error(`API request failed with status: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Run the live site tools detection test
 */
async function runTest() {
  console.log(chalk.bold.blue('Starting live tools detection test...'));
  console.log(chalk.blue(`Testing against: ${VERCEL_URL}`));
  
  try {
    // Get sample servers
    const servers = await getSampleServers();
    
    if (servers.length === 0) {
      console.log(chalk.yellow('No servers with GitHub URLs found. Test skipped.'));
      return;
    }
    
    // Test each server
    const results = [];
    
    for (const server of servers) {
      try {
        console.log(chalk.bold(`\nTesting server: ${server.name} (${server.id})`));
        
        // Check database tools
        const dbServer = await checkServerTools(server.id);
        const hasToolsInDb = dbServer.tools && Array.isArray(dbServer.tools) && dbServer.tools.length > 0;
        
        console.log(chalk.blue(`Tools in database: ${hasToolsInDb ? 'YES' : 'NO'}`));
        if (hasToolsInDb) {
          console.log(chalk.blue(`Number of tools: ${dbServer.tools.length}`));
          console.log(chalk.gray(`First tool: ${JSON.stringify(dbServer.tools[0], null, 2)}`));
        }
        
        // Test API endpoint
        const apiResponse = await testLiveToolsEndpoint(server.id);
        const hasToolsInApi = apiResponse && Array.isArray(apiResponse) && apiResponse.length > 0;
        
        console.log(chalk.blue(`Tools in API response: ${hasToolsInApi ? 'YES' : 'NO'}`));
        if (hasToolsInApi) {
          console.log(chalk.blue(`Number of tools from API: ${apiResponse.length}`));
        }
        
        // Verify consistency
        const isConsistent = hasToolsInDb === hasToolsInApi;
        if (hasToolsInDb && hasToolsInApi) {
          const dbToolNames = dbServer.tools.map(t => t.name).sort();
          const apiToolNames = apiResponse.map(t => t.name).sort();
          const namesConsistent = JSON.stringify(dbToolNames) === JSON.stringify(apiToolNames);
          
          console.log(chalk.blue(`Data consistency: ${namesConsistent ? 'GOOD' : 'MISMATCH'}`));
        }
        
        results.push({
          server_id: server.id,
          name: server.name,
          has_tools_in_db: hasToolsInDb,
          has_tools_in_api: hasToolsInApi,
          is_consistent: isConsistent,
          db_tool_count: hasToolsInDb ? dbServer.tools.length : 0,
          api_tool_count: hasToolsInApi ? apiResponse.length : 0
        });
        
      } catch (serverError) {
        console.error(chalk.red(`Error testing server ${server.name}:`), serverError.message);
        results.push({
          server_id: server.id,
          name: server.name,
          error: serverError.message
        });
      }
    }
    
    // Print summary
    console.log(chalk.bold.blue('\n=== TEST SUMMARY ==='));
    console.log(chalk.blue(`Total servers tested: ${results.length}`));
    
    const successful = results.filter(r => !r.error);
    const withTools = results.filter(r => r.has_tools_in_db);
    const consistent = results.filter(r => r.is_consistent);
    
    console.log(chalk.blue(`Successful tests: ${successful.length}`));
    console.log(chalk.blue(`Servers with tools: ${withTools.length}`));
    console.log(chalk.blue(`Consistent data: ${consistent.length}`));
    
    // Overall status
    if (withTools.length > 0 && consistent.length === withTools.length) {
      console.log(chalk.green.bold('✅ TOOLS DETECTION FUNCTIONALITY WORKING CORRECTLY'));
    } else if (withTools.length > 0) {
      console.log(chalk.yellow.bold('⚠️ TOOLS DETECTION PARTIALLY WORKING - Data inconsistencies found'));
    } else {
      console.log(chalk.red.bold('❌ TOOLS DETECTION NOT WORKING - No tools found in database'));
    }
    
  } catch (error) {
    console.error(chalk.red('Test failed:'), error.message);
    process.exit(1);
  }
}

// Run the test
runTest()
  .then(() => {
    console.log(chalk.blue('Test completed.'));
  })
  .catch(error => {
    console.error(chalk.red('Test failed with error:'), error);
    process.exit(1);
  });
