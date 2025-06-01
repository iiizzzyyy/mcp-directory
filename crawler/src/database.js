const { createClient } = require('@supabase/supabase-js');
const { extractReadmeData } = require('./readme-parser');
require('dotenv').config();

// Simple in-memory cache to prevent redundant API calls
const readmeCache = new Map();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a server already exists in the database
 * @param {Object} server Server data
 * @returns {Promise<boolean>} True if server exists
 */
async function serverExists(server) {
  try {
    let query = supabase.from('servers').select('id');
    
    if (server.github_url) {
      query = query.eq('github_url', server.github_url);
    } else {
      query = query.ilike('name', server.name);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error('Error checking if server exists:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Unexpected error checking if server exists:', error);
    return false;
  }
}

/**
 * Insert a server into the database
 * @param {Object} server Server data
 * @returns {Promise<Object>} Result of the insert operation
 */
async function insertServer(server) {
  try {
    const serverWithTimestamp = {
      ...server,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('servers')
      .insert(serverWithTimestamp);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting server:', error);
    throw error;
  }
}

/**
 * Enriches server data with GitHub metadata
 * @param {string} githubUrl GitHub repository URL
 * @param {boolean} includeReadme Whether to include README data
 * @returns {Promise<Object>} GitHub metadata
 */
async function enrichWithGitHubData(githubUrl, includeReadme = true) {
  try {
    // Extract owner/repo from GitHub URL
    const githubUrlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = githubUrl.match(githubUrlPattern);
    
    if (!match) {
      console.warn(`Invalid GitHub URL format: ${githubUrl}`);
      return {};
    }
    
    const [, owner, repo] = match;
    
    // Check cache first
    const cacheKey = `${owner}/${repo}`;
    if (readmeCache.has(cacheKey)) {
      console.log(`Using cached data for ${cacheKey}`);
      return readmeCache.get(cacheKey);
    }
    
    // Initialize enriched data structure
    const enrichedData = {
      stars: 0,
      forks: 0,
      open_issues: 0,
      last_updated: null,
      description: '',
      homepage: '',
      default_branch: 'main',
      license: null
    };
    
    // First try to get basic repo info from public API
    try {
      // Use raw GitHub URL to get basic repository info without auth
      console.log(`Fetching repository data for ${owner}/${repo}`);
      
      // For description and metadata, try the raw GitHub page
      const rawGitHubUrl = `https://github.com/${owner}/${repo}`;
      const response = await fetch(rawGitHubUrl);
      
      if (response.ok) {
        const html = await response.text();
        
        // Extract description from HTML (simple approach)
        const descriptionMatch = html.match(/<title>([^<]+)<\/title>/) || 
                               html.match(/<meta name="description" content="([^"]+)"/); 
        if (descriptionMatch && descriptionMatch[1]) {
          enrichedData.description = descriptionMatch[1].replace(`${owner}/${repo}: `, '').trim();
        }
        
        // Look for star count
        const starsMatch = html.match(/aria-label="([0-9,]+) users starred this repository"/i) ||
                        html.match(/([0-9,]+)\s*stars/i);
        if (starsMatch && starsMatch[1]) {
          enrichedData.stars = parseInt(starsMatch[1].replace(/,/g, '')) || 0;
        }
        
        // Look for fork count
        const forksMatch = html.match(/aria-label="([0-9,]+) users forked this repository"/i) ||
                        html.match(/([0-9,]+)\s*forks/i);
        if (forksMatch && forksMatch[1]) {
          enrichedData.forks = parseInt(forksMatch[1].replace(/,/g, '')) || 0;
        }
        
        // Set last updated to current time as we don't have exact time
        enrichedData.last_updated = new Date().toISOString();
      } else {
        console.warn(`Could not fetch raw GitHub page: ${response.status} ${response.statusText}`);
      }
    } catch (basicInfoError) {
      console.error(`Error fetching basic repository info for ${owner}/${repo}:`, basicInfoError);
      // Continue with empty data
    }
    
    // Try GitHub API with auth if available as a fallback
    if (process.env.GITHUB_API_TOKEN && (!enrichedData.description || enrichedData.stars === 0)) {
      try {
        const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const headers = {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${process.env.GITHUB_API_TOKEN}`
        };

        console.log(`Trying GitHub API for ${owner}/${repo}`);
        const apiResponse = await fetch(repoApiUrl, { headers });
        
        if (apiResponse.ok) {
          const repoData = await apiResponse.json();
          
          // Update with API data
          enrichedData.stars = repoData.stargazers_count || enrichedData.stars;
          enrichedData.forks = repoData.forks_count || enrichedData.forks;
          enrichedData.open_issues = repoData.open_issues_count || 0;
          enrichedData.last_updated = repoData.updated_at || enrichedData.last_updated;
          enrichedData.description = repoData.description || enrichedData.description;
          enrichedData.homepage = repoData.homepage || '';
          enrichedData.default_branch = repoData.default_branch || 'main';
          enrichedData.license = repoData.license ? repoData.license.name : null;
        } else {
          if (apiResponse.status === 403 && apiResponse.headers.get('x-ratelimit-remaining') === '0') {
            const resetTime = new Date(parseInt(apiResponse.headers.get('x-ratelimit-reset')) * 1000);
            console.error(`GitHub API rate limit exceeded. Reset at ${resetTime}`);
          } else {
            console.warn(`GitHub API error: ${apiResponse.status} ${apiResponse.statusText}`);
          }
          // Continue with data we already have
        }
      } catch (apiError) {
        console.error(`Error using GitHub API for ${owner}/${repo}:`, apiError);
        // Continue with data we already have
      }
    }
    
    // If README parsing is requested
    if (includeReadme) {
      try {
        console.log(`Extracting README data for ${owner}/${repo}`);
        const readmeData = await extractReadmeData(owner, repo);
        
        if (readmeData) {
          enrichedData.readme = {
            overview: readmeData.overview || '',
            installation: readmeData.installation ? {
              instructions: readmeData.installation.instructions || '',
              code_blocks: readmeData.installation.codeBlocks || []
            } : null,
            api: readmeData.api ? {
              documentation: readmeData.api.documentation || '',
              endpoints: readmeData.api.endpoints || []
            } : null,
            compatibility: readmeData.compatibility ? {
              info: readmeData.compatibility.compatibility || '',
              platforms: readmeData.compatibility.platforms || []
            } : null,
            changelog: readmeData.changelog ? {
              content: readmeData.changelog.changelog || '',
              versions: readmeData.changelog.versions || []
            } : null
          };
        }
      } catch (readmeError) {
        console.error(`Error extracting README data for ${owner}/${repo}:`, readmeError);
        // Continue with partial data even if README extraction fails
      }
    }
    
    // Store in cache to prevent redundant API calls
    readmeCache.set(cacheKey, enrichedData);
    
    return enrichedData;
  } catch (error) {
    console.error(`Error enriching GitHub data for ${githubUrl}:`, error);
    return {};
  }
}

/**
 * Process GitHub README data and update server record
 * @param {string} serverId Server ID
 * @param {string} githubUrl GitHub repository URL
 * @param {boolean} dryRun If true, don't update database
 * @returns {Promise<Object>} Result of the update operation
 */
async function processAndUpdateReadmeData(serverId, githubUrl, dryRun = false) {
  try {
    if (!serverId || !githubUrl) {
      console.warn('Missing serverId or githubUrl for README processing');
      return { success: false, error: 'Missing required parameters' };
    }
    
    console.log(`Processing README data for server ${serverId} (${githubUrl})${dryRun ? ' (DRY RUN)' : ''}`);
    
    // Get enriched data including README
    const enrichedData = await enrichWithGitHubData(githubUrl, true);
    
    if (!enrichedData || !enrichedData.readme) {
      console.warn(`No README data found for ${githubUrl}`);
      return { success: false, error: 'No README data found' };
    }
    
    let updateResult = { data: null, error: null };
    
    if (dryRun) {
      console.log('Skipping database update in dry run mode');
    } else {
      // Update server record with README data
      updateResult = await supabase
        .from('servers')
        .update({
          readme_overview: enrichedData.readme.overview || null,
          readme_last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', serverId);
      
      if (updateResult.error) {
        console.error('Error updating server with README data:', updateResult.error);
        return { success: false, error: updateResult.error };
      }
    }
    
    // Store installation instructions directly in the servers table
    if (enrichedData.readme.installation) {
      if (dryRun) {
        console.log('Would store installation instructions (dry run)');
      } else {
        const { error: installError } = await supabase
          .from('servers')
          .update({
            install_instructions: enrichedData.readme.installation.instructions || null,
            install_code_blocks: enrichedData.readme.installation.code_blocks ? 
              JSON.stringify(enrichedData.readme.installation.code_blocks) : '[]',
            updated_at: new Date().toISOString()
          })
          .eq('id', serverId);
        
        if (installError) {
          console.error('Error storing installation instructions:', installError);
        }
      }
    }
    
    // Store API documentation if available
    if (enrichedData.readme.api && 
        enrichedData.readme.api.documentation) {
      
      if (dryRun) {
        console.log('Would store API documentation (dry run)');
      } else {
        const { error: apiError } = await supabase
          .from('server_api_documentation')
          .upsert({
            server_id: serverId,
            documentation: enrichedData.readme.api.documentation,
            endpoints: enrichedData.readme.api.endpoints || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'server_id' });
        
        if (apiError) {
          console.error('Error storing API documentation:', apiError);
        }
      }
    }
    
    // Store compatibility info if available
    if (enrichedData.readme.compatibility && 
        (enrichedData.readme.compatibility.info || 
         enrichedData.readme.compatibility.platforms.length > 0)) {
      
      if (dryRun) {
        console.log('Would store compatibility info (dry run)');
      } else {
        const { error: compatError } = await supabase
          .from('server_compatibility')
          .upsert({
            server_id: serverId,
            compatibility_info: enrichedData.readme.compatibility.info,
            platforms: enrichedData.readme.compatibility.platforms,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'server_id' });
        
        if (compatError) {
          console.error('Error storing compatibility info:', compatError);
        }
      }
    }
    
    return { 
      success: true, 
      message: dryRun ? 'Successfully processed README data (dry run)' : 'Successfully processed and updated README data',
      data: enrichedData.readme
    };
  } catch (error) {
    console.error(`Error processing README data for ${githubUrl}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Processes all servers with GitHub URLs and updates their README data
 * @param {number} limit Maximum number of servers to process
 * @param {boolean} dryRun If true, don't update database
 * @returns {Promise<Object>} Processing statistics
 */
async function processAllServerReadmes(limit = 50, dryRun = false) {
  try {
    console.log(`Processing README data for up to ${limit} servers${dryRun ? ' (DRY RUN)' : ''}...`);
    
    // Get servers with GitHub URLs
    const { data: servers, error } = await supabase
      .from('servers')
      .select('id, github_url, name')
      .not('github_url', 'is', null)
      .limit(limit);
    
    if (error) {
      console.error('Error fetching servers with GitHub URLs:', error);
      return { success: false, error };
    }
    
    console.log(`Found ${servers.length} servers with GitHub URLs`);
    
    const results = {
      total: servers.length,
      success: 0,
      failed: 0,
      details: []
    };
    
    // Process each server with delay to avoid rate limiting
    for (const server of servers) {
      try {
        console.log(`Processing server: ${server.name} (${server.id})${dryRun ? ' (DRY RUN)' : ''}`);
        
        const result = await processAndUpdateReadmeData(server.id, server.github_url, dryRun);
        
        results.details.push({
          id: server.id,
          name: server.name,
          github_url: server.github_url,
          success: result.success,
          message: result.message || result.error
        });
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (serverError) {
        console.error(`Error processing server ${server.id}:`, serverError);
        results.failed++;
        results.details.push({
          id: server.id,
          name: server.name,
          github_url: server.github_url,
          success: false,
          message: serverError.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error processing server READMEs:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  supabase,
  serverExists,
  insertServer,
  enrichWithGitHubData,
  processAndUpdateReadmeData,
  processAllServerReadmes
};
