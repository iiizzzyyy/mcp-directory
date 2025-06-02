#!/usr/bin/env node
/**
 * Comprehensive PulseMCP Server Scraper
 * 
 * This script provides a robust solution for scraping server data from PulseMCP
 * and processing it through the crawl-pulsemcp-servers edge function with:
 * - Progress tracking and ETA estimates
 * - Error handling with automatic retries
 * - Batch processing to manage server load
 * - Detailed reporting and logging
 * - Command-line options for flexibility
 * 
 * Prerequisites:
 * 1. Set FIRECRAWL_API_KEY in Supabase edge function secrets
 * 2. npm install node-fetch@2 cli-progress commander ora chalk
 * 
 * Usage:
 * node scrape-pulsemcp-servers.js [options]
 * 
 * Options:
 *   --batch-size <number>  Number of servers to process in each batch (default: 10)
 *   --delay <ms>           Delay between batches in milliseconds (default: 5000)
 *   --max-retries <number> Maximum number of retry attempts for failed requests (default: 3)
 *   --output <file>        Save detailed results to JSON file (default: scrape-results.json)
 *   --dry-run              Test the script without making actual updates
 *   --verbose              Show detailed logs for each server
 *   --help                 Show this help message
 * 
 * Example:
 *   node scrape-pulsemcp-servers.js --batch-size 5 --delay 10000 --verbose
 */

const fetch = require('node-fetch');
const { program } = require('commander');
const cliProgress = require('cli-progress');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Configure command line options
program
  .option('--batch-size <number>', 'Number of servers to process in each batch', 10)
  .option('--delay <ms>', 'Delay between batches in milliseconds', 5000)
  .option('--max-retries <number>', 'Maximum number of retry attempts for failed requests', 3)
  .option('--output <file>', 'Save detailed results to JSON file', 'scrape-results.json')
  .option('--dry-run', 'Test the script without making actual updates')
  .option('--verbose', 'Show detailed logs for each server')
  .parse(process.argv);

const options = program.opts();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nryytfezkmptcmpawlva.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/crawl-pulsemcp-servers`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeXl0ZmV6a21wdGNtcGF3bHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTA1ODUsImV4cCI6MjA2NDA4NjU4NX0.F2SYK_bTnafFn0H9tt_vOAHhqzZrC5LEcXkW2S1src8';
const PULSEMCP_API_URL = 'https://api.pulsemcp.com/v0beta/servers';

// For storing comprehensive results
const results = {
  startTime: new Date(),
  endTime: null,
  totalServers: 0,
  batchesProcessed: 0,
  processed: 0,
  updated: 0,
  failed: 0,
  skipped: 0,
  batches: [],
  errors: [],
  serverDetails: []
};

// Helper for sleeping between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function fetchWithRetry(url, options, retries = options.maxRetries) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    
    const delay = 2000 * Math.pow(2, options.maxRetries - retries);
    console.log(chalk.yellow(`Request failed. Retrying in ${delay/1000}s... (${retries} attempts left)`));
    await sleep(delay);
    return fetchWithRetry(url, options, retries - 1);
  }
}

// Function to get total server count
async function getTotalServerCount() {
  const spinner = ora('Checking total number of PulseMCP servers...').start();
  
  try {
    const response = await fetch(`${PULSEMCP_API_URL}?count_per_page=1`);
    if (!response.ok) {
      spinner.fail('Failed to connect to PulseMCP API');
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const count = data.total_count || 0;
    spinner.succeed(`Found ${count} PulseMCP servers to process`);
    return count;
  } catch (error) {
    spinner.fail(`Error checking server count: ${error.message}`);
    throw error;
  }
}

// Function to get servers in batches
async function getServerBatch(offset, batchSize) {
  const response = await fetch(`${PULSEMCP_API_URL}?offset=${offset}&count_per_page=${batchSize}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch servers: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.servers || [];
}

// Process a batch of servers through the edge function
async function processBatch(serverIds, batchNumber, totalBatches) {
  const batchSpinner = ora(`Processing batch ${batchNumber}/${totalBatches} (${serverIds.length} servers)`).start();
  
  try {
    const batchStartTime = new Date();
    const requestBody = options.dryRun 
      ? { serverIds, dryRun: true }
      : { serverIds };
    
    const response = await fetchWithRetry(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(requestBody),
      maxRetries: options.maxRetries
    });
    
    const data = await response.json();
    const batchEndTime = new Date();
    const batchDuration = (batchEndTime - batchStartTime) / 1000;
    
    // Store batch results
    const batchResult = {
      batchNumber,
      serverCount: serverIds.length,
      processingTime: batchDuration,
      success: data.success,
      stats: data.stats,
      timestamp: new Date()
    };
    results.batches.push(batchResult);
    
    // Update overall statistics
    if (data.stats) {
      results.processed += data.stats.processed || 0;
      results.updated += data.stats.updated || 0;
      results.failed += data.stats.failed || 0;
      results.skipped += data.stats.skipped || 0;
      
      // Store detailed server results if available
      if (data.stats.details && Array.isArray(data.stats.details)) {
        results.serverDetails = [...results.serverDetails, ...data.stats.details];
      }
    }
    
    batchSpinner.succeed(`Batch ${batchNumber}/${totalBatches} completed in ${batchDuration.toFixed(1)}s (${data.stats?.updated || 0} updated, ${data.stats?.failed || 0} failed)`);
    
    // Verbose logging
    if (options.verbose && data.stats?.details) {
      console.log('\nServer details:');
      data.stats.details.forEach(server => {
        const statusColor = server.status === 'updated' ? chalk.green : 
                           server.status === 'failed' ? chalk.red : chalk.gray;
        console.log(`  ${statusColor('•')} ${server.name}: ${statusColor(server.status)}${server.error ? ` (${server.error})` : ''}`);
      });
      console.log('');
    }
    
    return data;
  } catch (error) {
    batchSpinner.fail(`Batch ${batchNumber}/${totalBatches} failed: ${error.message}`);
    results.errors.push({
      batchNumber,
      error: error.message,
      serverIds,
      timestamp: new Date()
    });
    return { success: false, error: error.message };
  }
}

// Save results to file
function saveResults(results) {
  const outputPath = path.resolve(options.output);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(chalk.blue(`\nDetailed results saved to: ${outputPath}`));
}

// Main execution function
async function main() {
  console.log(chalk.blue.bold('\n🚀 PulseMCP Server Scraper'));
  console.log(chalk.blue('================================================'));
  
  // Log configuration
  console.log(chalk.cyan('Configuration:'));
  console.log(`  • Batch Size: ${options.batchSize}`);
  console.log(`  • Delay Between Batches: ${options.delay}ms`);
  console.log(`  • Max Retries: ${options.maxRetries}`);
  console.log(`  • Output File: ${options.output}`);
  console.log(`  • Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`  • Verbose: ${options.verbose ? 'Yes' : 'No'}`);
  console.log(chalk.blue('================================================\n'));
  
  if (options.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE: No actual database updates will be made\n'));
  }
  
  try {
    // Get total server count
    const totalCount = await getTotalServerCount();
    results.totalServers = totalCount;
    
    if (totalCount === 0) {
      console.log(chalk.yellow('No servers found. Exiting.'));
      return;
    }
    
    // Calculate number of batches
    const batchSize = parseInt(options.batchSize);
    const totalBatches = Math.ceil(totalCount / batchSize);
    
    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} Batches | ETA: {eta_formatted}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);
    
    console.log(chalk.green(`Starting processing of ${totalCount} servers in ${totalBatches} batches...\n`));
    progressBar.start(totalBatches, 0);
    
    // Process in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * batchSize;
      const currentBatchSize = Math.min(batchSize, totalCount - offset);
      
      // Get server IDs for this batch
      const serverBatch = await getServerBatch(offset, currentBatchSize);
      const serverIds = serverBatch.map(server => server.id);
      
      // Process this batch
      await processBatch(serverIds, batchIndex + 1, totalBatches);
      results.batchesProcessed++;
      
      // Update progress bar
      progressBar.update(batchIndex + 1);
      
      // Delay before next batch unless it's the last one
      if (batchIndex < totalBatches - 1) {
        await sleep(parseInt(options.delay));
      }
    }
    
    progressBar.stop();
    
    // Finalize results
    results.endTime = new Date();
    const totalDuration = (results.endTime - results.startTime) / 1000;
    
    // Print summary
    console.log(chalk.blue('\n================================================'));
    console.log(chalk.green.bold('✅ Scraping Complete!'));
    console.log(chalk.blue('================================================'));
    console.log(chalk.cyan('\nSummary:'));
    console.log(`  • Total Servers: ${results.totalServers}`);
    console.log(`  • Servers Processed: ${results.processed}`);
    console.log(`  • Servers Updated: ${chalk.green(results.updated)}`);
    console.log(`  • Servers Failed: ${chalk.red(results.failed)}`);
    console.log(`  • Servers Skipped: ${chalk.yellow(results.skipped)}`);
    console.log(`  • Batches Processed: ${results.batchesProcessed}/${totalBatches}`);
    console.log(`  • Total Duration: ${totalDuration.toFixed(1)} seconds`);
    console.log(`  • Average Time Per Server: ${(totalDuration / results.processed).toFixed(2)} seconds`);
    
    if (results.errors.length > 0) {
      console.log(chalk.red(`\n⚠️ Errors: ${results.errors.length} batches had errors`));
    }
    
    // Save results to file
    saveResults(results);
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    results.endTime = new Date();
    results.errors.push({
      phase: 'main',
      error: error.message,
      timestamp: new Date()
    });
    saveResults(results);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(chalk.red(`\n❌ Fatal Error: ${error.message}`));
  process.exit(1);
});
