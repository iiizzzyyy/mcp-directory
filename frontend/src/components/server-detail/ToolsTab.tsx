"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Tool {
  id: string;
  name: string;
  description: string;
  isRunnable?: boolean;
}

interface ToolsTabProps {
  server: {
    id: string;
    name: string;
    tools?: Tool[];
  };
}

export default function ToolsTab({ server }: ToolsTabProps) {
  const [runningTool, setRunningTool] = useState<string | null>(null);

  // If no tools data is available, use these default tools based on the screenshot
  const defaultTools: Tool[] = [
    {
      id: 'resolve-library-id',
      name: 'resolve-library-id',
      description: 'Resolves a package/product name to a Context7-compatible library ID and returns a list of matching libraries.',
      isRunnable: true
    },
    {
      id: 'get-library-docs',
      name: 'get-library-docs',
      description: "Fetches up-to-date documentation for a library. You must call 'resolve-library-id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides the ID.",
      isRunnable: true
    }
  ];

  const tools = server.tools || defaultTools;

  const handleRunTool = (toolId: string) => {
    setRunningTool(toolId);
    // In a real implementation, this would trigger the tool to run
    // For now we'll just simulate it with a timeout
    setTimeout(() => {
      setRunningTool(null);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Tools</h2>
        <p className="text-gray-600 mt-1">
          Available tools for {server.name} MCP server
        </p>
      </div>

      {tools.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-gray-500">No tools available for this server.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tools.map((tool) => (
            <div key={tool.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <h3 className="font-medium text-orange-500">{tool.name}</h3>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </div>
                {tool.isRunnable && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="whitespace-nowrap ml-4 mt-1"
                    onClick={() => handleRunTool(tool.id)}
                    disabled={runningTool === tool.id}
                  >
                    {runningTool === tool.id ? 'Running...' : 'Run'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
