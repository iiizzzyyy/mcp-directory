#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

// Check required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeServers() {
  console.log(chalk.blue('🔍 Analyzing server data for tools detection issues...'));
  
  // Get total server count
  const { count: totalCount, error: countError } = await supabase
    .from('servers')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error(chalk.red('❌ Error counting servers:'), countError);
    return;
  }
  
  // Get servers with successful tool detection (using tags)
  const { data: successServers, error: successError } = await supabase
    .from('servers')
    .select('id, name, tags')
    .not('last_tools_scan', 'is', null)
    .contains('tags', ['mcp_detection_success']);
    
  if (successError) {
    console.error(chalk.red('❌ Error fetching successful servers:'), successError);
    return;
  }
  
  // Get servers with failed detection
  const { data: failedServers, error: failedError } = await supabase
    .from('servers')
    .select('id, name, health_check_url, api_documentation, github_url, tags')
    .not('last_tools_scan', 'is', null)
    .not('tags', 'cs', '{"mcp_detection_success"}')
    .limit(50);
    
  if (failedError) {
    console.error(chalk.red('❌ Error fetching failed servers:'), failedError);
    return;
  }
  
  // Count servers with each potential issue
  const issues = {
    missing_health_check_url: 0,
    missing_api_documentation: 0,
    missing_github_url: 0,
    invalid_github_url: 0,
    missing_all_detection_methods: 0
  };
  
  for (const server of failedServers || []) {
    const hasHealthUrl = !!server.health_check_url;
    const hasApiDocs = !!server.api_documentation;
    const hasGithubUrl = !!server.github_url;
    
    if (!hasHealthUrl) issues.missing_health_check_url++;
    if (!hasApiDocs) issues.missing_api_documentation++;
    if (!hasGithubUrl) issues.missing_github_url++;
    
    if (hasGithubUrl) {
      // Check if GitHub URL is valid
      try {
        const url = new URL(server.github_url);
        if (!url.hostname.includes('github.com')) {
          issues.invalid_github_url++;
        }
      } catch {
        issues.invalid_github_url++;
      }
    }
    
    if (!hasHealthUrl && !hasApiDocs && !hasGithubUrl) {
      issues.missing_all_detection_methods++;
    }
  }
  
  // Get pending servers
  const { count: pendingCount, error: pendingError } = await supabase
    .from('servers')
    .select('*', { count: 'exact', head: true })
    .is('last_tools_scan', null);
    
  if (pendingError) {
    console.error(chalk.red('❌ Error counting pending servers:'), pendingError);
    return;
  }
  
  // Print summary
  console.log(chalk.green('\n📊 Server Tools Detection Analysis'));
  console.log(chalk.blue('═════════════════════════════════'));
  console.log(`Total servers: ${totalCount || 0}`);
  console.log(`Servers with tools detected: ${successServers?.length || 0} (${(((successServers?.length || 0) / (totalCount || 1)) * 100).toFixed(2)}%)`);
  console.log(`Servers with failed detection: ${(totalCount || 0) - (successServers?.length || 0) - (pendingCount || 0)}`);
  console.log(`Servers pending detection: ${pendingCount || 0}`);
  
  console.log(chalk.blue('\n📋 Analysis of Failed Servers:'));
  console.log(`Sample size: ${failedServers?.length || 0} servers`);
  console.log(`Missing health check URL: ${issues.missing_health_check_url} (${(issues.missing_health_check_url / (failedServers?.length || 1) * 100).toFixed(2)}%)`);
  console.log(`Missing API documentation: ${issues.missing_api_documentation} (${(issues.missing_api_documentation / (failedServers?.length || 1) * 100).toFixed(2)}%)`);
  console.log(`Missing GitHub URL: ${issues.missing_github_url} (${(issues.missing_github_url / (failedServers?.length || 1) * 100).toFixed(2)}%)`);
  console.log(`Invalid GitHub URL format: ${issues.invalid_github_url} (${(issues.invalid_github_url / (failedServers?.length || 1) * 100).toFixed(2)}%)`);
  console.log(`Missing all detection methods: ${issues.missing_all_detection_methods} (${(issues.missing_all_detection_methods / (failedServers?.length || 1) * 100).toFixed(2)}%)`);
  
  console.log(chalk.blue('\n🔍 Recommendations:'));
  
  if (issues.missing_all_detection_methods > 0) {
    console.log(chalk.yellow('⚠️ Many servers lack any detection method (health URL, API docs, GitHub URL)'));
    console.log('   - Implement pre-filtering to skip servers without detection methods');
  }
  
  if (issues.invalid_github_url > 0) {
    console.log(chalk.yellow('⚠️ Some servers have invalid GitHub URLs'));
    console.log('   - Add GitHub URL validation before processing');
  }
  
  console.log(chalk.green('\n✅ Analysis complete!'));
}

// Run the analysis
analyzeServers().catch(err => {
  console.error(chalk.red('❌ Fatal error:'), err);
  process.exit(1);
});
