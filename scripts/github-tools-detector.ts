#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Check required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(chalk.red('❌ Missing required environment variables:'), missingEnvVars.join(', '));
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GitHub token for API access
const githubToken = process.env.GITHUB_TOKEN!;

// Configuration
const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const TIMEOUT = 10000; // 10 seconds

// Keywords to search for in GitHub repositories
// Keywords for tool detection
const TOOL_KEYWORDS = [
  'list_resources',
  'mcp_tools',
  'mcp-tools',
  'MCP_functions',
  'function_definitions',
  'tool_definitions',
  'createToolCalls',
  'defineTool',
  'registerTool'
];

// Keywords for installation instruction detection
const INSTALLATION_KEYWORDS = [
  'installation',
  'installing',
  'setup',
  'getting started',
  'quick start',
  'usage',
  'how to use',
  'npm install',
  'pip install',
  'docker',
  'install steps'
];

// Platform identification keywords
const PLATFORM_PATTERNS = [
  { platform: 'npm', patterns: ['npm i ', 'npm install ', 'yarn add ', 'pnpm add '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
  { platform: 'pip', patterns: ['pip install ', 'pip3 install '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { platform: 'docker', patterns: ['docker pull ', 'docker run ', 'docker-compose '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
  { platform: 'cargo', patterns: ['cargo install ', 'cargo add '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg' },
  { platform: 'go', patterns: ['go install ', 'go get '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg' },
  { platform: 'composer', patterns: ['composer require '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg' },
  { platform: 'gem', patterns: ['gem install '], icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg' },
  { platform: 'brew', patterns: ['brew install '], icon_url: 'https://brew.sh/assets/img/homebrew.svg' },
];

/**
 * Extract owner and repo from GitHub URL
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('github.com')) {
      return null;
    }
    
    // Remove trailing .git if present
    const path = urlObj.pathname.replace(/\.git$/, '').replace(/^\/*/, '');
    const parts = path.split('/').filter(Boolean);
    
    if (parts.length < 2) {
      return null;
    }
    
    return {
      owner: parts[0],
      repo: parts[1]
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch with retry
 */
async function fetchWithRetry(url: string, options: any = {}, retries = MAX_RETRIES): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle rate limiting
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000;
        const waitTime = Math.max(0, resetTime - Date.now()) + 1000;
        console.log(chalk.yellow(`Rate limited. Waiting ${waitTime}ms before retrying...`));
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(chalk.yellow(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${waitTime}ms...`));
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error(`Failed after ${retries} retries`);
}

/**
 * Find tool-related files in a GitHub repository
 */
async function findToolFiles(owner: string, repo: string): Promise<string[]> {
  const files: string[] = [];
  
  for (const keyword of TOOL_KEYWORDS) {
    try {
      console.log(chalk.blue(`Searching for "${keyword}" in ${owner}/${repo}...`));
      
      const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(keyword)}+repo:${owner}/${repo}`;
      const data = await fetchWithRetry(searchUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.path && !files.includes(item.path)) {
            files.push(item.path);
          }
        }
      }
      
      // Avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(chalk.yellow(`Error searching for "${keyword}":`, error));
    }
  }
  
  return files;
}

/**
 * Extract tool data from a file in a GitHub repository
 */
async function extractToolsFromFile(owner: string, repo: string, filePath: string): Promise<any[]> {
  try {
    console.log(chalk.blue(`Extracting tools from ${filePath}...`));
    
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const response = await fetchWithRetry(fileUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });
    
    // If we failed to get the content, return empty array
    if (!response) {
      return [];
    }
    
    const content = await response;
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    
    // Extract tools based on file type
    if (fileExtension === 'json') {
      try {
        // Handle JSON files
        if (typeof content === 'string') {
          const json = JSON.parse(content);
          return extractToolsFromJson(json);
        } else if (typeof content === 'object') {
          return extractToolsFromJson(content);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Error parsing JSON in ${filePath}:`, error));
      }
    } else if (['js', 'ts', 'jsx', 'tsx'].includes(fileExtension || '')) {
      // Handle JavaScript/TypeScript files
      if (typeof content === 'string') {
        return extractToolsFromJsContent(content);
      }
    }
    
    return [];
  } catch (error) {
    console.warn(chalk.yellow(`Error extracting tools from ${filePath}:`, error));
    return [];
  }
}

/**
 * Extract tools from JSON content
 */
function extractToolsFromJson(json: any): any[] {
  const tools: any[] = [];
  
  // Case 1: Direct array of tools
  if (Array.isArray(json)) {
    for (const item of json) {
      if (item && typeof item === 'object' && item.name && (item.description || item.desc)) {
        tools.push({
          name: item.name,
          description: item.description || item.desc || '',
          parameters: item.parameters || [],
          method: item.method || 'GET',
          endpoint: item.endpoint || ''
        });
      }
    }
  } 
  // Case 2: Object with tools property
  else if (json && typeof json === 'object') {
    // Check various common property names for tool arrays
    const possibleArrayProps = ['tools', 'functions', 'resources', 'endpoints', 'commands'];
    
    for (const prop of possibleArrayProps) {
      if (json[prop] && Array.isArray(json[prop])) {
        for (const item of json[prop]) {
          if (item && typeof item === 'object' && item.name && (item.description || item.desc)) {
            tools.push({
              name: item.name,
              description: item.description || item.desc || '',
              parameters: item.parameters || [],
              method: item.method || 'GET',
              endpoint: item.endpoint || ''
            });
          }
        }
      }
    }
  }
  
  return tools;
}

/**
 * Extract tools from JavaScript/TypeScript content using regex
 */
function extractToolsFromJsContent(content: string): any[] {
  const tools: any[] = [];
  
  // Regex patterns to find tool definitions
  const patterns = [
    // Pattern 1: Object literal with name and description
    /\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"].*?\}/gs,
    // Pattern 2: Object with function schema
    /functions\.push\(\s*\{\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*description\s*:\s*['"]([^'"]+)['"].*?\}\)/gs,
    // Pattern 3: defineTool or registerTool call
    /(defineTool|registerTool)\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g
  ];
  
  // Apply each pattern
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (pattern.source.includes('defineTool|registerTool')) {
        // Handle defineTool pattern (name is in group 2, description in group 3)
        tools.push({
          name: match[2],
          description: match[3],
          parameters: [],
          method: 'GET',
          endpoint: ''
        });
      } else {
        // Handle standard object pattern (name is in group 1, description in group 2)
        tools.push({
          name: match[1],
          description: match[2],
          parameters: [],
          method: 'GET',
          endpoint: ''
        });
      }
    }
  }
  
  return tools;
}

/**
 * Interface for installation instructions
 */
interface InstallInstruction {
  platform: string;
  icon_url: string;
  install_command: string;
  source_file?: string;
  detected_at: string;
}

/**
 * Extract README content from a GitHub repository
 */
async function getReadmeContent(owner: string, repo: string): Promise<string | null> {
  try {
    console.log(chalk.blue(`Fetching README for ${owner}/${repo}...`));
    
    // Common README file patterns
    const readmePatterns = [
      'README.md',
      'Readme.md',
      'readme.md',
      'README.markdown',
      'README.rst',
      'README.txt',
      'README'
    ];
    
    // Try each pattern until we find a README file
    for (const pattern of readmePatterns) {
      try {
        const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${pattern}`;
        const response = await fetchWithRetry(fileUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3.raw'
          }
        });
        
        if (response && typeof response === 'string') {
          return response;
        }
      } catch (error) {
        // Continue to the next pattern
      }
    }
    
    console.log(chalk.yellow(`No README found for ${owner}/${repo}`));
    return null;
  } catch (error) {
    console.warn(chalk.yellow(`Error fetching README:`, error));
    return null;
  }
}

/**
 * Extract installation instructions from README content
 */
async function extractInstallInstructions(readmeContent: string, owner: string, repo: string): Promise<InstallInstruction[]> {
  if (!readmeContent) {
    return [];
  }
  
  const instructions: InstallInstruction[] = [];
  
  try {
    console.log(chalk.blue(`Extracting installation instructions from README...`));
    
    // Split README into sections using markdown headers
    const sections = readmeContent.split(/\n#{1,3}\s+/);
    
    // Find installation sections
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].toLowerCase();
      const sectionTitle = section.split('\n')[0];
      
      // Check if this section is related to installation
      if (INSTALLATION_KEYWORDS.some(keyword => sectionTitle.includes(keyword.toLowerCase()))) {
        console.log(chalk.green(`Found installation section: ${sectionTitle}`));
        
        // Extract code blocks which likely contain installation commands
        const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(sections[i])) !== null) {
          const codeBlock = match[1].trim();
          
          // Look for platform-specific installation commands
          for (const platformPattern of PLATFORM_PATTERNS) {
            for (const pattern of platformPattern.patterns) {
              if (codeBlock.includes(pattern)) {
                // Extract the installation command
                const lines = codeBlock.split('\n');
                for (const line of lines) {
                  if (line.includes(pattern)) {
                    instructions.push({
                      platform: platformPattern.platform,
                      icon_url: platformPattern.icon_url,
                      install_command: line.trim(),
                      source_file: 'README.md',
                      detected_at: new Date().toISOString()
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Also check for package.json for npm packages
    try {
      const packageJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
      const packageJsonResponse = await fetchWithRetry(packageJsonUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      
      if (packageJsonResponse && typeof packageJsonResponse === 'object') {
        const packageJson = packageJsonResponse;
        if (packageJson.name) {
          instructions.push({
            platform: 'npm',
            icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
            install_command: `npm install ${packageJson.name}`,
            source_file: 'package.json',
            detected_at: new Date().toISOString()
          });
          
          instructions.push({
            platform: 'yarn',
            icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/yarn/yarn-original.svg',
            install_command: `yarn add ${packageJson.name}`,
            source_file: 'package.json',
            detected_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      // No package.json found or error accessing it
    }
    
    // Check for setup.py for Python packages
    try {
      const setupPyUrl = `https://api.github.com/repos/${owner}/${repo}/contents/setup.py`;
      const setupPyResponse = await fetchWithRetry(setupPyUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      
      if (setupPyResponse && typeof setupPyResponse === 'string') {
        // Try to extract package name from setup.py
        const nameMatch = setupPyResponse.match(/name=['"]([^'"]+)/i);
        if (nameMatch && nameMatch[1]) {
          instructions.push({
            platform: 'pip',
            icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
            install_command: `pip install ${nameMatch[1]}`,
            source_file: 'setup.py',
            detected_at: new Date().toISOString()
          });
        } else {
          // Generic Python package installation from GitHub
          instructions.push({
            platform: 'pip',
            icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
            install_command: `pip install git+https://github.com/${owner}/${repo}.git`,
            source_file: 'setup.py',
            detected_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      // No setup.py found or error accessing it
    }
    
    // Check for Dockerfile for Docker instructions
    try {
      const dockerfileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/Dockerfile`;
      const dockerfileResponse = await fetchWithRetry(dockerfileUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      
      if (dockerfileResponse && typeof dockerfileResponse === 'string') {
        instructions.push({
          platform: 'docker',
          icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
          install_command: `docker build -t ${repo} https://github.com/${owner}/${repo}.git`,
          source_file: 'Dockerfile',
          detected_at: new Date().toISOString()
        });
      }
    } catch (error) {
      // No Dockerfile found or error accessing it
    }
    
    // Check for docker-compose.yml for Docker Compose instructions
    try {
      const dockerComposeUrl = `https://api.github.com/repos/${owner}/${repo}/contents/docker-compose.yml`;
      const dockerComposeResponse = await fetchWithRetry(dockerComposeUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      
      if (dockerComposeResponse && typeof dockerComposeResponse === 'string') {
        instructions.push({
          platform: 'docker-compose',
          icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
          install_command: `git clone https://github.com/${owner}/${repo}.git && cd ${repo} && docker-compose up -d`,
          source_file: 'docker-compose.yml',
          detected_at: new Date().toISOString()
        });
      }
    } catch (error) {
      // No docker-compose.yml found or error accessing it
    }
    
    console.log(chalk.green(`Found ${instructions.length} installation instructions`));
    return instructions;
  } catch (error) {
    console.warn(chalk.yellow(`Error extracting installation instructions:`, error));
    return [];
  }
}

/**
 * Store installation instructions in the database
 */
async function storeInstallInstructions(serverId: string, instructions: InstallInstruction[]): Promise<boolean> {
  if (instructions.length === 0) {
    return true; // No instructions to store
  }
  
  try {
    console.log(chalk.blue(`Storing ${instructions.length} installation instructions for server ${serverId}...`));
    
    // First delete any existing instructions for this server
    const { error: deleteError } = await supabase
      .from('server_install_instructions')
      .delete()
      .eq('server_id', serverId);
      
    if (deleteError) {
      console.error(chalk.red(`Error deleting existing instructions:`, deleteError));
      // Continue anyway to attempt adding new instructions
    }
    
    // Prepare the data for insertion
    const instructionsToInsert = instructions.map(instruction => ({
      server_id: serverId,
      platform: instruction.platform,
      icon_url: instruction.icon_url,
      install_command: instruction.install_command,
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
 * Extract tools from a GitHub repository
 */
async function detectToolsFromGitHub(githubUrl: string): Promise<any[]> {
  const repoInfo = parseGitHubUrl(githubUrl);
  if (!repoInfo) {
    console.error(chalk.red(`Invalid GitHub URL: ${githubUrl}`));
    return [];
  }
  
  try {
    // Step 1: Find tool-related files
    const files = await findToolFiles(repoInfo.owner, repoInfo.repo);
    console.log(chalk.green(`Found ${files.length} potential tool files in ${repoInfo.owner}/${repoInfo.repo}`));
    
    // Step 2: Extract tools from each file
    const allTools: any[] = [];
    
    for (const file of files) {
      const fileTools = await extractToolsFromFile(repoInfo.owner, repoInfo.repo, file);
      if (fileTools.length > 0) {
        console.log(chalk.green(`Found ${fileTools.length} tools in ${file}`));
        allTools.push(...fileTools);
      }
    }
    
    // Step 3: Remove duplicates based on name
    const uniqueTools: any[] = [];
    const toolNames = new Set<string>();
    
    for (const tool of allTools) {
      if (!toolNames.has(tool.name)) {
        toolNames.add(tool.name);
        uniqueTools.push({
          ...tool,
          detection_source: 'github_repository'
        });
      }
    }
    
    console.log(chalk.green(`Detected ${uniqueTools.length} unique tools from ${repoInfo.owner}/${repoInfo.repo}`));
    return uniqueTools;
  } catch (error) {
    console.error(chalk.red(`Error detecting tools from GitHub:`, error));
    return [];
  }
}

/**
 * Store detected tools in the database
 */
async function storeServerTools(serverId: string, tools: any[]): Promise<boolean> {
  try {
    console.log(chalk.blue(`Storing ${tools.length} tools for server ${serverId}...`));
    
    // First get existing server data to preserve any existing tags
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
    
    // Remove any existing tool or detection tags
    existingTags = existingTags.filter((tag: string) => 
      !tag.startsWith('tool:') && 
      !['mcp_detection_success', 'mcp_detection_failed'].includes(tag)
    );
    
    // Add detection status tags
    const statusTag = tools.length > 0 ? 'mcp_detection_success' : 'mcp_detection_failed';
    existingTags.push(statusTag);
      
    // Add tool names as tags (limit to 10 for tags, but store all in JSONB)
    if (tools.length > 0) {
      const toolTags = tools.slice(0, 10).map(tool => `tool:${tool.name}`);
      existingTags.push(...toolTags);
    }
    
    // Enhance tool definitions with additional metadata
    const enhancedTools = tools.map(tool => ({
      ...tool,
      detected_at: new Date().toISOString(),
      detection_source: 'github_repository'
    }));
    
    // Update server record with both tags and JSONB tools column
    const { error } = await supabase
      .from('servers')
      .update({
        last_tools_scan: new Date().toISOString(),
        tags: existingTags,
        tools: enhancedTools
      })
      .eq('id', serverId);
    
    if (error) {
      console.error(chalk.red(`Error updating server:`, error));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red(`Error storing tools:`, error));
    return false;
  }
}

/**
 * Process a single server
 */
async function processServer(server: any): Promise<any> {
  console.log(chalk.blue(`\nProcessing server: ${server.name} (${server.id})`));
  
  // Skip if no GitHub URL
  if (!server.github_url) {
    console.log(chalk.yellow(`Skipping ${server.name}: No GitHub URL`));
    
    // Mark as processed with failure tag
    await supabase
      .from('servers')
      .update({
        last_tools_scan: new Date().toISOString(),
        tags: ['mcp_detection_failed', 'missing_github_url']
      })
      .eq('id', server.id);
    
    return {
      server_id: server.id,
      name: server.name,
      status: 'error',
      error: 'Missing GitHub URL'
    };
  }
  
  try {
    const repoInfo = parseGitHubUrl(server.github_url);
    if (!repoInfo) {
      throw new Error(`Invalid GitHub URL: ${server.github_url}`);
    }
    
    // Process in parallel for better performance
    const [tools, readmeContent] = await Promise.all([
      // Detect tools from GitHub
      detectToolsFromGitHub(server.github_url),
      // Fetch README content for installation instructions
      getReadmeContent(repoInfo.owner, repoInfo.repo)
    ]);
    
    // Extract installation instructions from README
    const installInstructions = await extractInstallInstructions(readmeContent || "", repoInfo.owner, repoInfo.repo);
    
    // Store the data in the database (also in parallel)
    const [toolsSuccess, installSuccess] = await Promise.all([
      // Store tools in the database
      storeServerTools(server.id, tools),
      // Store installation instructions
      storeInstallInstructions(server.id, installInstructions)
    ]);
    
    return {
      server_id: server.id,
      name: server.name,
      status: toolsSuccess && installSuccess ? 'success' : 'partial_success',
      tools_detected: tools.length,
      install_instructions_detected: installInstructions.length,
      detection_method: 'github_repository'
    };
  } catch (error: any) {
    console.error(chalk.red(`Error processing ${server.name}:`, error));
    
    // Mark as processed even if it failed
    await supabase
      .from('servers')
      .update({
        last_tools_scan: new Date().toISOString(),
        tags: ['mcp_detection_failed', 'processing_error']
      })
      .eq('id', server.id);
    
    return {
      server_id: server.id,
      name: server.name,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get servers to process
 */
async function getServersToProcess(limit: number): Promise<any[]> {
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
  } catch (error) {
    console.error(chalk.red('Error fetching servers:'), error);
    return [];
  }
}

/**
 * Reset all servers for scanning
 */
async function resetAllServers(): Promise<number> {
  try {
    const { error } = await supabase
      .from('servers')
      .update({ last_tools_scan: null })
      .not('id', 'is', null);
    
    if (error) throw error;
    
    // Get count of servers
    const { count, error: countError } = await supabase
      .from('servers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    return count || 0;
  } catch (error) {
    console.error(chalk.red('Error resetting servers:'), error);
    throw error;
  }
}

/**
 * Interface definitions for proper typing
 */
interface ServerResult {
  server_id: string;
  name: string;
  status: 'success' | 'error';
  tools_detected?: number;
  detection_method?: string;
  error?: string;
}

interface BatchResult {
  success: boolean;
  processed: number;
  results: ServerResult[];
}

/**
 * Process servers in a batch
 */
async function processBatch(): Promise<BatchResult> {
  // Get servers to process
  const servers = await getServersToProcess(BATCH_SIZE);
  
  if (servers.length === 0) {
    return {
      success: true,
      processed: 0,
      results: []
    };
  }
  
  console.log(chalk.blue(`Processing batch of ${servers.length} servers...`));
  
  const results: ServerResult[] = [];
  
  // Process each server
  for (const server of servers) {
    const result = await processServer(server);
    results.push(result as ServerResult);
  }
  
  return {
    success: true,
    processed: servers.length,
    results: results as ServerResult[]
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  const maxBatches = args.includes('--limit') 
    ? parseInt(args[args.indexOf('--limit') + 1] || '10', 10)
    : 100;
  
  console.log(chalk.blue('🔍 GitHub-Based MCP Tools Detector'));
  console.log(chalk.blue('================================'));
  
  // Reset all servers if requested
  if (shouldReset) {
    const count = await resetAllServers();
    console.log(chalk.green(`✅ Reset ${count} servers for scanning`));
  }
  
  // Process servers in batches
  let batchNumber = 0;
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalTools = 0;
  let hasMore = true;
  
  console.log(chalk.blue('Starting batch processing...'));
  
  while (hasMore && batchNumber < maxBatches) {
    batchNumber++;
    
    console.log(chalk.blue(`\nProcessing batch ${batchNumber}...`));
    const result = await processBatch();
    
    if (!result.success) {
      console.error(chalk.red(`❌ Batch ${batchNumber} failed`));
      continue;
    }
    
    if (result.processed === 0) {
      hasMore = false;
      console.log(chalk.green('✅ No more servers to process'));
      break;
    }
    
    // Update statistics
    totalProcessed += result.processed;
    
    for (const serverResult of result.results as any[]) {
      if (serverResult.status === 'success') {
        totalSuccess++;
        totalTools += serverResult.tools_detected || 0;
      } else {
        totalFailed++;
      }
    }
    
    console.log(chalk.green(`✅ Processed ${result.processed} servers in batch ${batchNumber}`));
    console.log(chalk.blue(`   Success: ${result.results.filter(r => r.status === 'success').length}`));
    console.log(chalk.yellow(`   Failed: ${result.results.filter(r => r.status === 'error').length}`));
    
    // Wait between batches to avoid overwhelming the API
    if (hasMore) {
      const waitTime = 3000;
      console.log(chalk.blue(`Waiting ${waitTime}ms before next batch...`));
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Final report
  console.log(chalk.green('\n✅ Processing complete!'));
  console.log(chalk.blue('📊 Final Statistics:'));
  console.log(`   Total batches: ${batchNumber}`);
  console.log(`   Total servers processed: ${totalProcessed}`);
  console.log(`   Successful: ${totalSuccess}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log(`   Total tools detected: ${totalTools}`);
  console.log(`   Average tools per server: ${totalSuccess > 0 ? (totalTools / totalSuccess).toFixed(2) : 0}`);
  
  // Check if there are more servers to process
  const remaining = await getServersToProcess(1);
  if (remaining.length > 0) {
    console.log(chalk.yellow(`\n⚠️ There are still servers that need processing.`));
    console.log(chalk.yellow(`   Run this script again to continue processing.`));
  }
}

// Run the script
main().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error);
  process.exit(1);
});
