#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
// We'll use standard setTimeout instead of timers/promises for compatibility
import { Response as NodeFetchResponse } from 'node-fetch';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

// Check required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const githubToken = process.env.GITHUB_TOKEN!;

// Configuration
const BATCH_SIZE = 5;
const WAIT_BETWEEN_BATCHES = 3000;
const MAX_BATCHES = 100;

// Regex patterns to detect tool definitions in JS/TS files
const TOOL_REGEX_PATTERNS = [
  // MCP tool definition object pattern
  /\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"].*\}/gs,
  // Function schema definition pattern
  /\{\s*"?name"?\s*:\s*['"]([^'"]+)['"]\s*,\s*"?description"?\s*:\s*['"]([^'"]+)['"].*\}/gs,
  // OpenAI function definition pattern
  /functions\.push\(\s*\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"].*\}\)/gs
];

// IMPORTANT: Updated to include more MCP-specific patterns
const SEARCH_PATTERNS = [
  "list_resources",
  "filename:mcp.json",
  "filename:mcp-server.json",
  "filename:mcp_server.json",
  "filename:tools.json",
  "filename:tools.js",
  "filename:tools.ts",
  "filename:tools_definitions.js",
  "filename:functions.json",
  "createToolCalls",
  "registerMCPTools",
  "defineTool"
];

/**
 * Fetch with retry, timeout, and exponential backoff
 */
async function fetchWithRetry(
  url: string, 
  options: any = {}, 
  retries = 3,
  timeout = 10000,
  initialBackoff = 1000
): Promise<NodeFetchResponse> {
  let lastError: Error | null = null;
  let currentBackoff = initialBackoff;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add AbortSignal for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // Check for rate limit headers and wait if needed
      const rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '1000', 10);
      const rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000;
      
      if (rateLimitRemaining < 5) {
        const now = Date.now();
        const waitTime = Math.max(0, rateLimitReset - now) + 1000; // Add buffer
        console.log(`Rate limit almost reached. Waiting ${waitTime}ms before continuing...`);
        await setTimeout(waitTime);
      }
      
      // Return successful responses
      if (response.ok) {
        return response;
      }
      
      // For rate limiting or server errors, retry with backoff
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP error ${response.status}: ${response.statusText}`);
        console.warn(`Attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}. Retrying in ${currentBackoff}ms...`);
        
        // For rate limiting, use the Retry-After header if available
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
          if (retryAfter > 0) {
            currentBackoff = retryAfter * 1000;
          }
        }
      } else {
        // Don't retry for client errors except rate limiting
        return response;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1}/${retries + 1} failed: ${error.message}. Retrying in ${currentBackoff}ms...`);
    }
    
    // Return on last attempt
    if (attempt === retries) {
      break;
    }
    
    // Wait with exponential backoff before retrying
    await new Promise(resolve => setTimeout(resolve, currentBackoff));
    
    // Increase backoff for next attempt (exponential backoff with jitter)
    currentBackoff = currentBackoff * 2 * (0.9 + Math.random() * 0.2);
  }
  
  throw lastError || new Error(`Failed after ${retries} retries`);
}

/**
 * Extract owner and repo from GitHub URL
 */
function extractRepoInfo(githubUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(githubUrl);
    if (!url.hostname.includes('github.com')) {
      return null;
    }
    
    // Remove trailing .git if present
    const path = url.pathname.replace(/\.git$/, '').replace(/^\/*/, '');
    const parts = path.split('/').filter(Boolean);
    
    if (parts.length < 2) {
      return null;
    }
    
    return {
      owner: parts[0],
      repo: parts[1]
    };
  } catch (err) {
    return null;
  }
}

/**
 * Find tool definition files in a GitHub repository
 */
async function findToolDefinitionFiles(owner: string, repo: string): Promise<string[]> {
  const uniqueFiles = new Set<string>();
  
  for (const pattern of SEARCH_PATTERNS) {
    try {
      const url = `https://api.github.com/search/code?q=${encodeURIComponent(pattern)}+repo:${owner}/${repo}`;
      console.log(`Searching for ${pattern} in ${owner}/${repo}...`);
      
      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, 2, 30000);
      
      if (!response.ok) {
        console.warn(`Search for ${pattern} failed: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.path) {
            uniqueFiles.add(item.path);
          }
        }
      }
      
      // Wait between searches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.warn(`Error searching for ${pattern}:`, err);
    }
  }
  
  return Array.from(uniqueFiles);
}

/**
 * Extract tools from a file in a GitHub repository
 */
async function extractToolsFromFile(owner: string, repo: string, filePath: string): Promise<any[]> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    }, 2);
    
    if (!response.ok) {
      console.warn(`Failed to fetch file ${filePath}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const content = await response.text();
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    // Process based on file extension
    if (extension === 'json') {
      try {
        const json = JSON.parse(content);
        return extractToolsFromJson(json, filePath);
      } catch (err) {
        console.warn(`Error parsing JSON in ${filePath}:`, err);
        return [];
      }
    } else if (['js', 'ts', 'jsx', 'tsx'].includes(extension || '')) {
      return extractToolsFromJsContent(content, filePath);
    } else if (['yaml', 'yml'].includes(extension || '')) {
      try {
        // Simple YAML parsing for tools
        const tools = [];
        const toolMatches = content.match(/name: ['"]?([^'"\n]+)['"]?\s+description: ['"]?([^'"\n]+)['"]?/g);
        
        if (toolMatches) {
          for (const match of toolMatches) {
            const nameMatch = match.match(/name: ['"]?([^'"\n]+)['"]?/);
            const descMatch = match.match(/description: ['"]?([^'"\n]+)['"]?/);
            
            if (nameMatch && descMatch) {
              tools.push({
                name: nameMatch[1],
                description: descMatch[1],
                parameters: [],
                method: 'GET',
                endpoint: '',
                detection_source: `github_file:${filePath}`
              });
            }
          }
        }
        
        return tools;
      } catch (err) {
        console.warn(`Error parsing YAML in ${filePath}:`, err);
        return [];
      }
    }
    
    return [];
  } catch (err) {
    console.warn(`Error extracting tools from ${filePath}:`, err);
    return [];
  }
}

/**
 * Extract tools from JSON content
 */
function extractToolsFromJson(json: any, filePath: string): any[] {
  const tools = [];
  
  // Handle various JSON structures
  if (Array.isArray(json)) {
    // Direct array of tools
    for (const item of json) {
      if (item.name && (item.description || item.desc)) {
        tools.push({
          name: item.name,
          description: item.description || item.desc || '',
          method: item.method || 'GET',
          endpoint: item.endpoint || '',
          parameters: item.parameters || [],
          detection_source: `github_file:${filePath}`
        });
      }
    }
  } else if (json.tools && Array.isArray(json.tools)) {
    // Object with tools array
    for (const item of json.tools) {
      if (item.name && (item.description || item.desc)) {
        tools.push({
          name: item.name,
          description: item.description || item.desc || '',
          method: item.method || 'GET',
          endpoint: item.endpoint || '',
          parameters: item.parameters || [],
          detection_source: `github_file:${filePath}`
        });
      }
    }
  } else if (json.functions && Array.isArray(json.functions)) {
    // Object with functions array
    for (const item of json.functions) {
      if (item.name && (item.description || item.desc)) {
        tools.push({
          name: item.name,
          description: item.description || item.desc || '',
          method: item.method || 'GET',
          endpoint: item.endpoint || '',
          parameters: item.parameters || [],
          detection_source: `github_file:${filePath}`
        });
      }
    }
  }
  
  return tools;
}

/**
 * Extract tools from JavaScript/TypeScript content
 */
function extractToolsFromJsContent(content: string, filePath: string): any[] {
  const tools = [];
  
  // Apply all regex patterns
  for (const pattern of TOOL_REGEX_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && match[2]) {
        tools.push({
          name: match[1],
          description: match[2],
          method: 'GET',
          endpoint: '',
          parameters: [],
          detection_source: `github_file:${filePath}`
        });
      }
    }
  }
  
  return tools;
}

/**
 * Detect tools from a GitHub repository
 */
async function detectToolsFromRepository(githubUrl: string): Promise<any[]> {
  const repoInfo = extractRepoInfo(githubUrl);
  if (!repoInfo) {
    console.error(`Invalid GitHub URL: ${githubUrl}`);
    return [];
  }
  
  try {
      // Wait between file processing to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Remove duplicates based on name
    const uniqueTools: any[] = [];
    const toolNames = new Set<string>();
    
    for (const tool of allTools) {
      if (!toolNames.has(tool.name)) {
        toolNames.add(tool.name);
        uniqueTools.push(tool);
      }
    }
    
    console.log(`Detected ${uniqueTools.length} unique tools from repository ${repoInfo.owner}/${repoInfo.repo}`);
    return uniqueTools;
  } catch (err) {
    console.error(`Error detecting tools from repository:`, err);
    return [];
  }
}

/**
 * Store tools for a server in the database
 */
async function storeServerTools(serverId: string, tools: any[]): Promise<boolean> {
  try {
    console.log(`Storing ${tools.length} tools for server ${serverId}...`);
    
    // First, clear any existing tools for this server
    const { error: deleteError } = await supabase
      .from('server_tools')
      .delete()
      .eq('server_id', serverId);
    
    if (deleteError) {
      console.error(`Error deleting existing tools:`, deleteError);
      
      // If the table doesn't exist, try to create it
      if (deleteError.message.includes('relation "server_tools" does not exist')) {
        console.log('Creating server_tools table...');
        const { error: tableError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS server_tools (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              description TEXT,
              parameters JSONB,
              detection_method TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS server_tools_server_id_idx ON server_tools(server_id);
          `
        });
        
        if (tableError) {
          console.error('Failed to create server_tools table:', tableError);
          // Fall back to storing tools in the server's tags field
          await storeToolsInTags(serverId, tools);
          return true;
        }
      } else {
        // Fall back to storing tools in the server's tags field
        await storeToolsInTags(serverId, tools);
        return true;
      }
    }
    
    // If we have tools, insert them
    if (tools.length > 0) {
      // Format tools for database insertion
      const toolsToInsert = tools.map(tool => ({
        server_id: serverId,
        name: tool.name,
        description: tool.description || '',
        parameters: tool.parameters || [],
        detection_method: tool.detection_source || 'github_repository'
      }));
      
      // Insert tools in batches to avoid request size limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < toolsToInsert.length; i += BATCH_SIZE) {
        const batch = toolsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('server_tools')
          .insert(batch);
        
        if (insertError) {
          console.error(`Error inserting tools batch ${i}-${i + batch.length}:`, insertError);
          // Fall back to storing tools in the server's tags field if insertion fails
          await storeToolsInTags(serverId, tools);
          return true;
        }
      }
    }
    
    // Update the server record with the tool count and last scan timestamp
    const { error: updateError } = await supabase
      .from('servers')
      .update({ 
        last_tools_scan: new Date().toISOString(),
        tools_count: tools.length
      })
      .eq('id', serverId);
    
    if (updateError) {
      console.error('Error updating server record:', updateError);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error(`Error storing tools:`, err);
    return false;
  }
}

/**
 * Fallback method to store tools in the server's tags field
 */
async function storeToolsInTags(serverId: string, tools: any[]): Promise<void> {
  try {
    // Get current server data
    const { data: server, error: getError } = await supabase
      .from('servers')
      .select('tags')
      .eq('id', serverId)
      .single();
    
    if (getError) throw getError;
    
    // Prepare tool tags
    const toolTags = tools.map(tool => `tool:${tool.name}`);
    const existingTags = server?.tags || [];
    
    // Filter out any existing tool tags
    const filteredTags = existingTags.filter((tag: string) => !tag.startsWith('tool:'));
    
    // Combine tags, ensuring we don't exceed the maximum (limit to top 10 tools if more)
    const newTags = [...filteredTags, ...toolTags.slice(0, 10)];
    
    // Add success tag
    if (tools.length > 0) {
      newTags.push('mcp_detection_success');
    } else {
      newTags.push('mcp_detection_failed');
    }
    
    // Update the server record
    const { error: updateError } = await supabase
      .from('servers')
      .update({
        tags: newTags,
        last_tools_scan: new Date().toISOString()
      })
      .eq('id', serverId);
    
    if (updateError) throw updateError;
    
    console.log(`Stored ${tools.length} tools in tags for server ${serverId}`);
  } catch (err) {
    console.error(`Error storing tools in tags:`, err);
  }
}

/**
 * Get servers with GitHub URLs that haven't been scanned
 */
async function getServersWithGithubUrls(limit: number): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('servers')
      .select('id, name, github_url')
      .not('github_url', 'is', null)
      .is('last_tools_scan', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching servers with GitHub URLs:', err);
    return [];
  }
}

/**
 * Process a batch of servers
 */
async function processBatch(): Promise<any> {
  try {
    // Get servers with GitHub URLs
    const servers = await getServersWithGithubUrls(BATCH_SIZE);
    
    if (servers.length === 0) {
      return {
        success: true,
        servers_processed: 0,
        results: []
      };
    }
    
    const results: any[] = [];
    
    // Process each server
    for (const server of servers) {
      console.log(`\nProcessing server: ${server.name} (${server.id})`);
      
      try {
        // Skip servers without GitHub URL (shouldn't happen due to our filter)
        if (!server.github_url) {
          console.log(`Skipping ${server.name}: No GitHub URL`);
          await supabase
            .from('servers')
            .update({ 
              last_tools_scan: new Date().toISOString(),
              tags: ['mcp_detection_failed', 'missing_github_url']
            })
            .eq('id', server.id);
          
          results.push({
            server_id: server.id,
            name: server.name,
            status: 'error',
            error: 'Missing GitHub URL'
          });
          continue;
        }
        
        // Detect tools from GitHub repository
        const tools = await detectToolsFromRepository(server.github_url);
        
        // Store tools in the database
        const success = await storeServerTools(server.id, tools);
        
        results.push({
          server_id: server.id,
          name: server.name,
          status: success ? 'success' : 'error',
          tools_detected: tools.length,
          detection_method: 'github_repository'
        });
      } catch (err) {
        console.error(`Error processing server ${server.name}:`, err);
        
        // Mark server as processed even if it failed
        await supabase
          .from('servers')
          .update({ 
            last_tools_scan: new Date().toISOString(),
            tags: ['mcp_detection_failed', 'processing_error']
          })
          .eq('id', server.id);
        
        results.push({
          server_id: server.id,
          name: server.name,
          status: 'error',
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    return {
      success: true,
      servers_processed: servers.length,
      results
    };
  } catch (err) {
    console.error('Error processing batch:', err);
    return {
      success: false,
      servers_processed: 0,
      results: [],
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Reset all servers' last_tools_scan to null
 */
async function resetAllServerScans(force: boolean = false): Promise<number> {
  if (!force) {
    console.log(chalk.yellow('⚠️ This will reset all servers to be re-scanned for tools.'));
    console.log(chalk.yellow('⚠️ To proceed, run with --force flag.'));
    return 0;
  }

  try {
    // First, count how many servers we have
    const { count, error: countError } = await supabase
      .from('servers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Then, update all servers
    const { error } = await supabase
      .from('servers')
      .update({ last_tools_scan: null })
      .not('id', 'is', null); // Update all records

    if (error) throw error;

    console.log(chalk.green(`✅ Reset ${count || 0} servers for re-scanning.`));
    
    return count || 0;
  } catch (err) {
    console.error(chalk.red('❌ Failed to reset server scans:'), err);
    throw err;
  }
}

/**
 * Count the number of servers that need to be scanned
 */
async function countPendingServers(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('servers')
      .select('id', { count: 'exact', head: true })
      .is('last_tools_scan', null)
      .not('github_url', 'is', null);

    if (error) throw error;
    
    return count || 0;
  } catch (err) {
    console.error(chalk.red('❌ Failed to count pending servers:'), err);
    throw err;
  }
}

/**
 * Process all servers in batches
 */
async function processAllServers(): Promise<void> {
  console.log(chalk.blue('🔍 Checking for servers to process...'));
  
  // Check if there are servers to process
  let pendingCount = await countPendingServers();
  
  if (pendingCount === 0) {
    console.log(chalk.yellow('⚠️ No servers found that need tools scanning.'));
    console.log(chalk.yellow('⚠️ Run with --reset flag to reset all servers for re-scanning.'));
    return;
  }
  
  console.log(chalk.green(`✅ Found ${pendingCount} servers with GitHub URLs to process.`));
  
  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Processing servers |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} servers | Batch: {batch}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  
  progressBar.start(pendingCount, 0, { batch: 1 });
  
  // Track statistics
  const stats = {
    processed: 0,
    success: 0,
    errors: 0,
    tools: 0,
    batches: 0
  };
  
  // Process servers in batches
  let batchNumber = 1;
  let hasMore = true;
  
  while (hasMore && batchNumber <= MAX_BATCHES) {
    // Invoke batch process
    const result = await processBatch();
    
    if (!result.success) {
      console.error(chalk.red(`\n❌ Batch ${batchNumber} failed: ${result.error}`));
      await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_BATCHES));
      batchNumber++;
      continue;
    }
    
    if (result.servers_processed === 0) {
      progressBar.stop();
      console.log(chalk.green('\n✅ All servers processed!'));
      hasMore = false;
      break;
    }
    
    // Track statistics
    stats.batches++;
    stats.processed += result.servers_processed;
    
    for (const server of result.results) {
      if (server.status === 'success' && server.tools_detected) {
        stats.success++;
        stats.tools += server.tools_detected;
      } else if (server.status === 'error') {
        stats.errors++;
      }
    }
    
    // Update progress bar
    progressBar.update(stats.processed, { batch: batchNumber });
    
    // Wait before next batch to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_BATCHES));
    batchNumber++;
  }
  
  progressBar.stop();
  
  // Final report
  console.log(chalk.green('\n✅ Server tools update completed!'));
  console.log(chalk.blue('📊 Statistics:'));
  console.log(`   Batches processed: ${stats.batches}`);
  console.log(`   Servers processed: ${stats.processed}`);
  console.log(`   Successful updates: ${stats.success}`);
  console.log(`   Failed updates: ${stats.errors}`);
  console.log(`   Total tools detected: ${stats.tools}`);
  console.log(`   Average tools per server: ${stats.success > 0 ? (stats.tools / stats.success).toFixed(2) : 0}`);
  
  // Check for remaining servers
  const remainingCount = await countPendingServers();
  if (remainingCount > 0) {
    console.log(chalk.yellow(`\n⚠️ There are still ${remainingCount} servers that need processing.`));
    console.log(chalk.yellow('⚠️ Run this script again to continue processing them.'));
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const resetFlag = args.includes('--reset');
  const forceFlag = args.includes('--force');

  console.log(chalk.blue('🔧 GitHub-Based MCP Server Tools Detection'));
  console.log(chalk.blue('=========================================='));
  
  if (resetFlag) {
    await resetAllServerScans(forceFlag);
    if (!forceFlag) {
      return;
    }
  }
  
  await processAllServers();
}

// Run the script
main().catch(err => {
  console.error(chalk.red('❌ Fatal error:'), err);
  process.exit(1);
});
