/**
 * Batch README Processing Script
 * 
 * This script processes GitHub README files for MCP servers in the database
 * and extracts structured data like installation instructions, API docs, and compatibility.
 * 
 * Usage:
 *   node process-server-readmes.js [--limit=10] [--dryrun]
 * 
 * Options:
 *   --limit=N    Process only N servers (default: 10)
 *   --dryrun     Test process without updating database
 */

const { processAllServerReadmes } = require('./database');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
let limit = 10;
let dryRun = false;

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10) || 10;
  } else if (arg === '--dryrun') {
    dryRun = true;
  }
});

async function main() {
  console.log(`Starting README processing for up to ${limit} servers${dryRun ? ' (DRY RUN)' : ''}...`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE ENABLED - No database updates will be performed');
    console.log('   This mode is useful for testing without applying changes.\n');
  }
  
  try {
    // Pass the dryRun flag to the processAllServerReadmes function
    const results = await processAllServerReadmes(limit, dryRun);
    
    console.log('\nProcessing complete!');
    console.log('-------------------');
    console.log(`Total servers processed: ${results.total}`);
    console.log(`Successfully processed: ${results.success}`);
    console.log(`Failed to process: ${results.failed}`);
    
    // Log details of successful and failed servers
    console.log('\nProcessing details:');
    results.details.forEach((detail, index) => {
      console.log(`${index + 1}. ${detail.name} (${detail.id}): ${detail.success ? '✅' : '❌'} ${detail.message || ''}`);
    });
    
    return results;
  } catch (error) {
    console.error('Error processing server READMEs:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
