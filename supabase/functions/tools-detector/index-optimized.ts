import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { GitHubCache } from './github-cache.ts';
import { ToolsDetectionLogger } from './logger.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GitHub API token for authenticated requests
const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';

// Maximum concurrency for parallel processing
const MAX_CONCURRENCY = 3;

// Interface definitions for typesafety
interface ServerRecord {
  id: string;
  name: string;
  url?: string;
  api_url?: string;
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
  duration_ms?: number;
}

/**
 * Optimized tools detector for MCP servers
 * 
 * This function uses a 3-tier approach with the following optimizations:
 * 1. Parallel processing of servers with controlled concurrency
 * 2. GitHub repository caching to reduce API calls
 * 3. Batch database operations for improved performance
 * 4. Detailed logging for monitoring and diagnostics
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Parse request
    const { server_ids, run_mode } = await req.json();
    
    // Get servers to process
    let serversQuery = supabase
      .from('servers')
      .select('id, name, url, api_url, github_url');
    
    if (server_ids && Array.isArray(server_ids) && server_ids.length > 0) {
      // Process specific servers if IDs provided
      serversQuery = serversQuery.in('id', server_ids);
    } else {
      // Otherwise, process servers that haven't been scanned yet
      serversQuery = serversQuery
        .is('last_tools_scan', null)
        .order('created_at', { ascending: false })
        .limit(10);
    }
    
    const { data: servers, error } = await serversQuery;
    
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
    
    // Process servers in parallel with controlled concurrency
    const results: ProcessResult[] = [];
    const batchSize = Math.min(MAX_CONCURRENCY, servers.length);
    
    for (let i = 0; i < servers.length; i += batchSize) {
      const batch = servers.slice(i, i + batchSize);
      const batchPromises = batch.map(server => processServer(server, run_mode === 'test'));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
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
 * Process a single server
 * 
 * @param server Server to process
 * @param isTest Whether this is a test run
 * @returns Process result
 */
async function processServer(server: ServerRecord, isTest: boolean = false): Promise<ProcessResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Processing server: ${server.name} (${server.id})`);
    
    // Detect tools using tiered approach
    const tools = await detectServerTools(server);
    
    // Store tools in database using batch operation
    if (tools.length > 0) {
      await storeServerToolsBatch(server.id, tools);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      server_id: server.id,
      name: server.name,
      tools_detected: tools.length,
      detection_method: tools.length > 0 ? tools[0].detection_source : 'none',
      status: 'success',
      duration_ms: duration
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Error detecting tools for ${server.name}:`, errorMessage);
    
    const duration = Date.now() - startTime;
    
    // Log the error
    if (!isTest) {
      await ToolsDetectionLogger.logDetection(
        server.id,
        'error',
        0,
        duration,
        errorMessage
      );
    }
    
    return {
      server_id: server.id,
      name: server.name,
      status: 'error',
      error: errorMessage,
      duration_ms: duration
    };
  }
}

/**
 * Detect tools for an MCP server using a tiered approach
 * 
 * @param server The server object with id, name, url, api_url, and github_url
 * @returns Array of detected tools
 */
async function detectServerTools(server: ServerRecord): Promise<Tool[]> {
  const startTime = Date.now();
  let tools: Tool[] = [];
  let detectionSource = '';
  let error: string | undefined;
  
  try {
    // Tier 1: Try standard MCP API endpoint for tool definitions
    if (server.api_url) {
      try {
        const standardEndpoint = `${server.api_url.replace(/\/$/, '')}/list_resources`;
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
      
      // Tier 2: Try alternative endpoints
      try {
        const alternativeEndpoints = [
          `${server.api_url.replace(/\/$/, '')}/api/list_resources`,
          `${server.api_url.replace(/\/$/, '')}/api/v1/list_resources`,
          `${server.api_url.replace(/\/$/, '')}/resources`,
          `${server.api_url.replace(/\/$/, '')}/api/resources`,
          `${server.api_url.replace(/\/$/, '')}/tools`,
          `${server.api_url.replace(/\/$/, '')}/api/tools`
        ];
        
        for (const endpoint of alternativeEndpoints) {
          console.log(`Trying alternative endpoint: ${endpoint}`);
          try {
            tools = await detectToolsFromEndpoint(endpoint);
            
            if (tools.length > 0) {
              console.log(`Detected ${tools.length} tools from alternative endpoint for ${server.name}`);
              detectionSource = 'alternative_api';
              
              // Set the detection source for each tool
              tools = tools.map(tool => ({
                ...tool,
                detection_source: detectionSource
              }));
              
              return tools;
            }
          } catch (altErr) {
            // Continue to next endpoint
          }
        }
      } catch (tierErr) {
        console.log(`Alternative endpoints detection failed for ${server.name}`);
      }
    }
    
    // Tier 3: Fallback to GitHub repository analysis
    if (server.github_url) {
      try {
        console.log(`Falling back to GitHub repository analysis for ${server.name}`);
        tools = await detectToolsFromRepository(server.github_url);
        
        if (tools.length > 0) {
          console.log(`Detected ${tools.length} tools from GitHub repository for ${server.name}`);
          detectionSource = 'github_repository';
          
          // Set the detection source for each tool
          tools = tools.map(tool => ({
            ...tool,
            detection_source: detectionSource
          }));
          
          return tools;
        }
      } catch (repoErr) {
        console.error(`GitHub repository analysis failed for ${server.name}: ${repoErr instanceof Error ? repoErr.message : String(repoErr)}`);
        throw repoErr;
      }
    }
    
    // No tools detected from any source
    console.log(`No tools detected for ${server.name} from any source`);
    return [];
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    // Log the detection result
    try {
      await ToolsDetectionLogger.logDetection(
        server.id,
        detectionSource || 'failed',
        tools.length,
        Date.now() - startTime,
        error
      );
    } catch (logErr) {
      console.error('Error logging detection:', logErr);
    }
  }
}

/**
 * Detect tools from an MCP API endpoint
 * 
 * @param endpoint The API endpoint URL to query
 * @returns Array of detected tools
 */
async function detectToolsFromEndpoint(endpoint: string): Promise<Tool[]> {
  const response = await fetch(endpoint, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API endpoint error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Different MCP servers have different response formats
  // Try to handle the most common ones
  
  // Format 1: { resources: [...] }
  if (data.resources && Array.isArray(data.resources)) {
    return data.resources
      .map((resource: any) => processTool(resource))
      .filter((tool: Tool | null): tool is Tool => tool !== null);
  }
  
  // Format 2: { tools: [...] }
  if (data.tools && Array.isArray(data.tools)) {
    return data.tools
      .map((tool: any) => processTool(tool))
      .filter((tool: Tool | null): tool is Tool => tool !== null);
  }
  
  // Format 3: { data: [...] }
  if (data.data && Array.isArray(data.data)) {
    return data.data
      .map((item: any) => processTool(item))
      .filter((tool: Tool | null): tool is Tool => tool !== null);
  }
  
  // Format 4: [...] (array response)
  if (Array.isArray(data)) {
    return data
      .map((item: any) => processTool(item))
      .filter((tool: Tool | null): tool is Tool => tool !== null);
  }
  
  throw new Error('Unsupported API response format');
}

/**
 * Process a tool object into a standardized format
 * 
 * @param tool The tool object from API response
 * @returns Standardized tool object or null if invalid
 */
function processTool(tool: any): Tool | null {
  // Skip if missing required fields
  if (!tool || !tool.name) {
    return null;
  }
  
  // Create standardized tool object
  const processedTool: Tool = {
    name: tool.name,
    description: tool.description || '',
    method: tool.method || 'POST',
    endpoint: tool.endpoint || '',
    parameters: []
  };
  
  // Process parameters if available
  if (tool.parameters) {
    // Handle different parameter formats
    if (Array.isArray(tool.parameters)) {
      processedTool.parameters = tool.parameters.map((param: any) => ({
        name: param.name || '',
        description: param.description || '',
        type: param.type || 'string',
        required: param.required === undefined ? true : !!param.required
      }));
    } else if (typeof tool.parameters === 'object') {
      // Handle case where parameters is an object with properties
      processedTool.parameters = Object.entries(tool.parameters).map(([name, param]: [string, any]) => ({
        name,
        description: typeof param === 'object' ? (param.description || '') : '',
        type: typeof param === 'object' ? (param.type || 'string') : 'string',
        required: typeof param === 'object' ? (param.required === undefined ? true : !!param.required) : true
      }));
    }
  }
  
  return processedTool;
}

/**
 * Detect tools from a GitHub repository (fallback method)
 * 
 * @param githubUrl GitHub repository URL
 * @returns Array of detected tools
 */
async function detectToolsFromRepository(githubUrl: string): Promise<Tool[]> {
  // Extract owner and repo from GitHub URL
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${githubUrl}`);
  }
  
  const [, owner, repo] = match;
  
  // Find potential tool definition files
  const filePaths = await findToolDefinitionFiles(owner, repo);
  
  // Extract tools from files
  const toolsPromises = filePaths.map(path => extractToolsFromFile(owner, repo, path));
  const toolsArrays = await Promise.all(toolsPromises);
  
  // Flatten and deduplicate tools
  const allTools = toolsArrays.flat();
  
  // Deduplicate by name
  const uniqueTools = Array.from(
    new Map(allTools.map(tool => [tool.name, tool])).values()
  );
  
  return uniqueTools;
}

/**
 * Find tool definition files in a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Array of file paths
 */
async function findToolDefinitionFiles(owner: string, repo: string): Promise<string[]> {
  const filePaths: string[] = [];
  
  try {
    // Search for OpenAPI/Swagger files
    const openApiSearch = await GitHubCache.searchRepository(
      owner, 
      repo, 
      'filename:openapi.json OR filename:swagger.json OR filename:openapi.yaml OR filename:swagger.yaml'
    );
    
    if (openApiSearch.items && openApiSearch.items.length > 0) {
      filePaths.push(...openApiSearch.items.map((item: any) => item.path));
    }
    
    // Search for function definition files
    const functionSearch = await GitHubCache.searchRepository(
      owner, 
      repo, 
      'functions.json OR tools.json OR resources.json OR "list_resources"'
    );
    
    if (functionSearch.items && functionSearch.items.length > 0) {
      filePaths.push(...functionSearch.items.map((item: any) => item.path));
    }
    
    // Check for specific MCP server patterns
    const mcpPatterns = [
      'index.ts',
      'functions.ts',
      'tools.ts',
      'resources.ts',
      'server.ts'
    ];
    
    for (const pattern of mcpPatterns) {
      try {
        // Try to get the file directly
        await GitHubCache.getFileContent(owner, repo, pattern);
        filePaths.push(pattern);
      } catch (err) {
        // File doesn't exist, ignore
      }
    }
    
    return [...new Set(filePaths)]; // Deduplicate
  } catch (err) {
    console.error(`Error finding tool definition files: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Extract tools from a repository file
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @param filePath Path to the file
 * @returns Array of detected tools
 */
async function extractToolsFromFile(owner: string, repo: string, filePath: string): Promise<Tool[]> {
  try {
    // Get file content
    const content = await GitHubCache.getFileContent(owner, repo, filePath);
    
    // Check if it's a JSON file
    if (filePath.endsWith('.json')) {
      try {
        const json = JSON.parse(content);
        
        // Check if it's an OpenAPI/Swagger specification
        if (json.openapi || json.swagger) {
          return extractToolsFromOpenApi(json);
        }
        
        // Check for other JSON formats
        if (json.functions) {
          return json.functions
            .map((func: any) => processTool(func))
            .filter((tool: Tool | null): tool is Tool => tool !== null);
        }
        
        if (json.tools) {
          return json.tools
            .map((tool: any) => processTool(tool))
            .filter((tool: Tool | null): tool is Tool => tool !== null);
        }
        
        if (json.resources) {
          return json.resources
            .map((resource: any) => processTool(resource))
            .filter((tool: Tool | null): tool is Tool => tool !== null);
        }
        
        // Try to process the whole JSON as a list of tools
        if (Array.isArray(json)) {
          return json
            .map((item: any) => processTool(item))
            .filter((tool: Tool | null): tool is Tool => tool !== null);
        }
      } catch (jsonErr) {
        console.error(`Error parsing JSON: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`);
      }
    }
    
    // Check if it's a TypeScript or JavaScript file
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      // Extract function definitions using regex patterns
      const tools: Tool[] = [];
      
      // Look for function schema definitions
      const functionSchemaPattern = /{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]+)"/g;
      let match;
      
      while ((match = functionSchemaPattern.exec(content)) !== null) {
        const [, name, description] = match;
        
        tools.push({
          name,
          description,
          method: 'POST',
          endpoint: '',
          parameters: []
        });
      }
      
      return tools;
    }
    
    return [];
  } catch (err) {
    console.error(`Error extracting tools from file: ${err instanceof Error ? err.message : String(err)}`);
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
  const tools: Tool[] = [];
  
  // Extract endpoints from paths
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      // Skip if not an object
      if (typeof pathItem !== 'object' || pathItem === null) {
        continue;
      }
      
      // Process each HTTP method (GET, POST, etc.)
      for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
        // Skip if not an HTTP method or operation is not an object
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase()) || 
            typeof operation !== 'object' || operation === null) {
          continue;
        }
        
        // Extract operation details
        const name = operation.operationId || `${method.toUpperCase()} ${path}`;
        const description = operation.summary || operation.description || '';
        
        // Extract parameters
        const parameters: ToolParameter[] = [];
        
        // Path and query parameters
        if (operation.parameters && Array.isArray(operation.parameters)) {
          for (const param of operation.parameters) {
            if (typeof param !== 'object' || param === null) continue;
            
            parameters.push({
              name: param.name || '',
              description: param.description || '',
              type: param.schema?.type || 'string',
              required: param.required === true
            });
          }
        }
        
        // Request body parameters
        if (operation.requestBody && operation.requestBody.content) {
          const content = operation.requestBody.content['application/json'];
          if (content && content.schema && content.schema.properties) {
            for (const [propName, propSchema] of Object.entries(content.schema.properties as Record<string, any>)) {
              parameters.push({
                name: propName,
                description: propSchema.description || '',
                type: propSchema.type || 'string',
                required: Array.isArray(content.schema.required) && content.schema.required.includes(propName)
              });
            }
          }
        }
        
        tools.push({
          name,
          description,
          method: method.toUpperCase(),
          endpoint: path,
          parameters
        });
      }
    }
  }
  
  return tools;
}

/**
 * Store tool data in the database using batch operations
 * 
 * @param serverId Server ID
 * @param tools Array of tool objects
 */
async function storeServerToolsBatch(serverId: string, tools: Tool[]): Promise<void> {
  // Delete existing tools for this server
  await supabase
    .from('server_tools')
    .delete()
    .eq('server_id', serverId);
  
  if (tools.length === 0) {
    return;
  }
  
  // Prepare batch inserts
  const toolInserts = tools.map(tool => ({
    server_id: serverId,
    name: tool.name,
    description: tool.description,
    method: tool.method,
    endpoint: tool.endpoint,
    detection_source: tool.detection_source || 'unknown'
  }));
  
  // Insert tools in batches
  const { data: insertedTools, error: toolsError } = await supabase
    .from('server_tools')
    .insert(toolInserts)
    .select();
  
  if (toolsError) {
    throw new Error(`Error inserting tools: ${toolsError.message}`);
  }
  
  if (!insertedTools || insertedTools.length === 0) {
    throw new Error('Failed to insert tools');
  }
  
  // Create a map of tool name to tool ID
  const toolIdMap = new Map<string, string>();
  for (const tool of insertedTools) {
    toolIdMap.set(tool.name, tool.id);
  }
  
  // Prepare parameter inserts
  const parameterInserts: any[] = [];
  
  for (const tool of tools) {
    const toolId = toolIdMap.get(tool.name);
    if (!toolId) continue;
    
    for (const param of tool.parameters) {
      parameterInserts.push({
        tool_id: toolId,
        name: param.name,
        description: param.description,
        type: param.type,
        required: param.required
      });
    }
  }
  
  // Insert parameters in batches (if any)
  if (parameterInserts.length > 0) {
    const { error: paramsError } = await supabase
      .from('tool_parameters')
      .insert(parameterInserts);
    
    if (paramsError) {
      console.error(`Error inserting parameters: ${paramsError.message}`);
    }
  }
}
