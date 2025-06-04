/**
 * Test script for Puppeteer-based MCP Directory crawler
 */
require('dotenv').config();
const puppeteerUtils = require('./src/puppeteer-utils');

// Test URLs (try local host or reliable servers first)
const testUrls = [
  'https://hub.smithery.ai/servers/netlify-mcp',  // Try a different server that might be more reliable
  'https://smithery.ai/servers/supabase-mcp-server',
  'https://xomatic.ai/servers/brave-search'  // Try Xomatic.ai domain as per the rebrand
];

async function runTests() {
  // Use first URL that works
  let testUrl = testUrls[0];
  let serverSlug = 'netlify-mcp';
  
  try {
    // Show initial cache stats
    console.log('=== Initial Cache Stats ===');
    console.log(puppeteerUtils.getCacheStats());
    
    console.log('=== TESTING PUPPETEER-BASED MCP DIRECTORY CRAWLER ===');
    
    console.log('\n=== Testing Tools Extraction ===');
    let toolsData;
    try {
      toolsData = await puppeteerUtils.extractToolsData(testUrl, serverSlug);
      console.log(`Successfully extracted ${toolsData.tools.length} tools`);
      console.log('Sample tools:', toolsData.tools.slice(0, 3));
    } catch (error) {
      console.error('Error in tools extraction test:', error.message || error);
      toolsData = { tools: [] };
    }
    
    console.log('\n=== Testing Overview Extraction ===');
    let overviewData;
    try {
      overviewData = await puppeteerUtils.extractOverviewData(`${testUrl}/overview`);
      console.log('Overview data keys:', Object.keys(overviewData));
      if (overviewData && overviewData.name) {
        console.log('Server name:', overviewData.name);
      }
    } catch (error) {
      console.error('Error in overview extraction test:', error.message || error);
      overviewData = {};
    }
    
    console.log('\n=== Testing API Extraction ===');
    let apiData;
    try {
      apiData = await puppeteerUtils.extractApiData(`${testUrl}/api`);
      console.log('API data keys:', Object.keys(apiData));
      console.log('Install methods:', Object.keys(apiData.install_code_blocks || {}));
    } catch (error) {
      console.error('Error in API extraction test:', error.message || error);
      apiData = {};
    }
    
    console.log('\n=== Testing Cache Functionality ===');
    try {
      // Display current cache stats
      console.log('Cache stats after initial scraping:');
      console.log(puppeteerUtils.getCacheStats());
      
      // Make the same API call again - should use cache
      console.log('\nRunning second API extraction (should use cache):');
      const cachedApiData = await puppeteerUtils.extractApiData(`${testUrl}/api`, {
        useCache: true,
        forceFresh: false
      });
      console.log(`Second API call completed, keys: ${Object.keys(cachedApiData).length}`);
      
      // Force a fresh extraction to bypass cache
      console.log('\nRunning third API extraction with forceFresh=true:');
      const freshApiData = await puppeteerUtils.extractApiData(`${testUrl}/api`, {
        useCache: true,
        forceFresh: true
      });
      console.log(`Third API call (force fresh) completed, keys: ${Object.keys(freshApiData).length}`);
      
      // Clear the cache for a specific URL
      console.log('\nClearing cache for API URL:');
      puppeteerUtils.clearCache(`${testUrl}/api`);
      console.log('Cache stats after clearing API URL:');
      console.log(puppeteerUtils.getCacheStats());
      
      // Clear the entire cache
      console.log('\nClearing entire cache:');
      puppeteerUtils.clearCache();
      console.log('Cache stats after clearing all:');
      console.log(puppeteerUtils.getCacheStats());
    } catch (error) {
      console.error('Cache testing error:', error.message || error);
    }
    
    console.log('\n=== TESTS COMPLETED ===');
  } catch (error) {
    console.error('Test failed:', error.message || error);
  } finally {
    // Always make sure browser is closed
    try {
      await puppeteerUtils.closeBrowser();
      console.log('Browser closed successfully.');
    } catch (error) {
      console.error('Error closing browser:', error.message || error);
    }
  }
}

runTests();
