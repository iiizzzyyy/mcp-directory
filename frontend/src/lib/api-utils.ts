/**
 * Utility functions for API interactions
 */

/**
 * Returns the base API URL for server requests
 * Uses environment variables to determine the correct URL in different environments
 */
export function getApiUrl(): string {
  // Use NEXT_PUBLIC_SUPABASE_URL from environment if available
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mcp-directory.vercel.app';
  
  // Ensure the URL is properly formatted with protocol
  if (!baseUrl.startsWith('http')) {
    return `https://${baseUrl}`;
  }
  
  return baseUrl;
}

/**
 * Builds a complete API endpoint URL
 * 
 * @param path The API path to append to the base URL
 * @returns The complete API URL
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiUrl();
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${apiPath}`;
}

/**
 * Default headers for API requests
 */
export const defaultHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Creates a fetch request with authentication token if available
 * 
 * @param token Optional authentication token
 * @returns Fetch options with authorization header
 */
export function createAuthenticatedRequest(token?: string): RequestInit {
  const headers: HeadersInit = { ...defaultHeaders };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return {
    headers,
  };
}
