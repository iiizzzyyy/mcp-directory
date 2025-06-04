/**
 * Temporary script to run the Smithery.ai crawler with optimized settings
 * This script sets environment variables and then runs the main crawler
 */

// Set optimal environment variables for crawling
process.env.UPDATE_EXISTING = 'true';    // Update existing records
process.env.MAX_SERVERS = '';            // No limit on servers to crawl (crawl all)
process.env.CRAWL_BATCH_SIZE = '1';      // Process one server at a time to avoid rate limits
process.env.CRAWL_DELAY_MS = '3000';     // 3 second delay between requests to avoid rate limits

// Run the main crawler script
console.log('Starting Smithery.ai crawler with optimized settings...');
console.log(`UPDATE_EXISTING: ${process.env.UPDATE_EXISTING}`);
console.log(`MAX_SERVERS: ${process.env.MAX_SERVERS || 'unlimited'}`);
console.log(`CRAWL_BATCH_SIZE: ${process.env.CRAWL_BATCH_SIZE}`);
console.log(`CRAWL_DELAY_MS: ${process.env.CRAWL_DELAY_MS}ms`);

// Import and run the main crawler
require('./src/smithery-main');
