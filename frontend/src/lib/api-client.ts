/**
 * API client utilities for the MCP Directory
 * Provides consistent API access methods with proper error handling
 */

// Import core dependencies
// Using local mock data instead of external import
// import { mockServers } from './mock-data';

/**
 * Types for server data
 */
export type HealthStatus = 'online' | 'offline' | 'degraded' | 'unknown';
export type VerificationStatus = 'verified' | 'unverified' | 'pending' | 'unknown';

/**
 * Helper to get API URL with fallback
 */
export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || window.location.origin;
}

/**
 * Enhanced Server interface with all properties needed for Smithery-inspired UI
 */
export interface Server {
  // Basic server properties
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  platform: string | null;
  install_method: string | null;
  stars: number | null;
  health_status?: HealthStatus;
  last_checked?: string;
  slug?: string | null;
  github_url?: string;
  
  // Smithery-inspired UI properties
  monthly_tool_calls?: number;
  success_rate?: number;
  average_response_time?: number;
  active_users?: number;
  tools?: any[];
  readme_overview?: string | null;
  license?: string;
  version?: string;
  security_audit?: boolean;
  verification_status?: VerificationStatus;
  forks?: number;
  open_issues?: number;
  contributors?: number;
  last_updated?: string;
}

export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface ServerSearchResponse {
  servers: Server[];
  pagination: PaginationMeta;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  usedMockData?: boolean;
}

/**
 * Search for servers with filtering and pagination
 * 
 * @param options - Search options
 * @returns Promise with search results
 */
export async function searchServers({
  query = '',
  tags = [],
  category = '',
  platform = '',
  limit = 10,
  offset = 0,
  sort = 'stars',
  order = 'desc'
}: {
  query?: string;
  tags?: string[];
  category?: string;
  platform?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
}): Promise<ServerSearchResponse> {
  try {
    // Construct API URL
    const apiUrl = new URL(`${window.location.origin}/api/servers/search`);
    
    // Add search parameters
    if (query) apiUrl.searchParams.set('q', query);
    
    // Add each tag as a separate parameter
    tags.forEach(tag => apiUrl.searchParams.append('tag', tag));
    
    if (category) apiUrl.searchParams.set('category', category);
    if (platform) apiUrl.searchParams.set('platform', platform);
    
    // Add pagination and sorting
    apiUrl.searchParams.set('limit', limit.toString());
    apiUrl.searchParams.set('offset', offset.toString());
    apiUrl.searchParams.set('sort', sort);
    apiUrl.searchParams.set('order', order);
    
    console.log('Fetching servers from API:', apiUrl.toString());
    
    // Make the API request
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch servers: ${response.status}`);
    }
    
    // Parse the response
    const data = await response.json();
    return data as ServerSearchResponse;
    
  } catch (error) {
    console.error('Error fetching servers:', error);
    
    // Fallback to mock data in case of errors
    console.log('Falling back to mock data due to API error');
    
    // Filter mock data based on search parameters
    let filteredServers = [...mockServers];
    
    // Apply search filtering
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredServers = filteredServers.filter(server => 
        (server.name?.toLowerCase().includes(lowerQuery)) || 
        (server.description?.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Apply tag filtering
    if (tags.length > 0) {
      filteredServers = filteredServers.filter(server => 
        server.tags?.some(tag => tags.includes(tag))
      );
    }
    
    // Apply category filtering
    if (category) {
      filteredServers = filteredServers.filter(server => 
        server.category === category
      );
    }
    
    // Apply platform filtering
    if (platform) {
      filteredServers = filteredServers.filter(server => 
        server.platform === platform
      );
    }
    
    // Apply sorting
    filteredServers.sort((a, b) => {
      // Safely access property with proper null checking
      const aValue = a[sort as keyof typeof a] ?? 0;
      const bValue = b[sort as keyof typeof b] ?? 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return order === 'asc' 
        ? (Number(aValue)) - (Number(bValue)) 
        : (Number(bValue)) - (Number(aValue));
    });
    
    // Apply pagination
    const paginatedServers = filteredServers.slice(offset, offset + limit);
    
    // Convert mock data to match our Server interface
    const typedServers: Server[] = paginatedServers.map(server => ({
      id: server.id,
      name: server.name,
      description: server.description,
      category: server.category,
      tags: server.tags,
      platform: server.platform,
      install_method: server.install_method,
      stars: server.stars,
      health_status: server.health_status as HealthStatus,
      last_checked: server.last_updated, // Map last_updated to last_checked
      github_url: server.github_url,
      slug: server.slug,
      monthly_tool_calls: server.monthly_tool_calls,
      success_rate: server.success_rate,
      average_response_time: server.average_response_time,
      active_users: server.active_users,
      tools: server.tools,
      readme_overview: server.readme_overview,
      license: server.license,
      version: server.version,
      security_audit: server.security_audit,
      verification_status: server.verification_status as VerificationStatus,
      forks: server.forks,
      open_issues: server.open_issues,
      contributors: server.contributors,
      last_updated: server.last_updated,
    }));
    
    // Return mock data with pagination
    return {
      servers: typedServers,
      pagination: {
        total: filteredServers.length,
        offset,
        limit,
        hasMore: offset + limit < filteredServers.length
      },
      usedMockData: true
    };
  }
}

// Define extended mock data type to match Server interface
type MockServer = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  platform: string;
  install_method: string;
  github_url: string;
  stars: number;
  forks: number;
  open_issues: number;
  contributors: number;
  last_updated: string;
  health_status: string;
  // Smithery-inspired UI properties (optional in mock data)
  monthly_tool_calls?: number;
  success_rate?: number;
  average_response_time?: number;
  active_users?: number;
  tools?: any[];
  readme_overview?: string;
  license?: string;
  version?: string;
  security_audit?: boolean;
  verification_status?: VerificationStatus;
  slug?: string;
};

// Local mock data for development
const mockServers: MockServer[] = [
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'MongoDB database access and utilities',
    category: 'Database',
    tags: ['database', 'nosql', 'document-db'],
    platform: 'node',
    install_method: 'npm',
    github_url: 'https://github.com/mongodb/node-mongodb-native',
    stars: 9800,
    forks: 2300,
    open_issues: 45,
    contributors: 420,
    last_updated: '2023-06-01T10:15:30Z',
    health_status: 'healthy',
    // Add some Smithery-inspired properties
    monthly_tool_calls: 85000,
    success_rate: 98,
    average_response_time: 120,
    active_users: 12500,
    license: 'Apache-2.0',
    version: '5.1.0',
    security_audit: true,
    verification_status: 'verified',
    slug: 'mongodb'
  },
  {
    id: 'supabase-mcp-server',
    name: 'Supabase MCP',
    description: 'Supabase database, auth, and storage for AI applications',
    category: 'Database',
    tags: ['database', 'auth', 'storage', 'postgres'],
    platform: 'web',
    install_method: 'npm',
    github_url: 'https://github.com/supabase/supabase',
    stars: 56000,
    forks: 4200,
    open_issues: 178,
    contributors: 350, 
    last_updated: '2023-05-28T14:20:10Z',
    health_status: 'healthy',
    monthly_tool_calls: 125000,
    success_rate: 99,
    average_response_time: 95,
    active_users: 25000,
    license: 'MIT',
    version: '2.0.0',
    security_audit: true,
    verification_status: 'verified',
    slug: 'supabase-mcp-server'
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Web crawling and scraping for AI agents',
    category: 'Data',
    tags: ['web', 'crawler', 'scraper'],
    platform: 'web',
    install_method: 'api',
    github_url: 'https://github.com/firecrawl/firecrawl',
    stars: 3200,
    forks: 580,
    open_issues: 32,
    contributors: 24,
    last_updated: '2023-06-02T08:45:20Z',
    health_status: 'degraded',
    monthly_tool_calls: 45000,
    success_rate: 92,
    average_response_time: 180,
    active_users: 7800,
    license: 'GPL-3.0',
    version: '0.9.5',
    security_audit: false,
    verification_status: 'pending',
    slug: 'firecrawl'
  }
];

/**
 * Get a server by ID with enhanced error handling and timeout
 * 
 * @param id - Server ID to fetch
 * @param timeout - Optional timeout in milliseconds (default: 8000)
 * @returns Promise resolving to server data
 */
export async function getServer(id: string, timeout = 8000): Promise<Server> {
  const apiUrl = new URL(`${window.location.origin}/api/servers/${id}`);
  
  // Set up request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.server) {
      // If we don't have server data in the response, fall back to mock data
      console.warn('Server API returned invalid data, falling back to mock data');
      return getFallbackServerData(id);
    }
    
    return data.server;
  } catch (error) {
    // Clean up timeout if an error occurs
    clearTimeout(timeoutId);
    
    console.error('Error fetching server:', error);
    
    // Fall back to mock data in development or for specific errors
    if (process.env.NODE_ENV === 'development' || 
        (error instanceof Error && error.name === 'AbortError')) {
      console.warn('Using mock server data after API failure');
      return getFallbackServerData(id);
    }
    
    throw error;
  }
}

/**
 * Get fallback server data for development or error recovery
 * 
 * @param id - Server ID to look up
 * @returns Server data from mock data
 */
function getFallbackServerData(id: string): Server {
  // Find the server in our mock data
  const mockServer = mockServers.find((server: any) => server.id === id);
  
  if (!mockServer) {
    throw new Error(`Server not found: ${id}`);
  }
  
  // Generate random data for missing fields to support Smithery-inspired UI
  const randomToolCalls = Math.floor(Math.random() * 100000) + 10000;
  const randomSuccessRate = Math.floor(Math.random() * 15) + 85; // 85-100%
  const randomResponseTime = Math.floor(Math.random() * 400) + 100; // 100-500ms
  const randomActiveUsers = Math.floor(Math.random() * 10000) + 1000;
  const randomForks = Math.floor(Math.random() * 100);
  const randomIssues = Math.floor(Math.random() * 50);
  const randomContributors = Math.floor(Math.random() * 20) + 1;
  
  // Convert mock data to match our Server interface with safeguards for all properties
  return {
    // Core properties
    id: mockServer.id,
    name: mockServer.name,
    description: mockServer.description || null,
    category: mockServer.category || null,
    tags: Array.isArray(mockServer.tags) ? mockServer.tags : [],
    platform: mockServer.platform || null,
    install_method: mockServer.install_method || null,
    stars: typeof mockServer.stars === 'number' ? mockServer.stars : 0,
    health_status: (mockServer.health_status as HealthStatus) || 'unknown',
    last_checked: mockServer.last_updated || new Date().toISOString(),
    github_url: mockServer.github_url || undefined,
    slug: mockServer.slug || undefined,
    
    // Smithery-inspired UI properties
    monthly_tool_calls: typeof mockServer.monthly_tool_calls === 'number' ? 
      mockServer.monthly_tool_calls : randomToolCalls,
    success_rate: typeof mockServer.success_rate === 'number' ? 
      mockServer.success_rate : randomSuccessRate,
    average_response_time: typeof mockServer.average_response_time === 'number' ? 
      mockServer.average_response_time : randomResponseTime,
    active_users: typeof mockServer.active_users === 'number' ? 
      mockServer.active_users : randomActiveUsers,
    tools: Array.isArray(mockServer.tools) ? mockServer.tools : [],
    readme_overview: mockServer.readme_overview || null,
    license: mockServer.license || 'MIT',
    version: mockServer.version || '1.0.0',
    security_audit: typeof mockServer.security_audit === 'boolean' ? 
      mockServer.security_audit : true,
    verification_status: (mockServer.verification_status as VerificationStatus) || 'unknown',
    forks: typeof mockServer.forks === 'number' ? mockServer.forks : randomForks,
    open_issues: typeof mockServer.open_issues === 'number' ? mockServer.open_issues : randomIssues,
    contributors: typeof mockServer.contributors === 'number' ? mockServer.contributors : randomContributors,
    last_updated: mockServer.last_updated || new Date().toISOString(),
  };
}
