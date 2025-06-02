import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// GitHub token for repository access
const githubToken = Deno.env.get('GITHUB_TOKEN');

// Flag to track GitHub token validity
let isGithubTokenValid = false;

// Regex patterns to detect tool definitions in JS/TS files
const TOOL_REGEX_PATTERNS = [
  // MCP tool definition object pattern
  /\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"].*\}/gs,
  // Function schema definition pattern
  /\{\s*"?name"?\s*:\s*['"]([^'"]+)['"]\s*,\s*"?description"?\s*:\s*['"]([^'"]+)['"].*\}/gs,
  // OpenAI function definition pattern
  /functions\.push\(\s*\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"].*\}\)/gs
];

/**
 * Fetch with retry, timeout, and exponential backoff
 * 
 * @param url URL to fetch
 * @param options Fetch options
 * @param retries Maximum number of retries
 * @param timeout Timeout in milliseconds
 * @param initialBackoff Initial backoff in milliseconds
 * @returns Fetch response
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries = 3,
  timeout = 10000,
  initialBackoff = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  let currentBackoff = initialBackoff;
  
  // Add AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Combine provided options with signal
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      
      // Clear timeout if request completes
      clearTimeout(timeoutId);
      
      // Return successful responses
      if (response.ok) {
        return response;
      }
      
      // For rate limiting (429) or server errors (5xx), retry with backoff
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP error ${response.status}: ${response.statusText}`);
        console.warn(`Attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}. Retrying in ${currentBackoff}ms...`);
      } else {
        // Don't retry for client errors (4xx) except rate limiting
        clearTimeout(timeoutId);
        return response;
      }
    } catch (error: any) {
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeout}ms`);
      } else {
        lastError = error;
      }
      
      console.warn(`Attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}. Retrying in ${currentBackoff}ms...`);
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
  
  // Ensure we always throw a valid Error object
  throw lastError instanceof Error ? lastError : new Error(`Failed after ${retries} retries`);
}

// Validate GitHub token on startup
async function validateGithubToken() {
  if (!githubToken) {
    console.warn('No GitHub token found in environment variables. GitHub repository detection will be limited.');
    return false;
  }
  
  try {
    const response = await fetchWithRetry('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }, 2, 5000);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`GitHub token validated. Authenticated as ${data.login}`);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error(`GitHub token validation failed: ${response.status} ${errorData.message}`);
      return false;
    }
  } catch (error) {
    console.error(`GitHub token validation error:`, error);
    return false;
  }
}

// Validate the GitHub token on startup
validateGithubToken().then(valid => {
  isGithubTokenValid = valid;
  console.log(`GitHub token validation complete. Token is ${valid ? 'valid' : 'invalid'}.`);
});

// Interface definitions for typesafety
interface ServerRecord {
  id: string;
  name: string;
  health_check_url?: string; // Updated from url
  api_documentation?: string; // Updated from api_url
  github_url?: string;
}

interface ToolParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

interface Tool {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  parameters: ToolParameter[];
  detection_source?: string;
}

interface ProcessResult {
  server_id: string;
  name: string;
  tools_detected?: number;
  detection_method?: string;
  status: 'success' | 'error';
  error?: string;
}

/**
 * Tools detector for MCP servers
 * 
 * This function uses a 3-tier approach:
 * 1. First attempts to query standard MCP API endpoints for tool definitions
 * 2. If that fails, checks common alternative endpoints
 * 3. Only falls back to repository code analysis if API detection fails
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Get servers to process
    const { data: servers, error } = await supabase
      .from('servers')
      .select('id, name, health_check_url, api_documentation, github_url')
      .is('last_tools_scan', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No servers found that need tools scanning',
          servers_processed: 0
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Process each server
    const results: ProcessResult[] = [];
    for (const server of servers) {
      try {
        console.log(`Processing server: ${server.name} (${server.id})`);
        
        // Detect tools using tiered approach
        const tools = await detectServerTools(server);
        
        // Store tools in database
        if (tools.length > 0) {
          await storeServerTools(server.id, tools);
        }
        
        // Update server's last scan timestamp
        await supabase
          .from('servers')
          .update({ last_tools_scan: new Date().toISOString() })
          .eq('id', server.id);
        
        results.push({
          server_id: server.id,
          name: server.name,
          tools_detected: tools.length,
          detection_method: tools.length > 0 ? tools[0].detection_source : 'none',
          status: 'success'
        });
      } catch (err) {
        console.error(`Error detecting tools for ${server.name}:`, err);
        
        // Still update the scan timestamp to prevent continuous retries on problem servers
        try {
          await supabase
            .from('servers')
            .update({ last_tools_scan: new Date().toISOString() })
            .eq('id', server.id);
        } catch (updateErr) {
          console.error(`Failed to update last_tools_scan for ${server.name}:`, updateErr);
        }
        
        results.push({
          server_id: server.id,
          name: server.name,
          status: 'error',
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        servers_processed: servers.length,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Tools detection error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

/**
 * Detect tools for an MCP server using a tiered approach
 * 
 * @param server The server object with id, name, health_check_url, api_documentation, and github_url
 * @returns Array of detected tools
 */
async function detectServerTools(server: ServerRecord): Promise<Tool[]> {
  // Initialize empty tools array
  let tools: Tool[] = [];
  let detectionSource = '';
  
  // Tier 1: Try standard MCP API endpoint for tool definitions
  if (server.api_documentation) {
    try {
      const standardEndpoint = `${server.api_documentation.replace(/\/$/, '')}/list_resources`;
      console.log(`Trying standard MCP endpoint: ${standardEndpoint}`);
      
      tools = await detectToolsFromEndpoint(standardEndpoint);
      
      if (tools.length > 0) {
        console.log(`Detected ${tools.length} tools from standard MCP endpoint for ${server.name}`);
        detectionSource = 'standard_mcp_api';
        
        // Set the detection source for each tool
        tools = tools.map(tool => ({
          ...tool,
          detection_source: detectionSource
        }));
        
        return tools;
      }
    } catch (err) {
      console.log(`Standard MCP endpoint detection failed for ${server.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  // Tier 2: Check common alternative endpoints
  if (server.api_documentation || server.health_check_url) {
    const baseUrl = server.api_documentation || server.health_check_url;
    if (baseUrl) {
      const alternativeEndpoints = [
        `${baseUrl.replace(/\/$/, '')}/tools`,
        `${baseUrl.replace(/\/$/, '')}/functions`,
        `${baseUrl.replace(/\/$/, '')}/api/tools`,
        `${baseUrl.replace(/\/$/, '')}/api/functions`,
        `${baseUrl.replace(/\/$/, '')}/schema`,
        `${baseUrl.replace(/\/$/, '')}/api/schema`
      ];
      
      for (const endpoint of alternativeEndpoints) {
        try {
          console.log(`Trying alternative endpoint: ${endpoint}`);
          const endpointTools = await detectToolsFromEndpoint(endpoint);
          
          if (endpointTools.length > 0) {
            console.log(`Detected ${endpointTools.length} tools from alternative endpoint ${endpoint} for ${server.name}`);
            detectionSource = 'alternative_api';
            
            // Set the detection source for each tool
            tools = endpointTools.map(tool => ({
              ...tool,
              detection_source: detectionSource
            }));
            
            return tools;
          }
        } catch (err) {
          // Continue to next endpoint if this one fails
          console.log(`Alternative endpoint ${endpoint} failed for ${server.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }
  
  // Tier 3: Fall back to repository code analysis if we have a GitHub URL
  if (server.github_url) {
    try {
      console.log(`Falling back to repository analysis for ${server.name}`);
      const repoTools = await detectToolsFromRepository(server.github_url);
      
      if (repoTools.length > 0) {
        console.log(`Detected ${repoTools.length} tools from repository for ${server.name}`);
        detectionSource = 'github_repository';
        
        // Set the detection source for each tool
        tools = repoTools.map(tool => ({
          ...tool,
          detection_source: detectionSource
        }));
        
        return tools;
      }
    } catch (err) {
      console.log(`Repository analysis failed for ${server.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  // If we reach here, no tools were detected
  console.log(`No tools detected for ${server.name} through any method`);
  return [];
}

/**
 * Detect tools from an MCP API endpoint
 * 
 * @param endpoint The API endpoint URL to query
 * @returns Array of detected tools
 */
async function detectToolsFromEndpoint(endpoint: string): Promise<Tool[]> {
  try {
    // Reason: Using AbortController with timeout to ensure we don't wait too long for unresponsive endpoints
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    
    const data = await response.json();
    
    // Process the response based on common MCP API patterns
    let tools: Tool[] = [];
    
    // Pattern 1: Array of tool objects
    if (Array.isArray(data)) {
      tools = data.map(processTool).filter(Boolean) as Tool[];
    } 
    // Pattern 2: Object with tools property
    else if (data.tools && Array.isArray(data.tools)) {
      tools = data.tools.map(processTool).filter(Boolean) as Tool[];
    }
    // Pattern 3: Object with functions property
    else if (data.functions && Array.isArray(data.functions)) {
      tools = data.functions.map(processTool).filter(Boolean) as Tool[];
    }
    // Pattern 4: Object with resources property
    else if (data.resources && Array.isArray(data.resources)) {
      tools = data.resources.map(processTool).filter(Boolean) as Tool[];
    }
    // Pattern 5: Object with endpoints property
    else if (data.endpoints && Array.isArray(data.endpoints)) {
      tools = data.endpoints.map(processTool).filter(Boolean) as Tool[];
    }
    // Pattern 6: Object with a schema containing function definitions
    else if (data.schema?.functions) {
      tools = Object.entries(data.schema.functions)
        .map(([name, def]) => processTool({ name, ...def as object }))
        .filter(Boolean) as Tool[];
    }
    
    return tools;
  } catch (err) {
    console.error(`Error detecting tools from endpoint ${endpoint}:`, err);
    throw err;
  }
}

/**
 * Process a tool object into a standardized format
 * 
 * @param tool The tool object from API response
 * @returns Standardized tool object or null if invalid
 */
function processTool(tool: any): Tool | null {
  if (!tool || typeof tool !== 'object') {
    return null;
  }
  
  // Require at least a name or identifier
  const name = tool.name || tool.id || tool.function || '';
  if (!name) {
    return null;
  }
  
  // Construct parameter array from various formats
  let parameters: ToolParameter[] = [];
  
  if (Array.isArray(tool.parameters)) {
    parameters = tool.parameters.map((param: any) => ({
      name: param.name || '',
      description: param.description || '',
      type: param.type || param.dataType || 'string',
      required: !!param.required
    }));
  } else if (tool.schema?.properties) {
    parameters = Object.entries(tool.schema.properties).map(([paramName, prop]: [string, any]) => ({
      name: paramName,
      description: prop.description || '',
      type: prop.type || 'string',
      required: Array.isArray(tool.schema.required) ? 
        tool.schema.required.includes(paramName) : 
        false
    }));
  }
  
  // Standard MCP tool format
  return {
    name,
    description: tool.description || tool.summary || tool.info || '',
    method: tool.method || 'POST',
    endpoint: tool.endpoint || tool.path || '',
    parameters
  };
}

/**
 * Detect tools from a GitHub repository (fallback method)
 * 
 * @param githubUrl GitHub repository URL
 * @returns Array of detected tools
 */
async function detectToolsFromRepository(githubUrl: string): Promise<Tool[]> {
  // Skip repository detection if token is invalid
  if (!githubToken || !isGithubTokenValid) {
    console.warn(`Skipping GitHub repository detection for ${githubUrl} - no valid GitHub token available`);
    return [];
  }

  try {
    // Extract owner and repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      console.warn(`Invalid GitHub URL format: ${githubUrl}`);
      return [];
    }
    
    const [_, owner, repo] = match;
    console.log(`Detecting tools from GitHub repository: ${owner}/${repo}`);
    
    // Search for tool definition files
    const tools: Tool[] = [];
    
    // Look for common tool definition files first
    const toolFiles = await findToolDefinitionFiles(owner, repo);
    
    if (toolFiles.length === 0) {
      console.log(`No tool definition files found in ${owner}/${repo}`);
      return [];
    }
    
    console.log(`Found ${toolFiles.length} potential tool definition files in ${owner}/${repo}`);
    
    for (const file of toolFiles) {
      try {
        console.log(`Extracting tools from ${file} in ${owner}/${repo}`);
        const fileTools = await extractToolsFromFile(owner, repo, file);
        
        if (fileTools.length > 0) {
          console.log(`Found ${fileTools.length} tools in ${file}`);
          tools.push(...fileTools);
        }
      } catch (err) {
        console.error(`Error extracting tools from file ${file}:`, err);
      }
    }
    
    // Set detection source for all tools
    if (tools.length > 0) {
      return tools.map(tool => ({
        ...tool,
        detection_source: 'github_repository'
      }));
    }
    
    return [];
  } catch (err) {
    console.error(`Error detecting tools from repository ${githubUrl}:`, err);
    return [];
  }
}

/**
 * Find tool definition files in a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Array of file paths
 */
async function findToolDefinitionFiles(owner: string, repo: string): Promise<string[]> {
  // Skip if GitHub token is invalid
  if (!githubToken || !isGithubTokenValid) {
    console.warn(`Cannot search for tool definition files in ${owner}/${repo} - no valid GitHub token`);
    return [];
  }
  
  try {
    // Search for common tool definition file patterns
    const searchPatterns = [
      // MCP specific configuration files
      'mcp-server.js', 'mcp-server.ts', 'mcp-server.json',
      'mcp.config.js', 'mcp.config.ts', 'mcp.config.json',
      'windsurf.config.js', 'windsurf.config.ts', 'windsurf.config.json',
      
      // Tool definition files
      'tools.json', 'tools.yaml', 'tools.yml',
      'functions.json', 'functions.yaml', 'functions.yml',
      'schema.json', 'schema.yaml', 'schema.yml',
      
      // API documentation
      'openapi.json', 'openapi.yaml', 'openapi.yml',
      'swagger.json', 'swagger.yaml', 'swagger.yml'
    ];
    
    const foundFiles: string[] = [];
    let rateLimitRemaining = 0;
    let rateLimitReset = 0;
    
    // Process patterns in smaller batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < searchPatterns.length; i += batchSize) {
      const batch = searchPatterns.slice(i, i + batchSize);
      
      // Process batch in parallel with a Promise.all
      const batchPromises = batch.map(async (pattern) => {
        try {
          // Wait if we're approaching rate limits
          if (rateLimitRemaining < 2) {
            const waitTime = (rateLimitReset * 1000) - Date.now() + 1000; // Add 1 second buffer
            if (waitTime > 0) {
              console.log(`Rate limit approaching, waiting ${waitTime}ms before continuing`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
          
          const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(`filename:${pattern} repo:${owner}/${repo}`)}`;
          
          const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${githubToken}`
          };
          
          // Use fetchWithRetry for better reliability
          const response = await fetchWithRetry(searchUrl, { headers }, 2, 15000);
          
          // Update rate limit info from response headers
          rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '60', 10);
          rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
          
          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              console.log(`Found ${data.items.length} matches for pattern '${pattern}' in ${owner}/${repo}`);
              return data.items.map((item: any) => item.path);
            }
          } else {
            // Handle specific error cases
            if (response.status === 403) {
              const resetTime = response.headers.get('x-ratelimit-reset');
              console.error(`GitHub rate limit exceeded. Resets at ${new Date(parseInt(resetTime || '0', 10) * 1000).toISOString()}`);
              
              // Wait a bit before continuing
              await new Promise(resolve => setTimeout(resolve, 5000));
            } else if (response.status === 404) {
              console.warn(`Pattern '${pattern}' not found in ${owner}/${repo}`);
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error(`GitHub search failed for ${pattern}: ${response.status}`, errorData.message || '');
            }
          }
        } catch (err) {
          console.error(`Error searching for ${pattern} in ${owner}/${repo}:`, err);
        }
        return [];
      });
      
      // Collect results from this batch
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(files => foundFiles.push(...files));
      
      // Wait a bit between batches to be gentle on the API
      if (i + batchSize < searchPatterns.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Remove duplicates
    const uniqueFiles = [...new Set(foundFiles)];
    return uniqueFiles;
  } catch (err) {
    console.error(`Error finding tool definition files for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Extract tools from a file in a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @param filePath Path to the file in the repository
 * @returns Array of detected tools
 */
async function extractToolsFromFile(owner: string, repo: string, filePath: string): Promise<Tool[]> {
  try {
    // Fetch file content from GitHub
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${githubToken}`
    };
    
    console.log(`Fetching file contents from ${filePath}`);
    const response = await fetchWithRetry(fileUrl, { headers }, 2, 10000);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`File ${filePath} not found in ${owner}/${repo}`);
      } else {
        console.error(`Failed to fetch file ${filePath}: ${response.status} ${response.statusText}`);
      }
      return [];
    }
    
    const data = await response.json();
    
    if (!data.content) {
      console.warn(`No content found in file ${filePath} or file is a directory`);
      return [];
    }
    
    // Decode base64 content
    const content = atob(data.content.replace(/\n/g, ''));
    
    // Parse file content based on extension
    const tools: Tool[] = [];
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    console.log(`Processing ${filePath} with extension '${extension}'`);
    
    if (extension === 'json') {
      try {
        const json = JSON.parse(content);
        
        // Check for different JSON formats
        if (Array.isArray(json)) {
          // Array of tool objects
          console.log(`Found array of ${json.length} potential tools in JSON file`);
          const extractedTools = json.map(processTool).filter(Boolean) as Tool[];
          tools.push(...extractedTools);
        } else if (json.tools && Array.isArray(json.tools)) {
          // Object with tools property
          console.log(`Found 'tools' array with ${json.tools.length} items in JSON file`);
          const extractedTools = json.tools.map(processTool).filter(Boolean) as Tool[];
          tools.push(...extractedTools);
        } else if (json.functions && Array.isArray(json.functions)) {
          // Object with functions property
          console.log(`Found 'functions' array with ${json.functions.length} items in JSON file`);
          const extractedTools = json.functions.map(processTool).filter(Boolean) as Tool[];
          tools.push(...extractedTools);
        } else if (json.paths) {
          // OpenAPI/Swagger format
          console.log(`Found OpenAPI/Swagger format with ${Object.keys(json.paths).length} paths`);
          const extractedTools = extractToolsFromOpenApi(json);
          tools.push(...extractedTools);
        }
      } catch (err) {
        console.error(`Error parsing JSON file ${filePath}:`, err);
      }
    } else if (extension === 'yaml' || extension === 'yml') {
      try {
        // @ts-ignore: Deno-specific import
        const { parse } = await import('https://deno.land/std@0.177.0/yaml/mod.ts');
        const yaml = parse(content);
        
        // Check for different YAML formats
        if (Array.isArray(yaml)) {
          // Array of tool objects
          console.log(`Found array of ${yaml.length} potential tools in YAML file`);
          const extractedTools = yaml.map(processTool).filter(Boolean) as Tool[];
          tools.push(...extractedTools);
        } else if (yaml.tools && Array.isArray(yaml.tools)) {
          // Object with tools property
          console.log(`Found 'tools' array with ${yaml.tools.length} items in YAML file`);
          const extractedTools = yaml.tools.map(processTool).filter(Boolean) as Tool[];
          tools.push(...extractedTools);
        } else if (yaml.functions && Array.isArray(yaml.functions)) {
          // Object with functions property
          console.log(`Found 'functions' array with ${yaml.functions.length} items in YAML file`);
          const extractedTools = yaml.functions.map(processTool).filter(Boolean) as Tool[];
          tools.push(...extractedTools);
        } else if (yaml.paths) {
          // OpenAPI/Swagger format
          console.log(`Found OpenAPI/Swagger format with ${Object.keys(yaml.paths).length} paths`);
          const extractedTools = extractToolsFromOpenApi(yaml);
          tools.push(...extractedTools);
        }
      } catch (err) {
        console.error(`Error parsing YAML file ${filePath}:`, err);
      }
    } else if (extension === 'js' || extension === 'ts') {
      // Look for tool definitions in JavaScript/TypeScript files
      try {
        const extractedTools = extractToolsFromJsContent(content);
        if (extractedTools.length > 0) {
          console.log(`Found ${extractedTools.length} tools in JS/TS file ${filePath}`);
          tools.push(...extractedTools);
        }
      } catch (err) {
        console.error(`Error extracting tools from JS/TS file ${filePath}:`, err);
      }
    }
    
    if (tools.length > 0) {
      console.log(`Extracted ${tools.length} tools from ${filePath}`);
    }
    
    return tools;
  } catch (err) {
    console.error(`Error extracting tools from file ${filePath} in ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Extract tools from OpenAPI/Swagger specification
 * 
 * @param spec OpenAPI/Swagger specification object
 * @returns Array of detected tools
 */
/**
 * Extract tools from JavaScript or TypeScript content
 * 
 * @param content The JS/TS file content as string
 * @returns Array of detected tools
 */
function extractToolsFromJsContent(content: string): Tool[] {
  const tools: Tool[] = [];
  
  try {
    // Look for tool definitions using regex patterns
    for (const pattern of TOOL_REGEX_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Extract name and description from the match
        const name = match[1]?.trim();
        const description = match[2]?.trim();
        
        if (name && description) {
          console.log(`Found tool in JS/TS: ${name}`);
          tools.push({
            name,
            description,
            method: 'POST', // Default method
            endpoint: `/${name}`, // Default endpoint based on name
            parameters: [], // Default empty parameters
            detection_source: 'js_content'
          });
        }
      }
    }
    
    // Look for OpenAI function calling format
    if (content.includes('function_call') || 
        content.includes('functions:') || 
        content.includes('tools:')) {
      // Extract potential function names
      const functionNameMatches = content.match(/['"]?name['"]?\s*:\s*['"]([^'"]+)['"]\s*/g);
      if (functionNameMatches && functionNameMatches.length > 0) {
        console.log(`Found ${functionNameMatches.length} potential function names in OpenAI format`);
        
        // Try to extract associated descriptions
        for (const nameMatch of functionNameMatches) {
          const name = nameMatch.match(/['"]([^'"]+)['"]\s*$/)?.[1];
          if (name && !tools.some(t => t.name === name)) {
            // Find description near the name (simple heuristic)
            const descIndex = content.indexOf(nameMatch) + nameMatch.length;
            const descSection = content.substring(descIndex, descIndex + 200);
            const descMatch = descSection.match(/['"]?description['"]?\s*:\s*['"]([^'"]+)['"]\s*/)?.[1];
            
            if (descMatch) {
              tools.push({
                name,
                description: descMatch.trim(),
                method: 'POST', // Default method
                endpoint: `/${name}`, // Default endpoint based on name
                parameters: [], // Default empty parameters
                detection_source: 'js_content'
              });
            }
          }
        }
      }
    }
    
    return tools;
  } catch (err) {
    console.error('Error parsing JS/TS content:', err);
    return [];
  }
}

/**
 * Extract tools from OpenAPI/Swagger specification
 * 
 * @param spec OpenAPI/Swagger specification object
 * @returns Array of detected tools
 */
function extractToolsFromOpenApi(spec: any): Tool[] {
  try {
    const tools: Tool[] = [];
    
    // Process each path and method
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        if (!methods || typeof methods !== 'object') continue;
        
        for (const [method, details] of Object.entries(methods as object)) {
          if (method === 'parameters' || !details || typeof details !== 'object') continue;
          
          const detailsObj = details as any;
          
          // Create a tool from this endpoint
          const tool: Tool = {
            name: detailsObj.operationId || `${method}_${path.replace(/\//g, '_')}`,
            description: detailsObj.summary || detailsObj.description || '',
            method: method.toUpperCase(),
            endpoint: path,
            parameters: []
          };
          
          // Process parameters
          if (detailsObj.parameters && Array.isArray(detailsObj.parameters)) {
            tool.parameters = detailsObj.parameters.map((param: any) => ({
              name: param.name || '',
              description: param.description || '',
              type: param.schema?.type || param.type || 'string',
              required: !!param.required
            }));
          }
          
          // Process request body for POST/PUT methods
          if (detailsObj.requestBody && detailsObj.requestBody.content) {
            const content = detailsObj.requestBody.content;
            const firstContentType = Object.keys(content)[0];
            
            if (firstContentType && content[firstContentType].schema) {
              const schema = content[firstContentType].schema;
              
              // Extract properties from request body schema
              if (schema.properties) {
                const bodyParams = Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
                  name,
                  description: prop.description || '',
                  type: prop.type || 'string',
                  required: Array.isArray(schema.required) ? 
                    schema.required.includes(name) : 
                    false
                }));
                
                tool.parameters.push(...bodyParams);
              }
            }
          }
          
          tools.push(tool);
        }
      }
    }
    
    return tools;
  } catch (err) {
    console.error('Error extracting tools from OpenAPI spec:', err);
    return [];
  }
}

/**
 * Store tool data in the database
 * 
 * @param serverId Server ID
 * @param tools Array of tool objects
 */
async function storeServerTools(serverId: string, tools: Tool[]): Promise<void> {
  if (!tools || tools.length === 0) {
    return;
  }
  
  try {
    // First delete existing tools for this server
    await supabase
      .from('server_tools')
      .delete()
      .eq('server_id', serverId);
    
    // Insert new tools
    for (const tool of tools) {
      // Insert the tool
      const { data: toolData, error: toolError } = await supabase
        .from('server_tools')
        .insert({
          server_id: serverId,
          name: tool.name,
          description: tool.description,
          method: tool.method,
          endpoint: tool.endpoint,
          detection_source: tool.detection_source
        })
        .select();
      
      if (toolError) {
        console.error(`Error storing tool ${tool.name} for server ${serverId}:`, toolError);
        continue;
      }
      
      // Insert parameters for this tool
      if (tool.parameters && tool.parameters.length > 0 && toolData && toolData[0]) {
        const toolId = toolData[0].id;
        
        for (const param of tool.parameters) {
          await supabase
            .from('tool_parameters')
            .insert({
              tool_id: toolId,
              name: param.name,
              description: param.description,
              type: param.type,
              required: param.required
            });
        }
      }
    }
  } catch (err) {
    console.error(`Error storing tools for server ${serverId}:`, err);
    throw err;
  }
}
