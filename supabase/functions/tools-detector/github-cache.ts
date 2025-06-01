// GitHub caching utility for optimized repository access
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GitHub API token for authenticated requests
const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';

// Default cache expiration in hours
const DEFAULT_CACHE_HOURS = 24;

/**
 * Cached GitHub API client
 * 
 * Reduces API calls by caching responses in the database
 */
export class GitHubCache {
  /**
   * Get repository content with caching
   * 
   * @param owner Repository owner
   * @param repo Repository name
   * @param path Path within the repository
   * @returns Repository content
   */
  static async getRepositoryContent(
    owner: string, 
    repo: string, 
    path: string
  ): Promise<any> {
    // Check cache first
    const cachedContent = await GitHubCache.getFromCache(owner, repo, path);
    if (cachedContent) {
      console.log(`Cache hit for ${owner}/${repo}/${path}`);
      return cachedContent;
    }
    
    console.log(`Cache miss for ${owner}/${repo}/${path}, fetching from GitHub API`);
    
    // Fetch from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-Directory-Tools-Detector',
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    // Get ETag and Last-Modified headers for conditional requests
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');
    
    // Parse response
    const content = await response.json();
    
    // Store in cache
    await GitHubCache.storeInCache(owner, repo, path, content, etag, lastModified);
    
    return content;
  }
  
  /**
   * Get repository file content with caching
   * 
   * @param owner Repository owner
   * @param repo Repository name
   * @param path Path within the repository
   * @returns File content
   */
  static async getFileContent(
    owner: string, 
    repo: string, 
    path: string
  ): Promise<string> {
    const content = await GitHubCache.getRepositoryContent(owner, repo, path);
    
    // Check if it's a file (has content property)
    if (!content.content) {
      throw new Error(`${path} is not a file or has no content`);
    }
    
    // Decode base64 content
    return atob(content.content.replace(/\n/g, ''));
  }
  
  /**
   * Search repository for files with caching
   * 
   * @param owner Repository owner
   * @param repo Repository name
   * @param query Search query
   * @returns Search results
   */
  static async searchRepository(
    owner: string, 
    repo: string, 
    query: string
  ): Promise<any> {
    // Cache key for search results
    const path = `_search/${query.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Check cache first
    const cachedContent = await GitHubCache.getFromCache(owner, repo, path);
    if (cachedContent) {
      console.log(`Cache hit for search: ${owner}/${repo} - ${query}`);
      return cachedContent;
    }
    
    console.log(`Cache miss for search: ${owner}/${repo} - ${query}, fetching from GitHub API`);
    
    // Fetch from GitHub API
    const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${repo}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-Directory-Tools-Detector',
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    // Get ETag and Last-Modified headers for conditional requests
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');
    
    // Parse response
    const content = await response.json();
    
    // Store in cache with shorter expiration (searches can get outdated)
    await GitHubCache.storeInCache(owner, repo, path, content, etag, lastModified, 12);
    
    return content;
  }
  
  /**
   * Get content from cache
   * 
   * @param owner Repository owner
   * @param repo Repository name
   * @param path Path within the repository
   * @returns Cached content or null if not found
   */
  private static async getFromCache(
    owner: string, 
    repo: string, 
    path: string
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('github_cache')
        .select('content, etag, last_modified')
        .eq('repo_owner', owner)
        .eq('repo_name', repo)
        .eq('repo_path', path)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching from cache:', error);
        return null;
      }
      
      return data?.content || null;
    } catch (err) {
      console.error('Cache access error:', err);
      return null;
    }
  }
  
  /**
   * Store content in cache
   * 
   * @param owner Repository owner
   * @param repo Repository name
   * @param path Path within the repository
   * @param content Content to cache
   * @param etag ETag header for conditional requests
   * @param lastModified Last-Modified header for conditional requests
   * @param expirationHours Hours until cache expiration (default: 24)
   */
  private static async storeInCache(
    owner: string, 
    repo: string, 
    path: string, 
    content: any,
    etag: string | null,
    lastModified: string | null,
    expirationHours: number = DEFAULT_CACHE_HOURS
  ): Promise<void> {
    try {
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);
      
      // Upsert into cache table
      const { error } = await supabase
        .from('github_cache')
        .upsert({
          repo_owner: owner,
          repo_name: repo,
          repo_path: path,
          content,
          etag: etag || null,
          last_modified: lastModified || null,
          updated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'repo_owner,repo_name,repo_path'
        });
      
      if (error) {
        console.error('Error storing in cache:', error);
      }
    } catch (err) {
      console.error('Cache storage error:', err);
    }
  }
}
