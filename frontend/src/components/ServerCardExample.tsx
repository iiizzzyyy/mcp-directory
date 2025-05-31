import React from 'react';
import ServerCard from './ServerCard';

/**
 * Example component showing how to use ServerCard in a grid layout
 */
export const ServerCardExample: React.FC = () => {
  // Example handler for card clicks
  const handleCardClick = (serverName: string) => {
    console.log(`Navigating to server details for: ${serverName}`);
    // In a real app, this would use router navigation, e.g.:
    // router.push(`/server/${serverId}`);
  };

  // Example server data
  const servers = [
    {
      id: '1',
      name: 'Supabase Server',
      description: 'Provides real-time Postgres access via MCP with support for authentication, storage, and serverless functions.',
      tags: ['database', 'realtime', 'typescript'],
      healthStatus: 'online' as const,
      stars: 3200,
      platform: 'GitHub',
      installMethod: 'Docker',
      lastChecked: '2025-05-29T10:00:00Z',
    },
    {
      id: '2',
      name: 'Firecrawl MCP',
      description: 'Web scraping and content extraction server for MCP clients.',
      tags: ['scraping', 'extraction', 'web'],
      healthStatus: 'degraded' as const,
      stars: 1250,
      platform: 'Cursor',
      installMethod: 'NPM',
      lastChecked: '2025-05-29T10:30:00Z',
    },
    {
      id: '3',
      name: 'Netlify MCP Server',
      description: 'Deployment and hosting services with serverless functions and form handling.',
      tags: ['hosting', 'deployment', 'frontend'],
      healthStatus: 'maintenance' as const,
      stars: 2800,
      platform: 'GitHub',
      installMethod: 'CLI',
      lastChecked: '2025-05-29T09:15:00Z',
    },
    {
      id: '4',
      name: 'MongoDB MCP',
      description: 'Document database access with real-time updates and query capabilities.',
      tags: ['database', 'nosql', 'javascript'],
      healthStatus: 'offline' as const,
      stars: 4500,
      platform: 'VSCode',
      installMethod: 'Docker',
      lastChecked: '2025-05-29T08:45:00Z',
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">MCP Server Directory</h1>
      
      {/* Anonymous user message */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6 text-sm text-blue-700">
        You're browsing without an account — some features like favorites are disabled.
      </div>
      
      {/* Responsive grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {servers.map((server) => (
          <ServerCard
            key={server.id}
            name={server.name}
            description={server.description}
            tags={server.tags}
            healthStatus={server.healthStatus}
            stars={server.stars}
            platform={server.platform}
            installMethod={server.installMethod}
            lastChecked={server.lastChecked}
            onClick={() => handleCardClick(server.name)}
          />
        ))}
      </div>
    </div>
  );
};

export default ServerCardExample;
