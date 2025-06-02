#!/usr/bin/env node

/**
 * deploy-migration-function.js
 * 
 * Deploys the apply-migration edge function to Supabase
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure we're in the project root
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

console.log('Deploying apply-migration edge function to Supabase...');

try {
  // Verify the function exists
  const functionPath = path.join(projectRoot, 'supabase', 'functions', 'apply-migration');
  if (!fs.existsSync(functionPath)) {
    throw new Error(`Function directory not found: ${functionPath}`);
  }

  // Deploy the function
  const result = execSync('npx supabase functions deploy apply-migration', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN
    }
  });

  console.log('Successfully deployed apply-migration function.');
} catch (error) {
  console.error('Error deploying edge function:', error.message);
  process.exit(1);
}
