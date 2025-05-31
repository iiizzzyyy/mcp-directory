/**
 * Test script for the crawl-pulsemcp-servers edge function
 * 
 * Prerequisites:
 * 1. Set FIRECRAWL_API_KEY in Supabase edge function secrets
 * 2. npm install node-fetch@2
 * 
 * Usage:
 * node test-pulsemcp-scraper.js
 *
 * Updated: Now using PulseMCP API directly instead of web scraping
 */

const fetch = require('node-fetch');

async function testPulseMCPScraper() {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nryytfezkmptcmpawlva.supabase.co';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/crawl-pulsemcp-servers`;
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeXl0ZmV6a21wdGNtcGF3bHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTA1ODUsImV4cCI6MjA2NDA4NjU4NX0.F2SYK_bTnafFn0H9tt_vOAHhqzZrC5LEcXkW2S1src8';
  
  console.log(`Testing edge function at: ${FUNCTION_URL}`);
  console.log('UPDATED: Now using PulseMCP API directly instead of web scraping');
  
  try {
    // Test first with the PulseMCP API directly to make sure it's accessible
    console.log('Verifying PulseMCP API access...');
    const pulsemcpResponse = await fetch('https://api.pulsemcp.com/v0beta/servers?count_per_page=1');
    if (!pulsemcpResponse.ok) {
      console.warn(`Warning: PulseMCP API direct access test failed: ${pulsemcpResponse.statusText}`);
    } else {
      const pulsemcpData = await pulsemcpResponse.json();
      console.log(`PulseMCP API direct access successful. Found ${pulsemcpData.servers?.length || 0} servers.`);
    }
    
    // Now test our edge function
    console.log('Testing edge function...');
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        limit: 2 // Start with just 2 servers for testing
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('Function executed successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Log stats summary
    if (data.stats) {
      console.log('\nScraping Statistics:');
      console.log(`- Processed: ${data.stats.processed}`);
      console.log(`- Updated: ${data.stats.updated}`);
      console.log(`- Failed: ${data.stats.failed}`);
      console.log(`- Skipped: ${data.stats.skipped}`);
    }
  } catch (error) {
    console.error('Error testing edge function:', error.message);
  }
}

testPulseMCPScraper();
