"use client";

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2, Terminal, ExternalLink, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Tool parameter interface representing a parameter for an MCP tool
 */
interface ToolParameter {
  id: string;
  name: string;
  description?: string;
  type: string;
  required: boolean;
}

/**
 * Tool interface representing an MCP server tool/endpoint
 */
interface Tool {
  id: string;
  name: string;
  description?: string;
  method: string;
  endpoint: string;
  detection_source?: string;
  parameters?: ToolParameter[];
  // For backward compatibility with old tools data
  params?: Record<string, any>;
}

interface ClientToolsTabProps {
  tools: Tool[];
  serverId: string;
  serverName: string;
}

/**
 * Client component that handles the interactive elements of the tools tab
 * Works with ServerTools which fetches data server-side
 */
export default function ClientToolsTab({ tools, serverId, serverName }: ClientToolsTabProps) {
  const { toast } = useToast();
  const [runningTools, setRunningTools] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({});

  const handleRunTool = async (tool: Tool) => {
    try {
      // Reset any previous results/errors for this tool
      setToolErrors(prev => ({ ...prev, [tool.id]: '' }));
      setResults(prev => ({ ...prev, [tool.id]: null }));
      
      // Mark the tool as running
      setRunningTools(prev => ({ ...prev, [tool.id]: true }));
      
      // Build the request URL and options based on the tool configuration
      const url = tool.endpoint.startsWith('/') 
        ? `${window.location.origin}${tool.endpoint}` 
        : tool.endpoint;
      
      const options: RequestInit = {
        method: tool.method || 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      };
      
      // Add request body if it's a POST request and we have params
      if (options.method === 'POST' && (tool.params || tool.parameters)) {
        options.body = JSON.stringify({
          ...tool.params,
          serverId: serverId
        });
      }
      
      // Make the API call
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Parse the response
      const result = await response.json();
      
      // Store the result
      setResults(prev => ({ ...prev, [tool.id]: result }));
      
      // Show success toast
      toast({
        title: "Tool executed successfully",
        description: `The ${tool.name} tool completed successfully.`,
      });
    } catch (error) {
      console.error(`Error running tool ${tool.id}:`, error);
      
      // Store the error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setToolErrors(prev => ({ ...prev, [tool.id]: errorMessage }));
      
      // Show error toast
      toast({
        variant: "destructive",
        title: "Tool execution failed",
        description: errorMessage,
      });
    } finally {
      // Mark the tool as no longer running
      setRunningTools(prev => ({ ...prev, [tool.id]: false }));
    }
  };

  // Tools display
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Tools</h2>
        <p className="text-muted-foreground mt-1">
          Available tools for {serverName} MCP server
        </p>
      </div>

      <div className="space-y-6">
        {tools.map((tool) => (
          <Card key={tool.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-orange-500">
                    {tool.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {tool.description || 'No description available'}
                  </CardDescription>
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => handleRunTool(tool)}
                  disabled={runningTools[tool.id]}
                >
                  {runningTools[tool.id] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Terminal className="mr-2 h-4 w-4" />
                      Run
                    </>
                  )}
                </Button>
              </div>
              {tool.detection_source && (
                <Badge variant="outline" className="mt-2">
                  {tool.detection_source.replace(/_/g, ' ')}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Endpoint</h4>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {tool.method} {tool.endpoint}
                  </p>
                </div>
                
                {tool.parameters && tool.parameters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                    <div className="space-y-2">
                      {tool.parameters.map((param, idx) => (
                        <div key={idx} className="flex items-start p-2 rounded border border-border">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-mono text-sm">{param.name}</span>
                              {param.required && (
                                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                              )}
                            </div>
                            {param.description && (
                              <p className="text-xs text-muted-foreground mt-1">{param.description}</p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {param.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Display results if available */}
              {results[tool.id] && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Tool execution result:</span>
                  </div>
                  <Card className="bg-muted/50 border">
                    <CardContent className="p-3 overflow-x-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {typeof results[tool.id] === 'string'
                          ? results[tool.id]
                          : JSON.stringify(results[tool.id], null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Display errors if any */}
              {toolErrors[tool.id] && (
                <div className="mt-4 pt-4 border-t">
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="text-xs">
                      {toolErrors[tool.id]}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
