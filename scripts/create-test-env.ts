/**
 * Helper script to create a .env file for testing
 * Usage: npx ts-node scripts/create-test-env.ts
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
};

async function main() {
  console.log('🔧 MCP Directory Test Environment Setup');
  console.log('=======================================');
  console.log('This script will create a .env file for running tools detection tests.\n');
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '..', '.env');
  let envExists = false;
  
  try {
    await fs.access(envPath);
    envExists = true;
    
    const overwrite = await question('⚠️ An .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Exiting without changes.');
      rl.close();
      return;
    }
  } catch (err) {
    // File doesn't exist, continue
  }
  
  // Get environment variables
  console.log('\nPlease enter the following required values:');
  
  const supabaseUrl = await question('Supabase URL (https://your-project-id.supabase.co): ');
  const supabaseKey = await question('Supabase Service Role Key: ');
  const githubToken = await question('GitHub Token: ');
  
  console.log('\nOptional configuration:');
  
  const maxParallel = await question('Maximum parallel servers (default: 5): ');
  const cacheExpiry = await question('GitHub cache expiry in hours (default: 24): ');
  
  // Create .env content
  const envContent = `# Supabase configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}

# GitHub configuration for repository analysis
GITHUB_TOKEN=${githubToken}

# Optional configuration
${maxParallel ? `MAX_PARALLEL_SERVERS=${maxParallel}` : '# MAX_PARALLEL_SERVERS=5'}
${cacheExpiry ? `CACHE_EXPIRY_HOURS=${cacheExpiry}` : '# CACHE_EXPIRY_HOURS=24'}

# This file was generated on ${new Date().toISOString()}
`;

  // Write .env file
  await fs.writeFile(envPath, envContent);
  
  console.log('\n✅ .env file created successfully!');
  console.log(`📝 File location: ${envPath}`);
  console.log('\nYou can now run the tests with:');
  console.log('npm run test:tools:real');
  
  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
