/**
 * Test script for GitHub data enrichment with README parsing integration
 * 
 * This script tests the enhanced GitHub data enrichment functionality
 * by processing sample repositories and displaying the enriched data.
 */
const { 
  enrichWithGitHubData,
  processAndUpdateReadmeData,
  processAllServerReadmes
} = require('./database');
require('dotenv').config();

// Test repositories to process
const testRepos = [
  'https://github.com/supabase/supabase',
  'https://github.com/anthropics/anthropic-sdk-typescript',
  'https://github.com/microsoft/TypeScript'
];

async function testEnrichment() {
  console.log('Testing GitHub data enrichment with README parsing...');
  console.log('--------------------------------------------------\n');

  for (const repoUrl of testRepos) {
    console.log(`Testing enrichment for ${repoUrl}...`);
    
    try {
      // Test enrichment
      console.log(`\nEnriching data for ${repoUrl}...`);
      const data = await enrichWithGitHubData(repoUrl, true);
      
      if (!data) {
        console.warn(`No data found for ${repoUrl}`);
        continue;
      }
      
      // Log repository info
      console.log('\nRepository info:');
      console.log(`Stars: ${data.stars}`);
      console.log(`Forks: ${data.forks}`);
      console.log(`Open issues: ${data.open_issues}`);
      console.log(`Last updated: ${data.last_updated}`);
      console.log(`Description: ${data.description}`);
      
      // Log README data if available
      if (data.readme) {
        console.log('\nREADME data:');
        console.log(`Overview length: ${data.readme.overview.length} characters`);
        
        if (data.readme.installation) {
          console.log(`Installation blocks: ${data.readme.installation.code_blocks.length}`);
          if (data.readme.installation.code_blocks.length > 0) {
            console.log('First installation block:');
            console.log(data.readme.installation.code_blocks[0]);
          }
        }
        
        if (data.readme.api) {
          console.log(`API endpoints: ${data.readme.api.endpoints.length}`);
          data.readme.api.endpoints.slice(0, 3).forEach((endpoint, i) => {
            console.log(`${i + 1}. ${endpoint.method} ${endpoint.path}`);
          });
        }
        
        if (data.readme.compatibility) {
          console.log(`Compatibility platforms: ${data.readme.compatibility.platforms.length}`);
          console.log(data.readme.compatibility.platforms.join(', '));
        }
      } else {
        console.log('\nNo README data found');
      }
      
      console.log('\n--------------------------------------------------\n');
    } catch (error) {
      console.error(`Error testing ${repoUrl}:`, error);
    }
  }
}

async function testMockServerUpdate() {
  console.log('Testing server update with mock data...');
  console.log('--------------------------------------------------\n');
  
  // Create mock server ID and GitHub URL
  const mockServerId = 'mock-server-id';
  const mockGithubUrl = 'https://github.com/microsoft/TypeScript';
  
  try {
    // Simulate updating a server with README data
    console.log(`Processing README data for mock server ${mockServerId}...`);
    
    // This won't actually update the database since we're using a mock ID
    // but it will test the data processing functionality
    const result = await processAndUpdateReadmeData(mockServerId, mockGithubUrl);
    
    console.log('\nProcessing result:');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message || result.error}`);
    
    if (result.data) {
      console.log('\nProcessed data overview:');
      
      // Log overview length
      if (result.data.overview) {
        console.log(`Overview length: ${result.data.overview.length} characters`);
      }
      
      // Log installation data
      if (result.data.installation) {
        console.log(`Installation code blocks: ${result.data.installation.code_blocks.length}`);
      }
      
      // Log API data
      if (result.data.api) {
        console.log(`API endpoints: ${result.data.api.endpoints.length}`);
      }
      
      // Log compatibility data
      if (result.data.compatibility) {
        console.log(`Compatibility platforms: ${result.data.compatibility.platforms.length}`);
      }
    }
    
    console.log('\n--------------------------------------------------\n');
  } catch (error) {
    console.error('Error testing mock server update:', error);
  }
}

// Run tests
async function runTests() {
  await testEnrichment();
  await testMockServerUpdate();
  console.log('Tests completed');
}

runTests().catch(error => console.error('Tests failed:', error));
