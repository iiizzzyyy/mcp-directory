/**
 * API client utilities for the MCP Directory
 * Provides consistent API access methods with proper error handling
 */

import { mockServers } from './mock-data';

// Types for server data
export type HealthStatus = 'online' | 'offline' | 'degraded' | 'unknown';

export interface Server {
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
      slug: null
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

/**
 * Get a server by ID
 * 
 * @param id - Server ID
 * @returns Promise with server details
 */
export async function getServerById(id: string): Promise<Server | null> {
  try {
    const apiUrl = new URL(`${window.location.origin}/api/servers/${id}`);
    
    console.log('Fetching server details from API:', apiUrl.toString());
    
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch server details: ${response.status}`);
    }
    
    const data = await response.json();
    return data.server as Server;
    
  } catch (error) {
    console.error('Error fetching server details:', error);
    
    // Fallback to mock data for the specific server
    console.log('Falling back to mock data for server details');
    const mockServer = mockServers.find(server => server.id === id);
    
    // Convert mock data to match our Server interface
    if (mockServer) {
      return {
        id: mockServer.id,
        name: mockServer.name,
        description: mockServer.description,
        category: mockServer.category,
        tags: mockServer.tags,
        platform: mockServer.platform,
        install_method: mockServer.install_method,
        stars: mockServer.stars,
        health_status: mockServer.health_status as HealthStatus,
        last_checked: mockServer.last_updated, // Map last_updated to last_checked
        github_url: mockServer.github_url,
        slug: null
      };
    }
    
    return null;
  }
}
