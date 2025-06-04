/**
 * Main script for scraping Smithery.ai server data and populating the database
 * 
 * This script is designed to:
 * 1. Crawl Smithery.ai server pages
 * 2. Extract comprehensive data from all tabs
 * 3. Transform the data to match our database schema
 * 4. Insert/update records in the database
 * 5. Verify data consistency
 */

const { crawlSmitheryServer, processBatch } = require('./smithery-crawler');
const { 
  serverExists, 
  insertServer, 
  updateServer,
  verifyDataConsistency
} = require('./database-operations');
const { formatDate, slugify } = require('./utils');
require('dotenv').config();

// Configure crawling options
const UPDATE_EXISTING = process.env.UPDATE_EXISTING === 'true';
const MAX_SERVERS = process.env.MAX_SERVERS ? parseInt(process.env.MAX_SERVERS) : null;
const CRAWL_BATCH_SIZE = process.env.CRAWL_BATCH_SIZE ? parseInt(process.env.CRAWL_BATCH_SIZE) : 1; // Reduced to 1 for rate limit handling
const CRAWL_DELAY_MS = process.env.CRAWL_DELAY_MS ? parseInt(process.env.CRAWL_DELAY_MS) : 5000; // Increased to 5 seconds

// Smithery server URLs to crawl
const SMITHERY_SERVERS = [
  'https://smithery.ai/server/@upstash/context7-mcp',
  'https://smithery.ai/server/@homanp/firecrawl-mcp-server',
  'https://smithery.ai/server/@smithery/gitmcp',
  'https://smithery.ai/server/@hubspot/hubspot-mcp',
  'https://smithery.ai/server/@linear/linear-mcp',
  'https://smithery.ai/server/@puppeteer/puppeteer-mcp',
  'https://smithery.ai/server/@netlify/netlify-mcp',
  'https://smithery.ai/server/@supabase/supabase-mcp-server'
];

// Summary statistics
const summary = {
  crawled: 0,
  added: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  details: {
    added: [],
    updated: [],
    skipped: [],
    errors: []
  }
};

/**
 * Process a single server
 * @param {Object} serverData Server data from crawler
 * @param {Object} summary Summary object to update
 */
async function processServer(serverData, summary) {
  try {
    // Ensure the server has required fields
    if (!serverData.name) {
      throw new Error('Server data missing name');
    }
    
    // Generate a slug if not present
    if (!serverData.slug) {
      serverData.slug = slugify(serverData.name);
    }
    
    // Check if server already exists
    const { exists, data: existingServer } = await serverExists(serverData);
    
    if (exists) {
      if (UPDATE_EXISTING) {
        console.log(`Updating existing server: ${serverData.name} (${existingServer.id})`);
        const success = await updateServer(existingServer.id, serverData);
        
        if (success) {
          summary.updated++;
          summary.details.updated.push({
            name: serverData.name,
            id: existingServer.id
          });
          console.log(`Updated server: ${serverData.name}`);
        } else {
          throw new Error(`Failed to update server: ${serverData.name}`);
        }
      } else {
        summary.skipped++;
        summary.details.skipped.push({
          name: serverData.name,
          reason: 'exists'
        });
        console.log(`Skipped existing server: ${serverData.name}`);
      }
      return;
    }
    
    // Insert new server
    const serverId = await insertServer(serverData);
    
    summary.added++;
    summary.details.added.push({
      name: serverData.name,
      id: serverId
    });
    console.log(`Added new server: ${serverData.name} (${serverId})`);
  } catch (error) {
    console.error(`Error processing server ${serverData.name}:`, error);
    summary.errors++;
    summary.details.errors.push({
      name: serverData.name,
      error: error.message
    });
  }
}

/**
 * Main function to crawl servers and populate database
 */
async function main() {
  console.log(`Starting Smithery.ai server crawl at ${formatDate(new Date())}`);
  console.log(`Configuration: Update existing: ${UPDATE_EXISTING}, Max servers: ${MAX_SERVERS || 'unlimited'}`);
  console.log(`Batch size: ${CRAWL_BATCH_SIZE}, Delay between servers: ${CRAWL_DELAY_MS}ms`);
  
  // Limit servers if MAX_SERVERS is set
  const serversToCrawl = MAX_SERVERS ? SMITHERY_SERVERS.slice(0, MAX_SERVERS) : SMITHERY_SERVERS;
  console.log(`Will crawl ${serversToCrawl.length} servers`);
  
  // Process servers sequentially with delay to avoid rate limiting
  for (let i = 0; i < serversToCrawl.length; i++) {
    const serverUrl = serversToCrawl[i];
    console.log(`\nProcessing server ${i + 1}/${serversToCrawl.length}: ${serverUrl}`);
    
    try {
      // Process one server at a time with error handling
      const serverData = await crawlSmitheryServer(serverUrl);
      summary.crawled++;
      await processServer(serverData, summary);
    } catch (error) {
      console.error(`Error processing server ${serverUrl}:`, error);
      summary.errors++;
      summary.details.errors.push({
        server: serverUrl,
        error: error.message
      });
    }
    
    // Delay before next server to avoid rate limiting
    if (i < serversToCrawl.length - 1) {
      console.log(`Waiting ${CRAWL_DELAY_MS}ms before next server...`);
      await new Promise(resolve => setTimeout(resolve, CRAWL_DELAY_MS));
    }
  }
  
  // Log summary
  console.log(`\nCrawl completed at ${formatDate(new Date())}`);
  console.log(`Summary: ${summary.crawled} servers crawled, ${summary.added} added, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.errors} errors`);
  
  // Detailed summary
  if (summary.details.added.length > 0) {
    console.log('\nAdded servers:');
    summary.details.added.forEach(s => console.log(` - ${s.name} (ID: ${s.id})`));
  }
  
  if (summary.details.updated.length > 0) {
    console.log('\nUpdated servers:');
    summary.details.updated.forEach(s => console.log(` - ${s.name} (ID: ${s.id})`));
  }
  
  if (summary.errors > 0) {
    console.log('\nErrors:');
    summary.details.errors.forEach(e => console.log(` - ${e.server || e.batch}: ${e.error}`));
  }
  
  // Verify data consistency
  console.log('\nVerifying data consistency...');
  const consistencyCheck = await verifyDataConsistency();
  
  console.log(`Found ${consistencyCheck.servers.length} servers in database`);
  console.log(`Server tools: ${consistencyCheck.tools} total`);
  console.log(`Server metrics: ${consistencyCheck.metrics} total`);
  console.log(`Server health data: ${consistencyCheck.health} total`);
  console.log(`Compatible clients: ${consistencyCheck.clients} total`);
}

// Run the script
main().catch(console.error);
