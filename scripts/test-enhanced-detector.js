#!/usr/bin/env node

/**
 * test-enhanced-detector.js
 * 
 * Tests the enhanced GitHub tools detector on a batch of servers
 * This script:
 * 1. First applies the tools JSONB column migration (if needed)
 * 2. Runs the enhanced tools detector on a sample of servers
 * 3. Generates a report with the results
 */

const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { applyToolsColumnMigration } = require('./apply-migration');
require('dotenv').config();

// Verify environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(chalk.red(`Missing environment variables: ${missingVars.join(', ')}`));
  console.error(chalk.yellow('Please set these variables in a .env file or environment'));
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSampleServers(count = 5) {
  console.log(chalk.blue(`Fetching ${count} sample servers with GitHub URLs...`));
  
  const { data, error } = await supabase
    .from('servers')
    .select('id, name, github_url')
    .not('github_url', 'is', null)
    .order('last_tools_scan', { ascending: true, nullsFirst: true })
    .limit(count);
  
  if (error) {
    throw new Error(`Error fetching servers: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    throw new Error('No servers with GitHub URLs found');
  }
  
  console.log(chalk.green(`Found ${data.length} servers to process`));
  return data;
}

async function runToolsDetector(server) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`Running enhanced detector for server: ${server.name} (${server.id})`));
    
    // Use the GitHub tools detector script
    const detectorScript = path.join(__dirname, 'github-tools-detector.ts');
    
    // Ensure the GITHUB_TOKEN is passed to the subprocess
    const env = { ...process.env };
    
    // Execute the detector with the server ID as an argument
    exec(`ts-node ${detectorScript} ${server.id}`, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(`Error running detector: ${error.message}`));
        console.error(chalk.red(stderr));
        reject(error);
        return;
      }
      
      console.log(stdout);
      resolve({ serverId: server.id, name: server.name, output: stdout });
    });
  });
}

async function validateResults(serverId) {
  console.log(chalk.blue(`Validating results for server ${serverId}...`));
  
  // Check if the server has tools in the JSONB column
  const { data, error } = await supabase
    .from('servers')
    .select('tools, tags, last_tools_scan')
    .eq('id', serverId)
    .single();
  
  if (error) {
    console.error(chalk.red(`Error validating results: ${error.message}`));
    return { success: false, error: error.message };
  }
  
  // Check for installation instructions
  const { data: installData, error: installError } = await supabase
    .from('server_install_instructions')
    .select('platform, install_command')
    .eq('server_id', serverId);
  
  if (installError) {
    console.warn(chalk.yellow(`Error fetching installation instructions: ${installError.message}`));
    // Continue anyway, this is just for reporting
  }
  
  return {
    success: true,
    tools: data.tools || [],
    toolCount: data.tools ? data.tools.length : 0,
    tags: data.tags || [],
    lastToolsScan: data.last_tools_scan,
    installInstructions: installData || [],
    installCount: installData ? installData.length : 0
  };
}

async function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const reportPath = path.join(__dirname, '..', 'reports', `enhanced-detector-test-${timestamp}.json`);
  
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Write the report to a file
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log(chalk.green(`Report generated at: ${reportPath}`));
  return reportPath;
}

async function runTest() {
  try {
    console.log(chalk.blue('Starting enhanced detector test...'));
    
    // Step 1: Apply the migration if needed
    console.log(chalk.blue('Checking and applying migration...'));
    const migrationResult = await applyToolsColumnMigration();
    
    if (!migrationResult.success) {
      console.warn(chalk.yellow(`Migration warning: ${migrationResult.error}`));
      console.warn(chalk.yellow('Continuing with test anyway...'));
    }
    
    // Step 2: Get sample servers to test
    const sampleCount = process.argv[2] ? parseInt(process.argv[2]) : 3;
    const servers = await getSampleServers(sampleCount);
    
    // Step 3: Process each server
    const results = [];
    
    for (const server of servers) {
      try {
        // Run the detector
        await runToolsDetector(server);
        
        // Validate the results
        const validation = await validateResults(server.id);
        
        results.push({
          serverId: server.id,
          name: server.name,
          githubUrl: server.github_url,
          success: validation.success,
          toolCount: validation.toolCount,
          installCount: validation.installCount,
          lastToolsScan: validation.lastToolsScan,
          tags: validation.tags,
          tools: validation.tools,
          installInstructions: validation.installInstructions
        });
      } catch (error) {
        console.error(chalk.red(`Error processing server ${server.name}:`, error));
        results.push({
          serverId: server.id,
          name: server.name,
          githubUrl: server.github_url,
          success: false,
          error: error.message
        });
      }
    }
    
    // Step 4: Generate a report
    const reportPath = await generateReport(results);
    
    // Step 5: Summary
    console.log(chalk.green('Test completed!'));
    console.log(chalk.blue('Summary:'));
    console.log(`- Total servers processed: ${results.length}`);
    console.log(`- Successful: ${results.filter(r => r.success).length}`);
    console.log(`- Failed: ${results.filter(r => !r.success).length}`);
    console.log(`- Total tools detected: ${results.reduce((sum, r) => sum + (r.toolCount || 0), 0)}`);
    console.log(`- Total install instructions: ${results.reduce((sum, r) => sum + (r.installCount || 0), 0)}`);
    console.log(`- Report: ${reportPath}`);
    
    return results;
  } catch (error) {
    console.error(chalk.red('Test failed:'), error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  runTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(chalk.red('Unexpected error:'), error);
      process.exit(1);
    });
}

module.exports = { runTest };
