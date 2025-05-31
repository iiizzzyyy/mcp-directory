import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GitHub API token for authenticated requests
const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';

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
      .select('id, name, url, api_url, github_url')
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
 * @param server The server object with id, name, url, api_url, and github_url
 * @returns Array of detected tools
 */
async function detectServerTools(server: ServerRecord): Promise<Tool[]> {
  // Initialize empty tools array
  let tools: Tool[] = [];
  let detectionSource = '';
  
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
  }
  
  // Tier 2: Check common alternative endpoints
  if (server.api_url || server.url) {
    const baseUrl = server.api_url || server.url;
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
  try {
    // Extract owner and repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return [];
    }
    
    const [_, owner, repo] = match;
    
    // Search for tool definition files
    const tools: Tool[] = [];
    
    // Look for common tool definition files first
    const toolFiles = await findToolDefinitionFiles(owner, repo);
    for (const file of toolFiles) {
      try {
        const fileTools = await extractToolsFromFile(owner, repo, file);
        tools.push(...fileTools);
      } catch (err) {
        console.error(`Error extracting tools from file ${file}:`, err);
      }
    }
    
    return tools;
  } catch (err) {
    console.error(`Error detecting tools from repository:`, err);
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
  try {
    // Search for common tool definition file patterns
    const searchPatterns = [
      'tools.json', 
      'tools.yaml', 
      'tools.yml',
      'functions.json', 
      'functions.yaml', 
      'functions.yml',
      'schema.json', 
      'schema.yaml', 
      'schema.yml',
      'openapi.json', 
      'openapi.yaml', 
      'openapi.yml',
      'swagger.json', 
      'swagger.yaml', 
      'swagger.yml'
    ];
    
    const foundFiles: string[] = [];
    
    // Reason: Using GitHub search API to efficiently find files across the repository
    // This is more efficient than recursively traversing the repository structure
    for (const pattern of searchPatterns) {
      try {
        const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(`filename:${pattern} repo:${owner}/${repo}`)}`;
        
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
        // Add authentication if a token is available
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(searchUrl, { headers });
        
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            for (const item of data.items) {
              foundFiles.push(item.path);
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`GitHub search failed for ${pattern}: ${response.status} ${errorText}`);
          
          // If we hit rate limits, pause before continuing
          if (response.status === 403) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (err) {
        console.error(`Error searching for ${pattern} in ${owner}/${repo}:`, err);
      }
    }
    
    return foundFiles;
  } catch (err) {
    console.error(`Error finding tool definition files for ${owner}/${repo}:`, err);
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
    // Fetch the file content
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3.raw'
    };
    
    // Add authentication if a token is available
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    
    const content = await response.text();
    let toolsData: any;
    
    // Parse the content based on file extension
    if (filePath.endsWith('.json')) {
      toolsData = JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      const { parse } = await import('https://deno.land/std@0.177.0/yaml/mod.ts');
      toolsData = parse(content);
    } else {
      return [];
    }
    
    // Extract tools based on common patterns
    let tools: Tool[] = [];
    
    // Pattern 1: Array of tool objects
    if (Array.isArray(toolsData)) {
      tools = toolsData.map(processTool).filter(Boolean) as Tool[];
    } 
    // Pattern 2: Object with tools property
    else if (toolsData.tools && Array.isArray(toolsData.tools)) {
      tools = toolsData.tools.map(processTool).filter(Boolean) as Tool[];
    }
    // Pattern 3: Object with functions property
    else if (toolsData.functions && Array.isArray(toolsData.functions)) {
      tools = toolsData.functions.map(processTool).filter(Boolean) as Tool[];
    }
    // Pattern 4: OpenAPI/Swagger format
    else if (toolsData.paths) {
      tools = extractToolsFromOpenApi(toolsData);
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
