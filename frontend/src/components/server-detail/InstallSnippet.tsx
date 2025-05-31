import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';

interface InstallSnippetProps {
  serverName: string;
  installMethod?: string;
  platform?: string;
  customSnippets?: Record<string, string>;
}

/**
 * InstallSnippet - Component for displaying installation instructions
 * 
 * Shows installation commands for different methods (CLI, Docker, NPM)
 * with syntax highlighting and copy functionality
 */
export const InstallSnippet: React.FC<InstallSnippetProps> = ({
  serverName,
  installMethod,
  platform,
  customSnippets
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const serverSlug = serverName?.toLowerCase().replace(/[^a-z0-9]/g, '-');

  // Default snippets based on install method
  const getDefaultSnippet = (method: string): string => {
    switch (method?.toLowerCase()) {
      case 'cli':
        return `# Install via CLI\nmcp install ${serverSlug}`;
      case 'docker':
        return `# Pull the Docker image\ndocker pull mcpserver/${serverSlug}\n\n# Run the container\ndocker run -p 8080:8080 mcpserver/${serverSlug}`;
      case 'npm':
        return `# Install via npm\nnpm install @mcpserver/${serverSlug}`;
      default:
        return `# Install MCP server\nmcp install ${serverSlug}`;
    }
  };

  // Determine available install methods
  const getInstallMethods = (): string[] => {
    const methods = new Set<string>();
    
    // Add default method if specified
    if (installMethod) {
      methods.add(installMethod.toLowerCase());
    }
    
    // Add common methods
    methods.add('cli');
    methods.add('docker');
    
    // Add from custom snippets if provided
    if (customSnippets) {
      Object.keys(customSnippets).forEach(key => methods.add(key.toLowerCase()));
    }
    
    return Array.from(methods);
  };

  const installMethods = getInstallMethods();
  const defaultTab = installMethod?.toLowerCase() || installMethods[0];

  // Handle copy to clipboard
  const copyToClipboard = (method: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopied(method);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(null);
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Installation</span>
          {platform && (
            <span className="text-sm text-muted-foreground">
              {platform}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-2">
            {installMethods.map(method => (
              <TabsTrigger key={method} value={method} className="capitalize">
                {method}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {installMethods.map(method => {
            // Get snippet from custom snippets or fallback to default
            const snippet = (customSnippets && customSnippets[method]) || 
              getDefaultSnippet(method);
              
            return (
              <TabsContent key={method} value={method} className="relative">
                <div className="relative">
                  <pre className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 overflow-x-auto text-sm font-mono">
                    {snippet}
                  </pre>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(method, snippet)}
                  >
                    {copied === method ? (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InstallSnippet;
