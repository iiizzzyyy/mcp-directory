#!/usr/bin/env node

/**
 * PulseMCP Explorer
 * 
 * This script helps explore the command structure of the PulseMCP tool
 * It tries different commands and logs their output to help understand
 * what data is available and how it's structured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directory to save exploration results
const RESULTS_DIR = path.join(__dirname, 'pulsemcp-exploration');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Function to execute PulseMCP commands and capture output
function executePulseCommand(command) {
  console.log(`Executing: npx pulsemcp-server ${command}`);
  try {
    const output = execSync(`npx pulsemcp-server ${command}`, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

// Save command results to a file
function saveResults(command, result) {
  const filename = command.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '');
  const filepath = path.join(RESULTS_DIR, `${filename}.json`);
  
  fs.writeFileSync(filepath, JSON.stringify({
    command,
    timestamp: new Date().toISOString(),
    result
  }, null, 2));
  
  console.log(`Results saved to: ${filepath}`);
}

// List of commands to try
const COMMANDS_TO_TRY = [
  // Basic help commands
  '--help',
  'help',
  
  // Listing servers
  'list',
  'list-servers',
  'servers',
  
  // Server details
  'server --help',
  'get-server --help',
  'info --help',
  
  // Documentation
  'docs --help',
  'documentation --help',
  'get-docs --help',
  
  // Installation
  'install --help',
  'get-install --help',
  'installation --help',
  
  // Specific commands with IDs (assuming 'pulse-auth-mcp' might be a valid ID)
  'get-server pulse-auth-mcp',
  'get-server --id pulse-auth-mcp',
  'server pulse-auth-mcp',
  'get-docs pulse-auth-mcp',
  'docs pulse-auth-mcp',
  'get-install pulse-auth-mcp',
  'install pulse-auth-mcp'
];

// Execute all commands and save results
async function exploreCommands() {
  console.log('Starting PulseMCP command exploration...');
  console.log(`Results will be saved to: ${RESULTS_DIR}`);
  
  for (const command of COMMANDS_TO_TRY) {
    console.log(`\n--- Exploring: ${command} ---`);
    const result = executePulseCommand(command);
    
    if (result.success) {
      console.log('Command executed successfully');
      try {
        // Try to parse as JSON in case output is JSON
        const jsonOutput = JSON.parse(result.output);
        console.log('Output is valid JSON');
        console.log('Sample:', JSON.stringify(jsonOutput).substring(0, 200) + '...');
      } catch (e) {
        // Not JSON, just show the first few lines
        const lines = result.output.split('\n');
        console.log('Output (first few lines):');
        console.log(lines.slice(0, 5).join('\n') + (lines.length > 5 ? '\n...' : ''));
      }
    } else {
      console.log('Command failed:');
      console.log(result.error || 'Unknown error');
      if (result.stdout) console.log('stdout:', result.stdout.substring(0, 200) + '...');
      if (result.stderr) console.log('stderr:', result.stderr.substring(0, 200) + '...');
    }
    
    saveResults(command, result);
  }
  
  console.log('\nExploration completed!');
  console.log(`Check the results in: ${RESULTS_DIR}`);
}

// Run the exploration
exploreCommands().catch(err => {
  console.error('Exploration failed:', err);
  process.exit(1);
});
