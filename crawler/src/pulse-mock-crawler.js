const { pulseMcpServers } = require('./pulse-mock-data');
const { serverExists, insertServer, enrichWithGitHubData } = require('./database');
const { formatDate } = require('./utils');
require('dotenv').config();

// Summary statistics
const summary = {
  crawled: 0,
  added: 0,
  skipped: 0,
  duplicates: 0,
  errors: 0,
  details: {
    added: [],
    skipped: [],
    errors: []
  }
};

/**
 * Process a single server
 * @param {Object} server Server data
 * @param {Object} summary Summary object to update
 */
async function processServer(server, summary) {
  try {
    // Check if server already exists
    const exists = await serverExists(server);
    
    if (exists) {
      summary.skipped++;
      summary.duplicates++;
      summary.details.skipped.push({
        name: server.name,
        source: server.source,
        reason: 'duplicate'
      });
      console.log(`Skipped duplicate: ${server.name}`);
      return;
    }
    
    // Enrich with GitHub data if available
    if (server.github_url) {
      console.log(`Enriching ${server.name} with GitHub data from ${server.github_url}`);
      const githubData = await enrichWithGitHubData(server.github_url);
      Object.assign(server, githubData);
    }
    
    // Insert server into database
    await insertServer(server);
    
    summary.added++;
    summary.details.added.push({
      name: server.name,
      source: server.source
    });
    console.log(`Added server: ${server.name}`);
  } catch (error) {
    summary.errors++;
    summary.details.errors.push({
      server: server.name,
      error: `Error processing server ${server.name}: ${error.message}`
    });
    console.error(`Error processing server ${server.name}:`, error);
  }
}

/**
 * Main function to process the PulseMCP mock data
 */
async function main() {
  console.log('Starting PulseMCP Mock Data Crawler');
  console.log(`Using Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`GitHub API Token present: ${!!process.env.GITHUB_API_TOKEN}`);
  console.log('-------------------------------------------');
  
  const startTime = new Date();
  
  try {
    // Use mock data instead of crawling
    console.log(`Processing ${pulseMcpServers.length} PulseMCP servers`);
    summary.crawled = pulseMcpServers.length;
    
    // Process each server
    for (const server of pulseMcpServers) {
      await processServer(server, summary);
    }
    
  } catch (error) {
    console.error('Error processing PulseMCP mock data:', error);
  }
  
  const endTime = new Date();
  const durationMs = endTime - startTime;
  
  // Print summary
  console.log('\n-------------------------------------------');
  console.log('Crawl Summary:');
  console.log(`Crawled: ${summary.crawled} servers`);
  console.log(`Added: ${summary.added} servers`);
  console.log(`Skipped: ${summary.skipped} servers (Duplicates: ${summary.duplicates})`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(2)} seconds`);
  
  if (summary.details.added.length > 0) {
    console.log('\nAdded Servers:');
    summary.details.added.forEach(server => {
      console.log(`- ${server.name} (from ${server.source})`);
    });
  }
  
  if (summary.details.skipped.length > 0) {
    console.log('\nSkipped Servers:');
    summary.details.skipped.forEach(server => {
      console.log(`- ${server.name} (from ${server.source}): ${server.reason}`);
    });
  }
  
  if (summary.details.errors.length > 0) {
    console.log('\nErrors:');
    summary.details.errors.forEach(error => {
      console.log(`- ${error.server || 'Unknown'}: ${error.error}`);
    });
  }
  
  console.log('\nCrawl completed at', formatDate(endTime));
}

// Run the crawler
main().catch(console.error);
