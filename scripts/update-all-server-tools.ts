#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

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
`);
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const BATCH_SIZE = 5; // Number of servers processed per edge function call
const WAIT_BETWEEN_BATCHES = 3000; // Wait 3 seconds between batch invocations
const MAX_BATCHES = 100; // Safety limit to prevent infinite loops

interface ServerSummary {
  id: string;
  name: string;
  status: 'success' | 'error';
  tools_detected?: number;
  error?: string;
}

interface ProcessResult {
  success: boolean;
  servers_processed: number;
  results: ServerSummary[];
  error?: string;
}

/**
 * Reset all servers' last_tools_scan to null to force re-scanning
 */
async function resetAllServerScans(force: boolean = false): Promise<number> {
  if (!force) {
    console.log(chalk.yellow('⚠️ This will reset all servers to be re-scanned for tools.'));
    console.log(chalk.yellow('⚠️ To proceed, run with --force flag.'));
    return 0;
  }

  try {
    // First, count how many servers we have
    const { count, error: countError } = await supabase
      .from('servers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Then, update all servers
    const { error } = await supabase
      .from('servers')
      .update({ last_tools_scan: null })
      .not('id', 'is', null); // Update all records

    if (error) throw error;

    console.log(chalk.green(`✅ Reset ${count || 0} servers for re-scanning.`));
    
    return count || 0;
  } catch (err) {
    console.error(chalk.red('❌ Failed to reset server scans:'), err);
    throw err;
  }
}

/**
 * Count the number of servers that need to be scanned
 */
async function countPendingServers(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('servers')
      .select('id', { count: 'exact', head: true })
      .is('last_tools_scan', null);

    if (error) throw error;
    
    return count || 0;
  } catch (err) {
    console.error(chalk.red('❌ Failed to count pending servers:'), err);
    throw err;
  }
}

/**
 * Invoke the tools-detector edge function to process a batch of servers
 */
async function invokeBatchProcess(): Promise<ProcessResult> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/tools-detector`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ 
        run_mode: 'production'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to invoke tools-detector: ${response.statusText}`);
    }

    return await response.json() as ProcessResult;
  } catch (err) {
    console.error(chalk.red('❌ Error invoking tools-detector:'), err);
    return {
      success: false,
      servers_processed: 0,
      results: [],
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Process all servers in batches until none are left to process
 */
async function processAllServers(): Promise<void> {
  console.log(chalk.blue('🔍 Checking for servers to process...'));
  
  // Check if there are servers to process
  let pendingCount = await countPendingServers();
  
  if (pendingCount === 0) {
    console.log(chalk.yellow('⚠️ No servers found that need tools scanning.'));
    console.log(chalk.yellow('⚠️ Run with --reset flag to reset all servers for re-scanning.'));
    return;
  }
  
  console.log(chalk.green(`✅ Found ${pendingCount} servers to process.`));
  
  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Processing servers |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} servers | Batch: {batch}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  
  progressBar.start(pendingCount, 0, { batch: 1 });
  
  // Track statistics
  const stats = {
    processed: 0,
    success: 0,
    errors: 0,
    tools: 0,
    batches: 0
  };
  
  // Process servers in batches
  let batchNumber = 1;
  let serversProcessed = 0;
  let hasMore = true;
  
  while (hasMore && batchNumber <= MAX_BATCHES) {
    // Invoke edge function to process a batch
    const result = await invokeBatchProcess();
    
    if (!result.success) {
      console.error(chalk.red(`\n❌ Batch ${batchNumber} failed: ${result.error}`));
      await setTimeout(WAIT_BETWEEN_BATCHES);
      batchNumber++;
      continue;
    }
    
    // Track statistics
    stats.batches++;
    stats.processed += result.servers_processed;
    
    for (const server of result.results) {
      if (server.status === 'success' && server.tools_detected) {
        stats.success++;
        stats.tools += server.tools_detected;
      } else {
        stats.errors++;
      }
    }
    
    // Update progress
    serversProcessed += result.servers_processed;
    progressBar.update(serversProcessed, { batch: batchNumber });
    
    // Check if we've processed all servers
    if (result.servers_processed < BATCH_SIZE) {
      hasMore = false;
    } else {
      // Wait before next batch to avoid overwhelming the edge function
      await setTimeout(WAIT_BETWEEN_BATCHES);
    }
    
    batchNumber++;
  }
  
  progressBar.stop();
  
  // Final report
  console.log(chalk.green('\n✅ Server tools update completed!'));
  console.log(chalk.blue('📊 Statistics:'));
  console.log(`   Batches processed: ${stats.batches}`);
  console.log(`   Servers processed: ${stats.processed}`);
  console.log(`   Successful updates: ${stats.success}`);
  console.log(`   Failed updates: ${stats.errors}`);
  console.log(`   Total tools detected: ${stats.tools}`);
  console.log(`   Average tools per server: ${stats.success > 0 ? (stats.tools / stats.success).toFixed(2) : 0}`);
  
  // Check for remaining servers
  const remainingCount = await countPendingServers();
  if (remainingCount > 0) {
    console.log(chalk.yellow(`\n⚠️ There are still ${remainingCount} servers that need processing.`));
    console.log(chalk.yellow('⚠️ Run this script again to continue processing them.'));
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const resetFlag = args.includes('--reset');
  const forceFlag = args.includes('--force');

  console.log(chalk.blue('🔄 MCP Server Tools Update'));
  console.log(chalk.blue('========================'));
  
  if (resetFlag) {
    await resetAllServerScans(forceFlag);
    if (!forceFlag) {
      return;
    }
  }
  
  await processAllServers();
}

// Run the script
main().catch(err => {
  console.error(chalk.red('❌ Fatal error:'), err);
  process.exit(1);
});
