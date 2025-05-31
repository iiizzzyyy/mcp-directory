#!/usr/bin/env node
/**
 * Simplified PulseMCP Server Scraper
 * 
 * This script fetches all PulseMCP servers and processes them through
 * the crawl-pulsemcp-servers edge function with proper error handling
 * and progress tracking.
 * 
 * Prerequisites:
 * 1. Set FIRECRAWL_API_KEY in Supabase edge function secrets
 * 2. npm install node-fetch@2
 * 
 * Usage:
 * node simple-pulsemcp-scraper.js [batch-size] [delay-ms]
 * 
 * Arguments:
 *   batch-size  Number of servers to process in each batch (default: 10)
 *   delay-ms    Delay between batches in milliseconds (default: 5000)
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const batchSize = parseInt(process.argv[2]) || 10;
const delayBetweenBatches = parseInt(process.argv[3]) || 5000;

// API Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nryytfezkmptcmpawlva.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/crawl-pulsemcp-servers`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeXl0ZmV6a21wdGNtcGF3bHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTA1ODUsImV4cCI6MjA2NDA4NjU4NX0.F2SYK_bTnafFn0H9tt_vOAHhqzZrC5LEcXkW2S1src8';
const PULSEMCP_API_URL = 'https://api.pulsemcp.com/v0beta/servers';
const OUTPUT_FILE = 'scrape-results.json';
const MAX_RETRIES = 3;

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
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    
    const delay = 2000 * Math.pow(2, MAX_RETRIES - retries);
    console.log(`Request failed. Retrying in ${delay/1000}s... (${retries} attempts left)`);
    await sleep(delay);
    return fetchWithRetry(url, options, retries - 1);
  }
}

// Function to get total server count
async function getTotalServerCount() {
  console.log('Checking total number of PulseMCP servers...');
  
  try {
    const response = await fetch(`${PULSEMCP_API_URL}?count_per_page=1`);
    if (!response.ok) {
      console.error('Failed to connect to PulseMCP API');
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const count = data.total_count || 0;
    console.log(`Found ${count} PulseMCP servers to process`);
    return count;
  } catch (error) {
    console.error(`Error checking server count: ${error.message}`);
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
  console.log(`Processing batch ${batchNumber}/${totalBatches} (${serverIds.length} servers)`);
  
  try {
    const batchStartTime = new Date();
    const requestBody = { serverIds };
    
    const response = await fetchWithRetry(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(requestBody)
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
    
    console.log(`Batch ${batchNumber}/${totalBatches} completed in ${batchDuration.toFixed(1)}s (${data.stats?.updated || 0} updated, ${data.stats?.failed || 0} failed)`);
    
    // Verbose logging
    if (data.stats?.details) {
      console.log('\nServer details:');
      data.stats.details.forEach(server => {
        const statusSymbol = server.status === 'updated' ? '✅' : 
                           server.status === 'failed' ? '❌' : '⚠️';
        console.log(`  ${statusSymbol} ${server.name}: ${server.status}${server.error ? ` (${server.error})` : ''}`);
      });
      console.log('');
    }
    
    return data;
  } catch (error) {
    console.error(`Batch ${batchNumber}/${totalBatches} failed: ${error.message}`);
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
  const outputPath = path.resolve(OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);
}

// Main execution function
async function main() {
  console.log('\n🚀 PulseMCP Server Scraper');
  console.log('================================================');
  
  // Log configuration
  console.log('Configuration:');
  console.log(`  • Batch Size: ${batchSize}`);
  console.log(`  • Delay Between Batches: ${delayBetweenBatches}ms`);
  console.log(`  • Max Retries: ${MAX_RETRIES}`);
  console.log(`  • Output File: ${OUTPUT_FILE}`);
  console.log('================================================\n');
  
  try {
    // Get total server count
    const totalCount = await getTotalServerCount();
    results.totalServers = totalCount;
    
    if (totalCount === 0) {
      console.log('No servers found. Exiting.');
      return;
    }
    
    // Calculate number of batches
    const totalBatches = Math.ceil(totalCount / batchSize);
    
    console.log(`Starting processing of ${totalCount} servers in ${totalBatches} batches...\n`);
    
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
      
      console.log(`Progress: ${batchIndex + 1}/${totalBatches} batches (${Math.round((batchIndex + 1) / totalBatches * 100)}%)`);
      
      // Delay before next batch unless it's the last one
      if (batchIndex < totalBatches - 1) {
        console.log(`Waiting ${delayBetweenBatches/1000} seconds before next batch...`);
        await sleep(delayBetweenBatches);
      }
    }
    
    // Finalize results
    results.endTime = new Date();
    const totalDuration = (results.endTime - results.startTime) / 1000;
    
    // Print summary
    console.log('\n================================================');
    console.log('✅ Scraping Complete!');
    console.log('================================================');
    console.log('\nSummary:');
    console.log(`  • Total Servers: ${results.totalServers}`);
    console.log(`  • Servers Processed: ${results.processed}`);
    console.log(`  • Servers Updated: ${results.updated}`);
    console.log(`  • Servers Failed: ${results.failed}`);
    console.log(`  • Servers Skipped: ${results.skipped}`);
    console.log(`  • Batches Processed: ${results.batchesProcessed}/${totalBatches}`);
    console.log(`  • Total Duration: ${totalDuration.toFixed(1)} seconds`);
    console.log(`  • Average Time Per Server: ${(totalDuration / results.processed || 1).toFixed(2)} seconds`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️ Errors: ${results.errors.length} batches had errors`);
    }
    
    // Save results to file
    saveResults(results);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
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
  console.error(`\n❌ Fatal Error: ${error.message}`);
  process.exit(1);
});
