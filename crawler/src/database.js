const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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
 * @returns {Promise<Object>} GitHub metadata
 */
async function enrichWithGitHubData(githubUrl) {
  try {
    // Extract owner/repo from GitHub URL
    const githubUrlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = githubUrl.match(githubUrlPattern);
    
    if (!match) return {};
    
    const [, owner, repo] = match;
    const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };

    // Add auth token if available
    if (process.env.GITHUB_API_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_API_TOKEN}`;
    }

    const response = await fetch(repoApiUrl, { headers });
    
    if (!response.ok) {
      console.warn(`GitHub API error: ${response.status} ${response.statusText}`);
      return {};
    }
    
    const repoData = await response.json();

    // Extract relevant data
    return {
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      open_issues: repoData.open_issues_count || 0,
      last_updated: repoData.updated_at || null
    };
  } catch (error) {
    console.error(`Error enriching GitHub data for ${githubUrl}:`, error);
    return {};
  }
}

module.exports = {
  supabase,
  serverExists,
  insertServer,
  enrichWithGitHubData
};
