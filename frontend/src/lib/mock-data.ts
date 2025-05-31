/**
 * Mock data provider for the MCP Directory
 * Used when the application is statically exported
 */

// Mock server data
export const mockServers = [
  {
    id: 'server-1',
    name: 'Pulse Auth MCP',
    description: 'Authentication and authorization server for the Model Context Protocol.',
    category: 'auth',
    tags: ['auth', 'security', 'identity'],
    platform: 'nodejs',
    install_method: 'npm',
    github_url: 'https://github.com/mcp-directory/pulse-auth',
    stars: 249,
    forks: 37,
    open_issues: 12,
    contributors: 8,
    last_updated: '2025-05-01T10:30:00Z',
    health_status: 'online',
  },
  {
    id: 'server-2',
    name: 'Pulse Vector DB',
    description: 'Vector database server for Model Context Protocol applications with semantic search capabilities.',
    category: 'database',
    tags: ['vector-db', 'search', 'embeddings'],
    platform: 'python',
    install_method: 'pip',
    github_url: 'https://github.com/mcp-directory/pulse-vector',
    stars: 412,
    forks: 61,
    open_issues: 18,
    contributors: 15,
    last_updated: '2025-05-10T15:45:00Z',
    health_status: 'online',
  },
  {
    id: 'server-3',
    name: 'Pulse Speech MCP',
    description: 'Speech recognition and synthesis server for the Model Context Protocol.',
    category: 'speech',
    tags: ['speech', 'audio', 'recognition'],
    platform: 'python',
    install_method: 'docker',
    github_url: 'https://github.com/mcp-directory/pulse-speech',
    stars: 178,
    forks: 29,
    open_issues: 8,
    contributors: 6,
    last_updated: '2025-04-15T09:20:00Z',
    health_status: 'degraded',
  },
  {
    id: 'server-4',
    name: 'Brave Search MCP',
    description: 'Web search connector for Brave Search API with RAG capabilities.',
    category: 'search',
    tags: ['search', 'web', 'rag'],
    platform: 'nodejs',
    install_method: 'npm',
    github_url: 'https://github.com/brave/search-mcp',
    stars: 312,
    forks: 47,
    open_issues: 21,
    contributors: 9,
    last_updated: '2025-05-18T12:10:00Z',
    health_status: 'online',
  }
];

// Mock metric data - generates random performance metrics
export const generateMockMetrics = (serverId: string, period: string = '7d') => {
  const now = new Date();
  const dataPoints = period === '1h' ? 12 : 
                   period === '6h' ? 24 : 
                   period === '12h' ? 24 : 
                   period === '1d' ? 24 : 
                   period === '7d' ? 28 : 
                   period === '30d' ? 30 : 90;
  
  const latencyBase = serverId.includes('vector') ? 250 : 
                     serverId.includes('speech') ? 450 : 
                     serverId.includes('auth') ? 150 : 200;
  
  const memoryBase = serverId.includes('vector') ? 800 : 
                    serverId.includes('speech') ? 1200 : 
                    serverId.includes('auth') ? 400 : 600;
  
  // Generate data points with realistic patterns
  const data = Array.from({ length: dataPoints }, (_, i) => {
    // Create time series with decreasing time intervals
    const timeOffset = period === '1h' ? i * 5 * 60 * 1000 : 
                      period === '6h' ? i * 15 * 60 * 1000 : 
                      period === '12h' ? i * 30 * 60 * 1000 : 
                      period === '1d' ? i * 60 * 60 * 1000 : 
                      period === '7d' ? i * 6 * 60 * 60 * 1000 : 
                      period === '30d' ? i * 24 * 60 * 60 * 1000 : i * 24 * 60 * 60 * 1000;
    
    const time = new Date(now.getTime() - timeOffset);
    
    // Add some realistic variance to the metrics
    const variance = Math.sin(i / 5) * 0.2 + Math.random() * 0.1;
    const latency = Math.round(latencyBase * (1 + variance));
    const memory = Math.round(memoryBase * (1 + variance));
    const throughput = Math.round((1000 / latency) * 20 * (1 + Math.random() * 0.2));
    
    // Simulate some uptime issues for the degraded server
    const uptime = serverId.includes('speech') && i % 10 === 0 ? 0.95 : 0.999;
    
    return {
      timestamp: time.toISOString(),
      latency_ms: latency,
      memory_mb: memory,
      throughput: throughput,
      uptime: uptime
    };
  });
  
  return data;
};

// Mock health data
export const mockHealthData = {
  'server-1': { status: 'online', last_check_time: new Date().toISOString(), response_time_ms: 124 },
  'server-2': { status: 'online', last_check_time: new Date().toISOString(), response_time_ms: 238 },
  'server-3': { status: 'degraded', last_check_time: new Date().toISOString(), response_time_ms: 612 },
  'server-4': { status: 'online', last_check_time: new Date().toISOString(), response_time_ms: 187 },
};

// Helper to determine if we should use mock data (in static export)
export const shouldUseMockData = () => {
  return true; // For static export, always use mock data
};
