// Enhanced script to sync MCP servers with progress tracking and resilience
// This version processes servers in batches and provides detailed progress information

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../crawler/.env') });

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const BATCH_SIZE = 10; // Process 10 servers at a time
const DELAY_BETWEEN_BATCHES_MS = 2000; // 2 second delay between batches
const PROGRESS_FILE = path.resolve(__dirname, 'sync-progress.json');
const MAX_PAGES_TO_PROCESS = 5; // Limit to 5 pages (about 500 servers) for initial testing

// Stats tracking
let stats = {
  total: 0,
  added: 0,
  updated: 0,
  skipped: 0,
  errors: [],
  currentPage: 1,
  nextUrl: null,
  startTime: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

// Try to load previous progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      const savedStats = JSON.parse(data);
      stats = { ...savedStats, lastUpdated: new Date().toISOString() };
      console.log('Resuming from previous progress:', stats.currentPage);
      return true;
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
  return false;
}

// Save current progress
function saveProgress() {
  try {
    stats.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

/**
 * Extract GitHub owner and repository from a GitHub URL
 * 
 * @param url GitHub repository URL
 * @returns Object with owner and repo, or null if not a valid GitHub URL
 */
function extractGithubInfo(url) {
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
    return null;
  }
}

/**
 * Normalize GitHub URL to a standard format
 * 
 * @param url GitHub repository URL
 * @returns Normalized GitHub URL or null
 */
function normalizeGithubUrl(url) {
  if (!url) return null;
  
  try {
    const info = extractGithubInfo(url);
    if (!info) return url;
    
    return `https://github.com/${info.owner}/${info.repo}`;
  } catch (error) {
    return url;
  }
}

/**
 * Process a batch of MCP servers and update the database
 * 
 * @param servers Array of MCP server objects to process
 */
async function processServers(servers) {
  // Process servers in batches
  for (let i = 0; i < servers.length; i += BATCH_SIZE) {
    const batch = servers.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(servers.length / BATCH_SIZE)}`);
    
    // Process each server in the batch
    for (const server of batch) {
      stats.total++;
      
      try {
        // Extract GitHub info
        const githubInfo = extractGithubInfo(server.source_code_url);
        const githubId = githubInfo ? `${githubInfo.owner}/${githubInfo.repo}` : null;
        
        // Generate a slug for the server based on source
        let serverSlug;
        if (githubId) {
          // For GitHub repos, use the normalized GitHub ID
          serverSlug = githubId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        } else {
          // For other sources, generate a slug from the name
          serverSlug = server.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        
        // Generate a deterministic UUID based on the slug to ensure consistency
        // This way, even if we run the script multiple times, the same server will get the same UUID
        const serverId = crypto.createHash('md5').update(serverSlug).digest('hex');
        const uuid = [
          serverId.substring(0, 8),
          serverId.substring(8, 12),
          serverId.substring(12, 16),
          serverId.substring(16, 20),
          serverId.substring(20, 32)
        ].join('-');
        
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
        
        // Check if server already exists by slug
        const { data: existingServer } = await supabase
          .from('servers')
          .select('id, updated_at')
          .eq('slug', serverSlug)
          .maybeSingle();
        
        // Generate API documentation data
        // Store as a JSON string to ensure compatibility with Supabase
        const apiDocumentation = JSON.stringify({
          description: server.EXPERIMENTAL_ai_generated_description || server.short_description || '',
          endpoints: [],
          methods: {},
        });
        
        // Prepare server data
        const serverData = {
          id: uuid, // Use UUID for the ID
          slug: serverSlug, // Store the slug separately for human-readable identification
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
        
        // Add debugging information
        console.log(`Processing server: ${serverSlug} (UUID: ${uuid.substring(0, 8)}...)`);
        console.log(`API Documentation: ${apiDocumentation.substring(0, 50)}...`);
        
        if (existingServer) {
          // Update existing server using its existing ID
          const { error: updateError } = await supabase
            .from('servers')
            .update(serverData)
            .eq('id', existingServer.id);
            
          if (updateError) {
            console.error(`Failed to update server ${serverSlug}:`, updateError);
            stats.errors.push(`Failed to update server ${serverSlug}: ${updateError.message}`);
            stats.skipped++;
          } else {
            stats.updated++;
          }
        } else {
          // Add new server
          const { error: insertError } = await supabase
            .from('servers')
            .insert({
              ...serverData,
              created_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`Failed to insert server ${serverSlug}:`, insertError);
            stats.errors.push(`Failed to insert server ${serverSlug}: ${insertError.message}`);
            stats.skipped++;
          } else {
            stats.added++;
          }
        }
        
      } catch (error) {
        stats.errors.push(`Error processing server ${server.name}: ${error.message}`);
        stats.skipped++;
      }
    }
    
    // Save progress after each batch
    saveProgress();
    
    // Print stats after each batch
    console.log(`Progress: Added ${stats.added}, Updated ${stats.updated}, Skipped ${stats.skipped}, Total processed ${stats.total}`);
    
    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < servers.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }
}

/**
 * Fetch and process all MCP servers from PulseMCP API
 */
async function syncServers() {
  console.log('Starting MCP server sync...');
  
  // Initialize or resume sync
  const resumed = loadProgress();
  let nextUrl = resumed && stats.nextUrl ? stats.nextUrl : 'https://api.pulsemcp.com/v0beta/servers?count_per_page=100';
  let pageCount = resumed ? stats.currentPage : 1;
  
  try {
    while (nextUrl && pageCount <= MAX_PAGES_TO_PROCESS) {
      console.log(`Fetching page ${pageCount} of servers from: ${nextUrl}`);
      
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.statusText}`);
      }
      
      const data = await response.json();
      await processServers(data.servers);
      
      // Update for next iteration
      nextUrl = data.next;
      stats.nextUrl = nextUrl;
      stats.currentPage = ++pageCount;
      saveProgress();
      
      // Add a delay between pages to avoid rate limiting
      if (nextUrl) {
        console.log(`Waiting before fetching next page...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('Sync completed successfully!');
    console.log('Final stats:', {
      added: stats.added,
      updated: stats.updated,
      skipped: stats.skipped,
      total: stats.total,
      errors: stats.errors.length
    });
    
    // Update progress file with completion status
    stats.completed = true;
    stats.completedAt = new Date().toISOString();
    saveProgress();
    
  } catch (error) {
    console.error('Sync process failed:', error);
    
    // Save error state to progress file
    stats.lastError = error.message;
    saveProgress();
  }
}

// Start the sync process
syncServers();
