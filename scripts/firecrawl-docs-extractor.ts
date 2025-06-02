/**
 * firecrawl-docs-extractor.ts
 * 
 * Integrates with Firecrawl MCP to extract detailed tool documentation and installation instructions
 * from MCP server documentation sites and repositories.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type definitions
interface Tool {
  name: string;
  description: string;
  parameters?: any;
  returns?: any;
  examples?: string[];
  documentation_url?: string;
  extracted_at?: string;
  extraction_source?: string;
}

interface InstallInstruction {
  platform: string;
  icon_url: string;
  install_command: string;
  source_file?: string;
  documentation_source?: string;
  detected_at: string;
  prerequisites?: string[];
  supported_versions?: string[];
}

interface Server {
  id: string;
  name: string;
  documentation_url?: string;
  github_url?: string;
  url?: string;
  tools?: Tool[];
  tags?: string[];
}

interface ExtractionSchema {
  type: string;
  properties: {
    [key: string]: any;
  };
  required?: string[];
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firecrawl MCP configuration
const FIRECRAWL_ENDPOINT = 'https://firecrawl.prod.wdsr.io/api';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

if (!FIRECRAWL_API_KEY) {
  console.error(chalk.red('Missing FIRECRAWL_API_KEY environment variable'));
  process.exit(1);
}

/**
 * Extracts tools and installation instructions from documentation sites using Firecrawl
 */
async function extractFromDocumentation(server: Server): Promise<{
  tools: Tool[];
  installInstructions: InstallInstruction[];
}> {
  console.log(chalk.blue(`Extracting documentation for ${server.name} (${server.id})...`));
  
  const urls: string[] = [];
  
  // Collect all possible documentation URLs
  if (server.documentation_url) {
    urls.push(server.documentation_url);
  }
  
  if (server.github_url) {
    // For GitHub URLs, also try to extract from GitHub Pages or documentation sites
    const githubUrl = server.github_url;
    
    // Extract owner and repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      const [, owner, repo] = match;
      
      // Add potential GitHub documentation URLs
      urls.push(`https://${owner}.github.io/${repo}`);
      urls.push(`https://${owner}.github.io/${repo}/docs`);
      urls.push(`https://docs.${repo}.dev`);
      urls.push(`https://docs.${repo}.io`);
      urls.push(`https://${repo}.dev`);
      urls.push(`https://${repo}.io`);
      
      // Add raw GitHub documentation URLs
      urls.push(`${githubUrl}/blob/main/README.md`);
      urls.push(`${githubUrl}/blob/main/docs/README.md`);
      urls.push(`${githubUrl}/blob/main/INSTALLATION.md`);
      urls.push(`${githubUrl}/blob/main/docs/INSTALLATION.md`);
      urls.push(`${githubUrl}/blob/main/docs/getting-started.md`);
      urls.push(`${githubUrl}/blob/main/docs/installation.md`);
    }
  }
  
  if (server.url) {
    urls.push(server.url);
    urls.push(`${server.url}/docs`);
  }
  
  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)];
  
  console.log(chalk.blue(`Found ${uniqueUrls.length} potential documentation URLs to scan`));
  
  const tools: Tool[] = [];
  const installInstructions: InstallInstruction[] = [];
  
  // Define extraction schema for tools
  const toolsSchema: ExtractionSchema = {
    type: 'object',
    properties: {
      tools: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            parameters: { type: 'object' },
            returns: { type: 'object' },
            examples: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['name', 'description']
        }
      }
    }
  };
  
  // Define extraction schema for installation instructions
  const installSchema: ExtractionSchema = {
    type: 'object',
    properties: {
      installationInstructions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            command: { type: 'string' },
            prerequisites: {
              type: 'array',
              items: { type: 'string' }
            },
            supportedVersions: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['platform', 'command']
        }
      }
    }
  };
  
  // Process each URL
  for (const url of uniqueUrls) {
    try {
      console.log(chalk.blue(`Extracting from ${url}...`));
      
      // Try to extract tools
      const toolsResult = await extractWithFirecrawl(url, toolsSchema, 
        'Extract all tool definitions for this MCP server. Each tool should have a name, description, ' +
        'and if available, parameters, returns, and examples. Look for function definitions, API ' +
        'documentation, or any structured tool descriptions.');
      
      if (toolsResult && toolsResult.tools && Array.isArray(toolsResult.tools)) {
        console.log(chalk.green(`Found ${toolsResult.tools.length} tools in ${url}`));
        
        // Add extraction metadata
        const enhancedTools = toolsResult.tools.map(tool => ({
          ...tool,
          documentation_url: url,
          extracted_at: new Date().toISOString(),
          extraction_source: 'firecrawl_documentation'
        }));
        
        tools.push(...enhancedTools);
      }
      
      // Try to extract installation instructions
      const installResult = await extractWithFirecrawl(url, installSchema,
        'Extract all installation instructions for this MCP server. Each instruction should have a ' +
        'platform (e.g., npm, pip, docker) and a command. If available, also extract prerequisites ' +
        'and supported versions.');
      
      if (installResult && installResult.installationInstructions && 
          Array.isArray(installResult.installationInstructions)) {
        console.log(chalk.green(`Found ${installResult.installationInstructions.length} installation instructions in ${url}`));
        
        // Process and enhance the installation instructions
        for (const instruction of installResult.installationInstructions) {
          // Map platform to icon
          let iconUrl = '';
          
          // Determine the appropriate icon based on platform
          switch (instruction.platform.toLowerCase()) {
            case 'npm':
            case 'node':
            case 'nodejs':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg';
              break;
            case 'pip':
            case 'python':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg';
              break;
            case 'docker':
            case 'docker-compose':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg';
              break;
            case 'cargo':
            case 'rust':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg';
              break;
            case 'go':
            case 'golang':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg';
              break;
            case 'composer':
            case 'php':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg';
              break;
            case 'gem':
            case 'ruby':
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg';
              break;
            case 'brew':
            case 'homebrew':
              iconUrl = 'https://brew.sh/assets/img/homebrew.svg';
              break;
            default:
              iconUrl = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bash/bash-original.svg';
          }
          
          installInstructions.push({
            platform: instruction.platform,
            icon_url: iconUrl,
            install_command: instruction.command,
            prerequisites: instruction.prerequisites,
            supported_versions: instruction.supportedVersions,
            documentation_source: url,
            detected_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Error extracting from ${url}:`, error));
      // Continue with the next URL
    }
  }
  
  return { tools, installInstructions };
}

/**
 * Uses Firecrawl MCP's extract function to extract structured data
 */
async function extractWithFirecrawl(url: string, schema: ExtractionSchema, prompt: string): Promise<any> {
  try {
    // Prepare the request body for Firecrawl
    const requestBody = {
      urls: [url],
      prompt,
      schema,
      allowExternalLinks: false,
      enableWebSearch: false
    };
    
    // Make the API call to Firecrawl MCP
    const response = await fetch(`${FIRECRAWL_ENDPOINT}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Return the extracted data
    if (data && data.results && data.results.length > 0) {
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.warn(chalk.yellow(`Firecrawl extraction error:`, error));
    return null;
  }
}

/**
 * Store extracted tools in the database
 */
async function storeExtractedTools(serverId: string, tools: Tool[]): Promise<boolean> {
  if (tools.length === 0) {
    return true; // No tools to store
  }
  
  try {
    console.log(chalk.blue(`Storing ${tools.length} extracted tools for server ${serverId}...`));
    
    // First get existing server data to preserve existing tools and tags
    const { data: serverData, error: fetchError } = await supabase
      .from('servers')
      .select('tags, tools')
      .eq('id', serverId)
      .single();
      
    if (fetchError) {
      console.error(chalk.red(`Error fetching server data:`, fetchError));
      return false;
    }
    
    // Prepare tags for update
    let existingTags = serverData?.tags || [];
    
    // Remove any existing documentation tool tags
    existingTags = existingTags.filter(tag => 
      !tag.startsWith('docs_tool:') && 
      !['docs_extraction_success', 'docs_extraction_failed'].includes(tag)
    );
    
    // Add documentation extraction status tags
    const statusTag = tools.length > 0 ? 'docs_extraction_success' : 'docs_extraction_failed';
    existingTags.push(statusTag);
      
    // Add tool names as documentation tool tags (limit to 5)
    if (tools.length > 0) {
      const toolTags = tools.slice(0, 5).map(tool => `docs_tool:${tool.name}`);
      existingTags.push(...toolTags);
    }
    
    // Combine existing tools with newly extracted ones
    let existingTools = serverData?.tools || [];
    
    if (!Array.isArray(existingTools)) {
      existingTools = [];
    }
    
    // Filter out any existing documentation tools to avoid duplicates
    existingTools = existingTools.filter(
      tool => tool.extraction_source !== 'firecrawl_documentation'
    );
    
    // Combine with newly extracted tools
    const allTools = [...existingTools, ...tools];
    
    // Update server record with both tags and JSONB tools column
    const { error } = await supabase
      .from('servers')
      .update({
        tags: existingTags,
        tools: allTools,
        last_docs_scan: new Date().toISOString()
      })
      .eq('id', serverId);
    
    if (error) {
      console.error(chalk.red(`Error updating server with extracted tools:`, error));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red(`Error storing extracted tools:`, error));
    return false;
  }
}

/**
 * Store extracted installation instructions in the database
 */
async function storeExtractedInstructions(serverId: string, instructions: InstallInstruction[]): Promise<boolean> {
  if (instructions.length === 0) {
    return true; // No instructions to store
  }
  
  try {
    console.log(chalk.blue(`Storing ${instructions.length} extracted installation instructions for server ${serverId}...`));
    
    // First get existing installation instructions
    const { data: existingInstructions, error: fetchError } = await supabase
      .from('server_install_instructions')
      .select('*')
      .eq('server_id', serverId);
      
    if (fetchError) {
      console.error(chalk.red(`Error fetching existing instructions:`, fetchError));
      return false;
    }
    
    // Keep track of existing commands to avoid duplicates
    const existingCommands = new Set(
      (existingInstructions || []).map(inst => inst.install_command)
    );
    
    // Filter out duplicate commands
    const newInstructions = instructions.filter(
      inst => !existingCommands.has(inst.install_command)
    );
    
    if (newInstructions.length === 0) {
      console.log(chalk.yellow('No new installation instructions to add'));
      return true;
    }
    
    // Prepare the data for insertion
    const instructionsToInsert = newInstructions.map(instruction => ({
      server_id: serverId,
      platform: instruction.platform,
      icon_url: instruction.icon_url,
      install_command: instruction.install_command,
      source: 'firecrawl_documentation',
      source_url: instruction.documentation_source,
      created_at: new Date().toISOString()
    }));
    
    // Insert the new instructions
    const { error: insertError } = await supabase
      .from('server_install_instructions')
      .insert(instructionsToInsert);
      
    if (insertError) {
      console.error(chalk.red(`Error inserting installation instructions:`, insertError));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red(`Error storing installation instructions:`, error));
    return false;
  }
}

/**
 * Process a single server with Firecrawl
 */
async function processServerWithFirecrawl(serverId: string): Promise<any> {
  try {
    console.log(chalk.blue(`Processing server ${serverId} with Firecrawl...`));
    
    // Get server details
    const { data: server, error } = await supabase
      .from('servers')
      .select('id, name, documentation_url, github_url, url, tools, tags')
      .eq('id', serverId)
      .single();
    
    if (error) {
      throw new Error(`Error fetching server: ${error.message}`);
    }
    
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }
    
    // Skip if no documentation URL, GitHub URL, or direct URL
    if (!server.documentation_url && !server.github_url && !server.url) {
      console.log(chalk.yellow(`Skipping ${server.name}: No documentation, GitHub, or direct URL`));
      
      // Mark as processed with failure tag
      await supabase
        .from('servers')
        .update({
          last_docs_scan: new Date().toISOString(),
          tags: [...(server.tags || []), 'docs_extraction_failed', 'missing_documentation_url']
        })
        .eq('id', server.id);
      
      return {
        server_id: server.id,
        name: server.name,
        status: 'skipped',
        reason: 'No documentation URLs available'
      };
    }
    
    // Extract tools and installation instructions
    const { tools, installInstructions } = await extractFromDocumentation(server);
    
    // Store the results
    const [toolsSuccess, installSuccess] = await Promise.all([
      storeExtractedTools(server.id, tools),
      storeExtractedInstructions(server.id, installInstructions)
    ]);
    
    return {
      server_id: server.id,
      name: server.name,
      status: toolsSuccess && installSuccess ? 'success' : 'partial_success',
      tools_extracted: tools.length,
      install_instructions_extracted: installInstructions.length
    };
  } catch (error) {
    console.error(chalk.red(`Error processing server with Firecrawl:`, error));
    return {
      server_id: serverId,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Main function to process servers with Firecrawl
 */
async function processServersWithFirecrawl(serverIds: string[]): Promise<any[]> {
  const results = [];
  
  for (const serverId of serverIds) {
    try {
      const result = await processServerWithFirecrawl(serverId);
      results.push(result);
    } catch (error) {
      console.error(chalk.red(`Error processing server ${serverId}:`, error));
      results.push({
        server_id: serverId,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Fetch servers to process with Firecrawl
 */
async function getServersForFirecrawl(count = 5): Promise<string[]> {
  console.log(chalk.blue(`Fetching ${count} servers for Firecrawl processing...`));
  
  const { data, error } = await supabase
    .from('servers')
    .select('id')
    .or('documentation_url.neq.null,github_url.neq.null,url.neq.null')
    .order('last_docs_scan', { ascending: true, nullsFirst: true })
    .limit(count);
  
  if (error) {
    throw new Error(`Error fetching servers: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    throw new Error('No servers found for Firecrawl processing');
  }
  
  return data.map(server => server.id);
}

// Main function
async function main() {
  try {
    // Check if server ID was passed as an argument
    const serverId = process.argv[2];
    
    if (serverId) {
      // Process a single server
      console.log(chalk.blue(`Processing single server with ID: ${serverId}`));
      const result = await processServerWithFirecrawl(serverId);
      console.log(chalk.green('Processing completed:'), result);
    } else {
      // Get servers to process (default 3)
      const count = process.argv[3] ? parseInt(process.argv[3]) : 3;
      const serverIds = await getServersForFirecrawl(count);
      
      console.log(chalk.blue(`Processing ${serverIds.length} servers with Firecrawl...`));
      const results = await processServersWithFirecrawl(serverIds);
      
      // Generate a report
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const reportPath = `./reports/firecrawl-extraction-${timestamp}.json`;
      
      // Ensure reports directory exists
      const fs = require('fs');
      if (!fs.existsSync('./reports')) {
        fs.mkdirSync('./reports', { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      
      console.log(chalk.green(`Processing completed for ${results.length} servers`));
      console.log(chalk.green(`Report saved to: ${reportPath}`));
      
      // Summary
      const successful = results.filter(r => r.status === 'success' || r.status === 'partial_success').length;
      const failed = results.filter(r => r.status === 'error').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      
      console.log(chalk.blue('Summary:'));
      console.log(`- Total: ${results.length}`);
      console.log(`- Successful: ${successful}`);
      console.log(`- Failed: ${failed}`);
      console.log(`- Skipped: ${skipped}`);
      console.log(`- Total tools extracted: ${results.reduce((sum, r) => sum + (r.tools_extracted || 0), 0)}`);
      console.log(`- Total install instructions: ${results.reduce((sum, r) => sum + (r.install_instructions_extracted || 0), 0)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

// Export functions for use in other scripts
export {
  extractFromDocumentation,
  processServerWithFirecrawl,
  processServersWithFirecrawl,
  getServersForFirecrawl
};
