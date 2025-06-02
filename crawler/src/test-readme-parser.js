/**
 * Test script for README parser
 * 
 * This script tests the README parser module by fetching and parsing
 * the README from a sample GitHub repository.
 */
const { 
  fetchReadmeContent, 
  extractReadmeData
} = require('./readme-parser');
require('dotenv').config();

// Test repositories to parse
const testRepos = [
  { owner: 'supabase', repo: 'supabase' }, // Supabase MCP
  { owner: 'anthropics', repo: 'anthropic-sdk-typescript' }, // Anthropic SDK
  { owner: 'microsoft', repo: 'TypeScript' } // TypeScript
];

async function runTest() {
  console.log('Testing README parser...');
  console.log('------------------------\n');

  for (const { owner, repo } of testRepos) {
    console.log(`Testing ${owner}/${repo}...`);
    
    try {
      // Test full extraction
      console.log(`\nExtracting README data for ${owner}/${repo}...`);
      const data = await extractReadmeData(owner, repo);
      
      if (!data) {
        console.warn(`No README found for ${owner}/${repo}`);
        continue;
      }
      
      // Log overview summary
      console.log('\nOverview summary:');
      console.log(data.overview.substring(0, 150) + '...');
      
      // Log installation instructions
      console.log('\nInstallation instructions found:');
      console.log(`${data.installation.codeBlocks.length} code blocks extracted`);
      if (data.installation.codeBlocks.length > 0) {
        console.log('First code block:');
        console.log(data.installation.codeBlocks[0]);
      }
      
      // Log API endpoints
      console.log('\nAPI endpoints found:');
      console.log(`${data.api.endpoints.length} endpoints extracted`);
      data.api.endpoints.slice(0, 3).forEach((endpoint, i) => {
        console.log(`${i + 1}. ${endpoint.method} ${endpoint.path}`);
      });
      
      // Log compatibility info
      console.log('\nCompatibility info:');
      console.log(`${data.compatibility.platforms.length} platforms/versions extracted`);
      console.log(data.compatibility.platforms.join(', '));
      
      // Log changelog versions
      console.log('\nChangelog versions:');
      console.log(`${data.changelog.versions.length} versions extracted`);
      data.changelog.versions.slice(0, 3).forEach((version, i) => {
        console.log(`${i + 1}. ${version.version}: ${version.description}`);
      });
      
      console.log('\n------------------------\n');
    } catch (error) {
      console.error(`Error testing ${owner}/${repo}:`, error);
    }
  }
}

runTest().catch(error => console.error('Test failed:', error));
