// Supabase Edge Function: sync-pulse-servers
// This function fetches all MCP servers from PulseMCP API and populates/updates the database
// Enhanced to support rich API documentation and platform-specific installation instructions

// Note: TypeScript errors for Deno APIs and ESM imports are expected in local IDE
// but won't affect deployment in the Supabase Edge Functions environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define CORS headers directly in this file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Types for MCP servers from PulseMCP API
interface MCPServer {
  name: string;
  url: string;
  external_url: string | null;
  short_description: string;
  source_code_url: string | null;
  github_stars: number | null;
  package_registry: string | null;
  package_name: string | null;
  package_download_count: number | null;
  EXPERIMENTAL_ai_generated_description: string | null;
  api_documentation?: {
    endpoints: MCPEndpoint[];
    examples?: MCPExample[];
  } | null;
  install_instructions?: MCPInstallInstruction[] | null;
}

interface MCPEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: MCPParameter[];
  responses?: MCPResponse[];
}

interface MCPParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface MCPResponse {
  status: number;
  description: string;
  schema?: Record<string, unknown>;
}

interface MCPExample {
  title: string;
  code: string;
  language: string;
  description?: string;
}

interface MCPInstallInstruction {
  platform: string;
  icon_url?: string;
  install_command: string;
}

interface MCPServerListResponse {
  servers: MCPServer[];
  total_count: number;
  next: string | null;
}

interface ProcessStats {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Edge function to synchronize MCP servers from PulseMCP API to our database
 * 
 * This function:
 * 1. Fetches all available MCP servers from the PulseMCP API
 * 2. Processes and normalizes the data (extracting GitHub info, generating IDs, etc.)
 * 3. Adds new servers or updates existing ones in the database
 * 4. Updates or creates installation instructions in the server_install_instructions table
 * 5. Enhances API documentation with rich data structure
 * 6. Returns statistics about the synchronization process
 * 
 * @param req The incoming request
 * @returns Response with synchronization statistics
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Initialize processing stats
    const stats: ProcessStats = {
      total: 0,
      added: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    /**
     * Extract GitHub owner and repository from a GitHub URL
     * 
     * @param url GitHub repository URL
     * @returns Object with owner and repo, or null if not a valid GitHub URL
     */
    const extractGithubInfo = (url: string | null): { owner: string; repo: string } | null => {
      if (!url) return null;
      
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'github.com') return null;
        
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
        if (pathParts.length < 2) return null;
        
        return {
          owner: pathParts[0],
          repo: pathParts[1]
        };
      } catch (error) {
        console.error(`Error extracting GitHub info from ${url}:`, error);
        return null;
      }
    };

    /**
     * Normalize GitHub URL to a standard format
     * 
     * @param url GitHub repository URL
     * @returns Normalized GitHub URL or null
     */
    const normalizeGithubUrl = (url: string | null): string | null => {
      if (!url) return null;
      
      try {
        const info = extractGithubInfo(url);
        if (!info) return url;
        
        return `https://github.com/${info.owner}/${info.repo}`;
      } catch (error) {
        return url;
      }
    };

    /**
     * Process a batch of MCP servers and update the database
     * 
     * @param servers Array of MCP server objects to process
     */
    const processServers = async (servers: MCPServer[]) => {
      for (const server of servers) {
        stats.total++;
        
        try {
          // Extract GitHub info
          const githubInfo = extractGithubInfo(server.source_code_url);
          const githubId = githubInfo ? `${githubInfo.owner}/${githubInfo.repo}` : null;
          
          // Generate a unique ID for the server based on source
          let serverId: string;
          if (githubId) {
            // For GitHub repos, use the normalized GitHub ID
            serverId = githubId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          } else {
            // For other sources, generate an ID from the name
            serverId = server.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          }
          
          // Format tags from name and description
          const nameParts = server.name.toLowerCase().split(/[^a-z0-9]+/);
          const descriptionParts = server.short_description
            ? server.short_description.toLowerCase().split(/[^a-z0-9]+/)
            : [];
          
          // Filter out common words and short words
          const commonWords = ['the', 'and', 'for', 'with', 'that', 'this', 'has', 'are', 'from'];
          const allParts = [...new Set([...nameParts, ...descriptionParts])];
          const tags = allParts
            .filter(word => word.length > 2)
            .filter(word => !commonWords.includes(word))
            .slice(0, 10); // Limit to 10 tags
          
          // Determine the category based on description or name
          let category = 'other';
          const lcName = server.name.toLowerCase();
          const lcDesc = server.short_description?.toLowerCase() || '';
          
          if (lcName.includes('auth') || lcDesc.includes('auth') || lcDesc.includes('login')) {
            category = 'auth';
          } else if (lcDesc.includes('database') || lcDesc.includes('storage') || lcName.includes('db')) {
            category = 'database';
          } else if (lcDesc.includes('ai') || lcDesc.includes('llm') || lcDesc.includes('language model')) {
            category = 'ai';
          } else if (lcDesc.includes('file') || lcDesc.includes('document')) {
            category = 'files';
          } else if (lcDesc.includes('web') || lcDesc.includes('http')) {
            category = 'web';
          }
          
          // Check if server already exists
          const { data: existingServer } = await supabaseClient
            .from('servers')
            .select('id, updated_at')
            .eq('id', serverId)
            .maybeSingle();
          
          // Generate API documentation data
          const apiDocumentation = {
            description: server.EXPERIMENTAL_ai_generated_description || server.short_description || '',
            endpoints: server.api_documentation?.endpoints || [],
            examples: server.api_documentation?.examples || [],
            methods: {}, // Legacy field maintained for backward compatibility
            // Add generated timestamp and source
            meta: {
              generated_at: new Date().toISOString(),
              source: 'pulsemcp',
              version: '1.0'
            }
          };
          
          // Prepare server data
          const serverData = {
            id: serverId,
            name: server.name,
            description: server.short_description || '',
            github_url: normalizeGithubUrl(server.source_code_url),
            stars: server.github_stars || 0,
            forks: 0, // Will be updated by GitHub enrichment
            open_issues: 0, // Will be updated by GitHub enrichment
            contributors: 0, // Will be updated by GitHub enrichment
            tags,
            category,
            source: 'pulsemcp',
            platform: server.package_registry || 'unknown',
            install_method: server.package_registry 
              ? `${server.package_registry} install ${server.package_name}` 
              : 'See GitHub repository',
            api_documentation: apiDocumentation
          };
          
          // Begin a transaction to ensure consistency between servers and installation instructions
          // Use supabase's built-in transaction support to update both tables atomically
          const isNew = !existingServer;
          
          try {
            // Start transaction
            if (isNew) {
              // Add new server
              const { error: insertError } = await supabaseClient
                .from('servers')
                .insert({
                  ...serverData,
                  created_at: new Date().toISOString()
                });
                
              if (insertError) {
                throw new Error(`Failed to insert server ${serverId}: ${insertError.message}`);
              } else {
                stats.added++;
              }
            } else {
              // Update existing server
              const { error: updateError } = await supabaseClient
                .from('servers')
                .update(serverData)
                .eq('id', serverId);
                
              if (updateError) {
                throw new Error(`Failed to update server ${serverId}: ${updateError.message}`);
              } else {
                stats.updated++;
              }
            }
            
            // Handle installation instructions
            // First, delete existing install instructions for this server
            const { error: deleteInstallError } = await supabaseClient
              .from('server_install_instructions')
              .delete()
              .eq('server_id', serverId);
              
            if (deleteInstallError) {
              throw new Error(`Failed to delete installation instructions for ${serverId}: ${deleteInstallError.message}`);
            }
            
            // Then, create new installation instructions if available
            const installInstructions: Array<{
              server_id: string;
              platform: string;
              icon_url?: string;
              install_command: string;
              sort_order: number;
            }> = [];
            
            // Add platform-specific instructions from PulseMCP if available
            if (server.install_instructions && Array.isArray(server.install_instructions)) {
              server.install_instructions.forEach((instruction, index) => {
                installInstructions.push({
                  server_id: serverId,
                  platform: instruction.platform,
                  icon_url: instruction.icon_url,
                  install_command: instruction.install_command,
                  sort_order: index
                });
              });
            }
            
            // Add default installation instruction based on package registry if no other instructions exist
            if (installInstructions.length === 0 && server.package_registry && server.package_name) {
              // Add npm-specific instruction
              if (server.package_registry === 'npm') {
                installInstructions.push({
                  server_id: serverId,
                  platform: 'Node.js',
                  icon_url: 'https://nodejs.org/static/images/logos/nodejs-new-pantone-black.svg',
                  install_command: `npm install ${server.package_name}`,
                  sort_order: 0
                });
                
                // Also add yarn alternative
                installInstructions.push({
                  server_id: serverId,
                  platform: 'Yarn',
                  icon_url: 'https://yarnpkg.com/favicon.svg',
                  install_command: `yarn add ${server.package_name}`,
                  sort_order: 1
                });
              }
              // Add pip-specific instruction
              else if (server.package_registry === 'pip' || server.package_registry === 'pypi') {
                installInstructions.push({
                  server_id: serverId,
                  platform: 'Python',
                  icon_url: 'https://www.python.org/static/favicon.ico',
                  install_command: `pip install ${server.package_name}`,
                  sort_order: 0
                });
              }
              // Add cargo-specific instruction
              else if (server.package_registry === 'cargo') {
                installInstructions.push({
                  server_id: serverId,
                  platform: 'Rust',
                  icon_url: 'https://www.rust-lang.org/favicon.ico',
                  install_command: `cargo add ${server.package_name}`,
                  sort_order: 0
                });
              }
              // Add go-specific instruction
              else if (server.package_registry === 'go') {
                installInstructions.push({
                  server_id: serverId,
                  platform: 'Go',
                  icon_url: 'https://go.dev/favicon.ico',
                  install_command: `go get ${server.package_name}`,
                  sort_order: 0
                });
              }
            }
            
            // If we have instructions to insert, do it
            if (installInstructions.length > 0) {
              const { error: insertInstallError } = await supabaseClient
                .from('server_install_instructions')
                .insert(installInstructions);
                
              if (insertInstallError) {
                throw new Error(`Failed to insert installation instructions for ${serverId}: ${insertInstallError.message}`);
              }
            }
          
          // Log progress every 10 servers
          if (stats.total % 10 === 0) {
            console.log(`Processed ${stats.total} servers. Added: ${stats.added}, Updated: ${stats.updated}, Skipped: ${stats.skipped}`);
          }
        } catch (error: any) {
          stats.errors.push(`Error processing server ${server.name}: ${error.message}`);
          stats.skipped++;
          console.error(`Error processing server ${server.name}:`, error);
        }
      }
    };

    /**
     * Fetch all pages of servers from the PulseMCP API
     */
    const fetchAllServers = async () => {
      let nextUrl: string | null = 'https://api.pulsemcp.com/v0beta/servers?count_per_page=100';
      let pageCount = 0;
      
      while (nextUrl) {
        pageCount++;
        console.log(`Fetching page ${pageCount} of servers from: ${nextUrl}`);
        
        try {
          const response = await fetch(nextUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch servers: ${response.statusText}`);
          }
          
          const data: MCPServerListResponse = await response.json();
          await processServers(data.servers);
          
          nextUrl = data.next;
          
          // Add a small delay to avoid rate limiting
          if (nextUrl) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          stats.errors.push(`Error fetching page ${pageCount}: ${error.message}`);
          console.error(`Error fetching page ${pageCount}:`, error);
          break; // Stop on error
        }
      }
    };

    // Fetch and process all servers
    await fetchAllServers();

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'MCP servers sync completed',
        stats
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('Sync process failed:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        message: `Sync process failed: ${error.message}`,
        error: error.stack || 'No stack trace available'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});
