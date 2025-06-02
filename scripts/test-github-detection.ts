#!/usr/bin/env ts-node

import fetch, { Response as NodeFetchResponse } from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GitHub token from environment variables
const githubToken = process.env.GITHUB_TOKEN;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Fetch with retry and timeout capabilities
 */
async function fetchWithRetry(
  url: string, 
  options: any = {}, 
  retries: number = 3, 
  timeout: number = 15000
): Promise<NodeFetchResponse> {
  let currentBackoff = 1000; // Start with 1s backoff
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Add signal to options
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      // Attempt fetch
      const response = await fetch(url, fetchOptions);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check if we should retry based on status code
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        // Rate limit or server error, retry with backoff
        console.warn(`Received status ${response.status} from ${url}, retrying after ${currentBackoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, currentBackoff));
        currentBackoff = currentBackoff * 2 * (0.9 + Math.random() * 0.2); // Exponential backoff with jitter
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a timeout error
      if (error.name === 'AbortError') {
        console.warn(`Request to ${url} timed out after ${timeout}ms, retrying...`);
      } else {
        console.error(`Fetch error for ${url}:`, error.message);
      }
      
      // Don't retry if it's the last attempt
      if (attempt >= retries) break;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentBackoff));
      
      // Increase backoff with jitter for next attempt
      currentBackoff = currentBackoff * 2 * (0.9 + Math.random() * 0.2);
    }
  }
  
  const error = lastError ? lastError : new Error(`Failed after ${retries} retries`);
  throw error;
}

/**
 * Validate GitHub token by making a test API call
 */
async function validateGithubToken(): Promise<boolean> {
  console.log('Validating GitHub token...');
  
  if (!githubToken) {
    console.error('❌ GitHub token is not set in environment variables');
    console.log('💡 Set GITHUB_TOKEN environment variable with a valid GitHub personal access token');
    return false;
  }
  
  try {
    const response = await fetchWithRetry(
      'https://api.github.com/user', 
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MCP-Directory-Test-Script'
        }
      },
      2, // retries
      10000 // timeout
    );
    
    if (response.ok) {
      const userData = await response.json();
      console.log(`GitHub token validated successfully. User: ${userData.login}`);
      return true;
    } else if (response.status === 401) {
      console.error('❌ GitHub token is invalid (401 Unauthorized)');
      return false;
    } else {
      console.error(`❌ GitHub API returned unexpected status: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating GitHub token:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Main function to test GitHub detection
 */
async function testGitHubDetection() {
  console.log('🧪 Testing GitHub Repository Detection');
  console.log('------------------------------------');

  // First validate GitHub token
  const isTokenValid = await validateGithubToken();
  if (!isTokenValid) {
    console.error('❌ Cannot proceed with GitHub detection tests: Invalid token');
    process.exit(1);
  }

  // Get servers with GitHub URLs from the database
  console.log('Fetching servers with GitHub URLs from database...');
  let servers: any[] = [];
  
  try {
    const { data, error } = await supabase
      .from('servers')
      .select('id, name, github_url')
      .not('github_url', 'is', null)
      .limit(3);
      
    if (error) {
      console.error('❌ Error fetching servers with GitHub URLs:', error);
    } else if (data && data.length > 0) {
      servers = data;
      console.log(`🔍 Found ${servers.length} servers with GitHub URLs to test`);
    } else {
      console.log('ℹ️ No servers found with GitHub URLs');
    }
  } catch (error) {
    console.error('❌ Error querying database:', error instanceof Error ? error.message : String(error));
  }

  // Test some known MCP repositories
  const testRepos = [
    'https://github.com/pulsemcp/mcp-server',
    'https://github.com/pulsemcp/puppeteer',
    'https://github.com/supabase/functions-js'
  ];

  console.log(`\nTesting GitHub detection for ${testRepos.length} known MCP repositories...`);

  // Test known MCP repositories first
  for (const repoUrl of testRepos) {
    console.log(`\nTesting repository: ${repoUrl}`);
    try {
      const tools = await detectToolsFromRepository(repoUrl);
      console.log(`Detected ${tools.length} tools from ${repoUrl}`);
      if (tools.length > 0) {
        console.log('Sample tools:', JSON.stringify(tools.slice(0, 3), null, 2));
      }
    } catch (error) {
      console.error(`Error detecting tools from ${repoUrl}:`, error instanceof Error ? error.message : String(error));
    }
  }

  // Test the servers from the database if any were found
  if (servers.length > 0) {
    console.log('\n\nTesting servers from database...');
    for (const server of servers) {
      if (!server.github_url) continue;

      console.log(`\nTesting server: ${server.name} (${server.github_url})`);
      try {
        const tools = await detectToolsFromRepository(server.github_url);
        console.log(`Detected ${tools.length} tools from ${server.github_url}`);
        if (tools.length > 0) {
          console.log('Sample tools:', JSON.stringify(tools.slice(0, 3), null, 2));
        }
      } catch (error) {
        console.error(`Error detecting tools from ${server.github_url}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  console.log('\nGitHub detection tests completed');
}

/**
 * Detect tools from a GitHub repository URL
 */
async function detectToolsFromRepository(repoUrl: string): Promise<any[]> {
  try {
    // Extract owner and repo from URL
    const urlParts = repoUrl.replace(/\/$/, '').split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    console.log(`Searching for tool definition files in ${owner}/${repo}...`);

    // Find tool definition files in the repository
    const toolFiles = await findToolDefinitionFiles(owner, repo);
    console.log(`Found ${toolFiles.length} potential tool definition files`);

    // Extract tools from each file
    const tools: any[] = [];
    for (const file of toolFiles) {
      try {
        const fileTools = await extractToolsFromFile(owner, repo, file);
        if (fileTools.length > 0) {
          console.log(`Found ${fileTools.length} tools in ${file}`);
          tools.push(...fileTools);
        }
      } catch (error) {
        console.error(`Error extracting tools from ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return tools;
  } catch (error) {
    console.error('Error in detectToolsFromRepository:', error instanceof Error ? error.message : String(error));
    throw error; // Propagate error to caller
  }
}

/**
 * Find potential tool definition files in a repository
 */
async function findToolDefinitionFiles(owner: string, repo: string): Promise<string[]> {
  // Search patterns for tool definition files
  const searchPatterns = [
    'filename:tools.json',
    'filename:functions.json',
    'filename:tools.yaml',
    'filename:tools.yml',
    'filename:openapi.json',
    'filename:openapi.yaml',
    'filename:swagger.json',
    'filename:swagger.yaml',
    'path:/.well-known/ai-plugin.json',
    'extension:json name description function',
    'extension:yaml functions name description',
    'extension:ts "function_call"',
    'extension:js "function_call"',
    'extension:js mcp tools',
    'extension:ts mcp tools',
    'filename:mcp-server.js',
    'filename:mcp-server.ts',
    'filename:mcp.config.js',
    'filename:mcp.config.ts',
    'filename:windsurf.config.js',
    'filename:windsurf.config.ts'
  ];

  const toolFiles: string[] = [];

  for (const pattern of searchPatterns) {
    try {
      console.log(`Searching with pattern: ${pattern}...`);
      const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(pattern)}+repo:${owner}/${repo}`;
      
      const response = await fetchWithRetry(
        searchUrl, 
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'MCP-Directory-Test-Script'
          }
        },
        2, // retries
        15000 // timeout
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          console.log(`  Found ${data.items.length} files matching pattern ${pattern}`);
          for (const item of data.items) {
            toolFiles.push(item.path);
          }
        }
        
        // Check rate limit headers
        const rateLimit = response.headers.get('x-ratelimit-remaining');
        const resetTime = response.headers.get('x-ratelimit-reset');
        
        if (rateLimit && parseInt(rateLimit) < 5) {
          const waitTime = resetTime ? 
            Math.max(1000, ((parseInt(resetTime) * 1000) - Date.now()) / 10) : 
            5000;
            
          console.warn(`GitHub API rate limit running low: ${rateLimit} requests remaining. Waiting ${Math.round(waitTime/1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } else if (response.status === 403) {
        console.error(`  Rate limit exceeded for pattern ${pattern}: waiting before continuing...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else if (response.status === 422) {
        // Validation failed - likely too many results
        console.warn(`  Search validation failed for pattern ${pattern} - too many results`);
      } else {
        console.error(`  Error searching for ${pattern}: ${response.status} ${response.statusText}`);
      }
      
      // Small delay between searches to avoid triggering rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error searching with pattern ${pattern}:`, error instanceof Error ? error.message : String(error));
    }
  }

  // Remove duplicates
  const uniqueFiles = [...new Set(toolFiles)];
  console.log(`Found ${uniqueFiles.length} unique tool definition files`);
  return uniqueFiles;
}

/**
 * Extract tools from a file in a repository
 */
async function extractToolsFromFile(owner: string, repo: string, filePath: string): Promise<any[]> {
  try {
    console.log(`Extracting tools from file: ${filePath}`);
    
    // Get file content
    const contentResponse = await fetchWithRetry(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MCP-Directory-Test-Script'
        }
      },
      2, // retries
      10000 // timeout
    );

    if (!contentResponse.ok) {
      console.error(`Error getting file content: ${contentResponse.status} ${contentResponse.statusText}`);
      return [];
    }

    const contentData = await contentResponse.json();
    
    if (!contentData.content) {
      console.warn(`No content found in file ${filePath}`);
      return [];
    }

    const fileContent = Buffer.from(contentData.content, 'base64').toString('utf-8');
    const fileExtension = filePath.split('.').pop()?.toLowerCase();

    // Parse file content based on file type
    if (fileExtension === 'json') {
      const tools = extractToolsFromJson(fileContent, filePath);
      console.log(`Extracted ${tools.length} tools from JSON file ${filePath}`);
      return tools;
    } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
      console.log(`Attempting to parse YAML file ${filePath}`);
      try {
        // Basic attempt to parse YAML as JSON - in real implementation we'd use a YAML parser
        // This is a simplified version for the test script
        const jsonContent = fileContent
          .replace(/:\s+/g, ': ')
          .replace(/\n\s{2,}/g, ' ')
          .replace(/\n/g, ',');
        const tools = extractToolsFromJson(`{${jsonContent}}`, filePath);
        console.log(`Extracted ${tools.length} tools from YAML file ${filePath}`);
        return tools;
      } catch (yamlError) {
        console.error(`Error parsing YAML file ${filePath}:`, yamlError instanceof Error ? yamlError.message : String(yamlError));
        return [];
      }
    } else if (fileExtension === 'js' || fileExtension === 'ts') {
      const tools = extractToolsFromJsContent(fileContent, filePath);
      console.log(`Extracted ${tools.length} tools from JS/TS file ${filePath}`);
      return tools;
    } else if (fileExtension === 'md' || fileExtension === 'txt') {
      // Look for code blocks with JSON in markdown files
      const jsonBlockRegex = /```(?:json|javascript)\s*([\s\S]*?)```/g;
      const matches = [...fileContent.matchAll(jsonBlockRegex)];
      
      if (matches.length > 0) {
        console.log(`Found ${matches.length} potential JSON blocks in ${filePath}`);
        const allTools: any[] = [];
        
        for (const match of matches) {
          try {
            const jsonContent = match[1].trim();
            const tools = extractToolsFromJson(jsonContent, `${filePath}#codeblock`);
            if (tools.length > 0) {
              allTools.push(...tools);
              console.log(`Extracted ${tools.length} tools from code block in ${filePath}`);
            }
          } catch (jsonError) {
            // Ignore errors in code blocks, continue to next
          }
        }
        
        return allTools;
      }
    }

    return [];
  } catch (error) {
    console.error(`Error extracting tools from file ${filePath}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Extract tools from JSON content
 */
function extractToolsFromJson(content: string, filePath: string): any[] {
  try {
    const tools: any[] = [];
    let jsonData: any;

    try {
      jsonData = JSON.parse(content);
    } catch (jsonError) {
      console.error(`Error parsing JSON from ${filePath}:`, jsonError instanceof Error ? jsonError.message : String(jsonError));
      return [];
    }

    // Check for different JSON structures
    if (Array.isArray(jsonData)) {
      // Direct array of tools
      const extracted = jsonData.filter(item => item.name && (item.description || item.desc));
      if (extracted.length > 0) {
        console.log(`Found ${extracted.length} tools in JSON array from ${filePath}`);
        tools.push(...extracted);
      }
    } else if (jsonData.tools && Array.isArray(jsonData.tools)) {
      // { tools: [...] } format
      const extracted = jsonData.tools.filter(item => item.name && (item.description || item.desc));
      if (extracted.length > 0) {
        console.log(`Found ${extracted.length} tools in tools array from ${filePath}`);
        tools.push(...extracted);
      }
    } else if (jsonData.functions && Array.isArray(jsonData.functions)) {
      // { functions: [...] } format
      const extracted = jsonData.functions.filter(item => item.name && (item.description || item.desc));
      if (extracted.length > 0) {
        console.log(`Found ${extracted.length} tools in functions array from ${filePath}`);
        tools.push(...extracted);
      }
    } else if (jsonData.paths) {
      // OpenAPI/Swagger format
      try {
        const extracted: any[] = [];
        for (const path in jsonData.paths) {
          for (const method in jsonData.paths[path]) {
            const operation = jsonData.paths[path][method];
            if (operation.operationId && (operation.description || operation.summary)) {
              extracted.push({
                name: operation.operationId,
                description: operation.description || operation.summary,
                parameters: operation.parameters,
                method: method,
                endpoint: path
              });
            }
          }
        }
        if (extracted.length > 0) {
          console.log(`Found ${extracted.length} tools in OpenAPI spec from ${filePath}`);
          tools.push(...extracted);
        }
      } catch (swaggerError) {
        console.error(`Error parsing OpenAPI from ${filePath}:`, swaggerError instanceof Error ? swaggerError.message : String(swaggerError));
      }
    }

    return tools;
  } catch (error) {
    console.error(`Error in extractToolsFromJson:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Extract tools from JavaScript/TypeScript content using regex
 */
function extractToolsFromJsContent(content: string, filePath: string): any[] {
  try {
    const tools: any[] = [];
    
    // Look for tool definitions with different patterns
    // Pattern 1: JSON-like tool definitions
    const jsonDefPattern = /(?:const|let|var)\s+(?:tools|functions)\s*=\s*(\[\s*\{[\s\S]*?\}\s*\])/g;
    const jsonMatches = [...content.matchAll(jsonDefPattern)];
    
    for (const match of jsonMatches) {
      try {
        const jsonStr = match[1].replace(/(['\"]+)?([a-zA-Z0-9_]+)(['\"]+)?:/g, '"$2":');
        const toolsData = JSON.parse(jsonStr);
        if (Array.isArray(toolsData)) {
          const validTools = toolsData.filter(t => t.name && (t.description || t.desc));
          if (validTools.length > 0) {
            console.log(`Found ${validTools.length} tools in JS/TS array pattern from ${filePath}`);
            tools.push(...validTools);
          }
        }
      } catch (jsonError) {
        // Skip and continue to next match
      }
    }
    
    // Pattern 2: MCP tool declaration
    const mcpToolPattern = /\{\s*name:\s*['"](.*?)['"](\s*,|\s*$)[\s\S]*?description:\s*['"](.*?)['"]/g;
    const mcpMatches = [...content.matchAll(mcpToolPattern)];
    
    for (const match of mcpMatches) {
      const name = match[1];
      const description = match[3];
      if (name && description) {
        console.log(`Found MCP tool in JS/TS: ${name} from ${filePath}`);
        tools.push({
          name,
          description,
          // Add minimal required properties for the Tool interface
          method: 'GET',
          endpoint: '/',
          parameters: {}
        });
      }
    }
    
    // Pattern 3: OpenAI function_call format
    const functionCallPattern = /function_call[\s\S]*?\{[\s\S]*?name[^}]*?['"](.*?)['"](\s*,|\s*$)[\s\S]*?description[^}]*?['"](.*?)['"]\s*(?:,|\})/g;
    const functionMatches = [...content.matchAll(functionCallPattern)];
    
    for (const match of functionMatches) {
      const name = match[1];
      const description = match[3];
      if (name && description) {
        console.log(`Found OpenAI function_call: ${name} from ${filePath}`);
        tools.push({
          name,
          description,
          // Add minimal required properties for the Tool interface
          method: 'GET',
          endpoint: '/',
          parameters: {}
        });
      }
    }
    
    return tools;
  } catch (error) {
    console.error(`Error in extractToolsFromJsContent:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

// Run the test
testGitHubDetection();
