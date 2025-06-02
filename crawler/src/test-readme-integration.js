/**
 * README Parser Integration Test
 * 
 * This script tests the complete GitHub README parsing workflow:
 * 1. Fetches README data for sample repositories
 * 2. Processes and structures the extracted data
 * 3. Simulates database storage and retrieval
 * 
 * Usage:
 *   node src/test-readme-integration.js
 */

const { enrichWithGitHubData, processAndUpdateReadmeData } = require('./database');
const { extractReadmeData } = require('./readme-parser');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('-d');

// Test repositories with different README structures
const TEST_REPOS = [
  {
    name: 'Supabase',
    url: 'https://github.com/supabase/supabase',
    description: 'Open source Firebase alternative'
  },
  {
    name: 'Anthropic TypeScript SDK',
    url: 'https://github.com/anthropics/anthropic-sdk-typescript',
    description: 'TypeScript SDK for Anthropic AI'
  },
  {
    name: 'TypeScript',
    url: 'https://github.com/microsoft/TypeScript',
    description: 'JavaScript with syntax for types'
  }
];

/**
 * Tests direct README extraction for a repository
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @returns {Promise<Object>} Extraction results
 */
async function testDirectExtraction(owner, repo) {
  console.log(`\nTesting direct README extraction for ${owner}/${repo}...`);
  
  try {
    const readmeData = await extractReadmeData(owner, repo);
    
    if (!readmeData) {
      console.log('No README data extracted');
      return null;
    }
    
    // Print extraction summary
    console.log('Extraction summary:');
    console.log(`- Overview: ${readmeData.overview ? `${readmeData.overview.length} chars` : 'None'}`);
    
    if (readmeData.installation) {
      console.log(`- Installation blocks: ${readmeData.installation.codeBlocks ? readmeData.installation.codeBlocks.length : 0}`);
    } else {
      console.log('- No installation instructions found');
    }
    
    if (readmeData.api) {
      console.log(`- API endpoints: ${readmeData.api.endpoints ? readmeData.api.endpoints.length : 0}`);
    } else {
      console.log('- No API documentation found');
    }
    
    if (readmeData.compatibility) {
      console.log(`- Compatibility platforms: ${readmeData.compatibility.platforms ? readmeData.compatibility.platforms.length : 0}`);
    } else {
      console.log('- No compatibility information found');
    }
    
    return readmeData;
  } catch (error) {
    console.error(`Error in direct extraction for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Tests GitHub data enrichment with README parsing
 * @param {string} repoUrl GitHub repository URL
 * @param {string} repoName Repository name for display
 * @returns {Promise<Object>} Enriched data
 */
async function testGitHubEnrichment(repoUrl, repoName) {
  console.log(`\nTesting GitHub enrichment for ${repoName} (${repoUrl})...`);
  
  try {
    // Test with README parsing enabled
    const enrichedData = await enrichWithGitHubData(repoUrl, true);
    
    // Print basic metadata
    console.log('Repository metadata:');
    console.log(`- Stars: ${enrichedData.stars || 0}`);
    console.log(`- Forks: ${enrichedData.forks || 0}`);
    console.log(`- Description: ${enrichedData.description || 'None'}`);
    
    // Print README data if available
    if (enrichedData.readme) {
      console.log('\nREADME data:');
      console.log(`- Overview: ${enrichedData.readme.overview ? `${enrichedData.readme.overview.length} chars` : 'None'}`);
      
      if (enrichedData.readme.installation) {
        console.log(`- Installation blocks: ${enrichedData.readme.installation.code_blocks ? enrichedData.readme.installation.code_blocks.length : 0}`);
        if (enrichedData.readme.installation.code_blocks && enrichedData.readme.installation.code_blocks.length > 0) {
          console.log(`  First block sample: ${enrichedData.readme.installation.code_blocks[0].substring(0, 50)}...`);
        }
      }
      
      if (enrichedData.readme.api) {
        console.log(`- API documentation: ${enrichedData.readme.api.documentation ? 'Present' : 'None'}`);
        console.log(`- API endpoints: ${enrichedData.readme.api.endpoints ? enrichedData.readme.api.endpoints.length : 0}`);
      }
    } else {
      console.log('\nNo README data found');
    }
    
    return enrichedData;
  } catch (error) {
    console.error(`Error in GitHub enrichment for ${repoName}:`, error);
    return null;
  }
}

/**
 * Tests the complete README processing workflow
 * @param {string} repoUrl GitHub repository URL
 * @param {string} repoName Repository name for display
 * @param {boolean} dryRun Whether to skip database updates
 * @returns {Promise<Object>} Processing results
 */
async function testFullWorkflow(repoUrl, repoName, dryRun = false) {
  console.log(`\n=== Testing full workflow for ${repoName} ${dryRun ? '(DRY RUN)' : ''} ===`);
  
  try {
    // Step 1: Enrich with GitHub data including README
    console.log('\nStep 1: Enriching with GitHub data...');
    const enrichedData = await enrichWithGitHubData(repoUrl, true);
    
    if (!enrichedData || !enrichedData.readme) {
      console.log('No README data found in enrichment');
      return { success: false, error: 'No README data found' };
    }
    
    // Step 2: Create mock server record
    console.log('\nStep 2: Creating mock server record...');
    const mockServerId = `mock-${Date.now()}`;
    console.log(`Mock server ID: ${mockServerId}`);
    
    let result;
    
    if (dryRun) {
      // Skip database update in dry run mode
      console.log('\nStep 3: Simulating README data processing (DRY RUN)...');
      console.log('Skipping database update in dry run mode');
      
      // Simulate successful processing
      result = {
        success: true,
        message: 'Simulated processing in dry run mode',
        data: enrichedData.readme
      };
    } else {
      // Step 3: Process and update README data
      console.log('\nStep 3: Processing README data...');
      // This will try to update the database
      result = await processAndUpdateReadmeData(mockServerId, repoUrl);
    }
    
    console.log('\nWorkflow results:');
    console.log(`- Success: ${result.success}`);
    
    if (result.success) {
      console.log(`- Message: ${result.message || 'Processing succeeded'}`);
      
      if (result.data) {
        // Log data summary
        console.log('\nExtracted data summary:');
        console.log(`- Overview: ${result.data.overview ? `${result.data.overview.length} chars` : 'None'}`);
        
        if (result.data.installation) {
          console.log(`- Installation blocks: ${result.data.installation.code_blocks || result.data.installation.codeBlocks ? 
            (result.data.installation.code_blocks || result.data.installation.codeBlocks).length : 0}`);
        }
        
        if (result.data.api) {
          console.log(`- API documentation: ${result.data.api.documentation ? 'Present' : 'None'}`);
        }
      }
    } else {
      console.log(`- Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error in full workflow for ${repoName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests sequentially
 */
async function runTests() {
  console.log('=== README PARSER INTEGRATION TEST ===');
  console.log(`Testing various repositories and workflows ${DRY_RUN ? '(DRY RUN MODE)' : ''}\n`);

  if (DRY_RUN) {
    console.log('  DRY RUN MODE ENABLED - No database updates will be attempted');
    console.log('   This mode is useful when the database schema has not been updated yet.\n');
  }
  
  // Track test results
  const results = {
    extraction: 0,
    enrichment: 0,
    workflow: 0
  };
  
  for (const repo of TEST_REPOS) {
    console.log(`\n-----------------------------------------`);
    console.log(`Testing repository: ${repo.name}`);
    console.log(`URL: ${repo.url}`);
    console.log(`Description: ${repo.description}`);
    console.log(`-----------------------------------------`);
    
    // Extract owner/repo from URL
    const match = repo.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      console.error(`Invalid GitHub URL format: ${repo.url}`);
      continue;
    }
    
    const [, owner, repoName] = match;
    
    // Test 1: Direct README extraction
    const extractionResult = await testDirectExtraction(owner, repoName);
    if (extractionResult) results.extraction++;
    
    // Test 2: GitHub data enrichment
    const enrichmentResult = await testGitHubEnrichment(repo.url, repo.name);
    if (enrichmentResult && enrichmentResult.readme) results.enrichment++;
    
    // Test 3: Full workflow test (with dry run if specified)
    const workflowResult = await testFullWorkflow(repo.url, repo.name, DRY_RUN);
    if (workflowResult && workflowResult.success) results.workflow++;
  }
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total repositories tested: ${TEST_REPOS.length}`);
  console.log(`Direct extraction successful: ${results.extraction}/${TEST_REPOS.length}`);
  console.log(`GitHub enrichment successful: ${results.enrichment}/${TEST_REPOS.length}`);
  console.log(`Full workflow successful: ${results.workflow}/${TEST_REPOS.length}`);
  
  const overallSuccess = results.extraction > 0 && results.enrichment > 0 && results.workflow > 0;
  console.log(`\nOverall test result: ${overallSuccess ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
}

// Run all tests if this script is called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
}

module.exports = { 
  testDirectExtraction,
  testGitHubEnrichment,
  testFullWorkflow,
  runTests
};
