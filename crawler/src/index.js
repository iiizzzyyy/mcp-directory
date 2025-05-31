const { crawlDirectory, processBatch } = require('./crawler');
const { serverExists, insertServer, enrichWithGitHubData } = require('./database');
const { formatDate } = require('./utils');
require('dotenv').config();

// Domains to crawl
const domains = [
  'https://www.pulsemcp.com/servers',
  'https://mcp.so/',
  'https://mcpservers.org/'
];

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
      domain: server.source,
      error: `Error processing server ${server.name}: ${error.message}`
    });
    console.error(`Error processing server ${server.name}:`, error);
  }
}

/**
 * Main function to crawl all domains and process results
 */
async function main() {
  console.log('Starting MCP Directory Crawler');
  console.log(`Using Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`Firecrawl API Key present: ${!!process.env.FIRECRAWL_API_KEY}`);
  console.log(`GitHub API Token present: ${!!process.env.GITHUB_API_TOKEN}`);
  console.log('-------------------------------------------');
  
  const startTime = new Date();
  
  for (const domain of domains) {
    try {
      // Crawl domain
      console.log(`\nCrawling domain: ${domain}`);
      const servers = await crawlDirectory(domain);
      summary.crawled += servers.length;
      
      // Process extracted servers
      console.log(`Processing ${servers.length} servers from ${domain}`);
      await processBatch(servers, processServer, summary);
      
    } catch (error) {
      summary.errors++;
      summary.details.errors.push({
        domain,
        error: error.message
      });
      console.error(`Error crawling domain ${domain}:`, error);
    }
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
      console.log(`- ${error.domain || 'Unknown'}: ${error.error}`);
    });
  }
  
  console.log('\nCrawl completed at', formatDate(endTime));
}

// Run the crawler
main().catch(console.error);
