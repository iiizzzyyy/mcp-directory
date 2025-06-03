import React, { useState } from 'react';
import { Search, Zap, Code, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Server } from '@/lib/types';

interface ClientOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  installCode: (serverName: string, serverId: string) => string;
}

interface InstallationPanelProps {
  server: Server;
}

/**
 * InstallationPanel component - Smithery-inspired installation panel with client-specific options
 * Part of the XOM-104 Smithery UI redesign
 */
const InstallationPanel: React.FC<InstallationPanelProps> = ({ server }) => {
  const [installType, setInstallType] = useState<'auto' | 'json' | 'url'>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedClient, setCopiedClient] = useState<string | null>(null);
  
  // List of available clients with their installation instructions
  const clients: ClientOption[] = [
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      icon: (
        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
          <span className="text-white font-bold">C</span>
        </div>
      ),
      installCode: (name, id) => `Use Claude Desktop Settings > Server Manager > Add Server to install:
Name: ${name}
URL: https://mcp.xomatic.ai/servers/${id}`
    },
    {
      id: 'raycast',
      name: 'Raycast',
      icon: (
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
          <span className="text-white font-bold">R</span>
        </div>
      ),
      installCode: (name, id) => `Raycast > Extensions > + > Add Server > enter:
Name: ${name}
URL: https://mcp.xomatic.ai/servers/${id}`
    },
    {
      id: 'cursor',
      name: 'Cursor',
      icon: (
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
          <span className="text-white font-bold">C</span>
        </div>
      ),
      installCode: (name, id) => `cursor://servers/add?url=https://mcp.xomatic.ai/servers/${id}&name=${encodeURIComponent(name)}`
    },
    {
      id: 'tome',
      name: 'Tome',
      icon: (
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
          <span className="text-white font-bold">T</span>
        </div>
      ),
      installCode: (name, id) => `Tome > Settings > MCP Servers > Add Server:
Name: ${name}
URL: https://mcp.xomatic.ai/servers/${id}`
    },
    {
      id: 'vscode',
      name: 'VS Code',
      icon: (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold">VS</span>
        </div>
      ),
      installCode: (name, id) => `In VS Code:
1. Open Command Palette (Ctrl+Shift+P)
2. Search for "MCP: Add Server"
3. Enter Name: ${name}
4. Enter URL: https://mcp.xomatic.ai/servers/${id}`
    },
    {
      id: 'cline',
      name: 'Cline',
      icon: (
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
          <span className="text-white font-bold">CL</span>
        </div>
      ),
      installCode: (name, id) => `In Cline terminal:
:server add ${name} https://mcp.xomatic.ai/servers/${id}`
    },
    {
      id: 'windsurf',
      name: 'Windsurf',
      icon: (
        <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
          <span className="text-white font-bold">W</span>
        </div>
      ),
      installCode: (name, id) => `In Windsurf:
Settings > MCP Servers > Add Server:
Name: ${name}
URL: https://mcp.xomatic.ai/servers/${id}`
    },
  ];

  // Get client specific installation instructions from server data
  const getClientOptions = () => {
    // Use server's client_install_instructions if available, otherwise fall back to default clients
    if (server.client_install_instructions && Object.keys(server.client_install_instructions).length > 0) {
      return Object.entries(server.client_install_instructions).map(([clientId, clientData]: [string, any]) => ({
        id: clientId,
        name: clientData.name || clientId,
        icon: getClientIcon(clientId, clientData.name || clientId),
        installCode: (name: string, id: string) => clientData.installCode || ''
      }));
    }
    return clients;
  };

  // Helper to generate icon for a client
  const getClientIcon = (clientId: string, name: string) => {
    // Extract first letter for the icon
    const firstLetter = name.charAt(0).toUpperCase();
    
    // Determine background color based on client ID
    let bgColor = "bg-zinc-800";
    
    switch (clientId.toLowerCase()) {
      case 'claude-desktop':
      case 'claude':
        bgColor = "bg-amber-600";
        break;
      case 'raycast':
        bgColor = "bg-black";
        break;
      case 'cursor':
        bgColor = "bg-zinc-800";
        break;
      case 'tome':
        bgColor = "bg-purple-600";
        break;
      case 'vscode':
        bgColor = "bg-blue-600";
        break;
      case 'cline':
        bgColor = "bg-green-600";
        break;
      case 'windsurf':
        bgColor = "bg-teal-600";
        break;
      default:
        // Generate a somewhat consistent color based on the client name
        const hue = Array.from(clientId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
        bgColor = `bg-[hsl(${hue},70%,30%)]`;
    }
    
    return (
      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
        <span className="text-white font-bold">{firstLetter}</span>
      </div>
    );
  };
  
  // Get all available clients (from server data or defaults)
  const availableClients = getClientOptions();
  
  // Filter clients based on search query
  const filteredClients = availableClients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle copying installation code
  const handleCopy = (clientId: string, code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedClient(clientId);
        setTimeout(() => setCopiedClient(null), 2000);
        toast({
          title: "Installation code copied",
          description: "Ready to paste into your client",
          duration: 3000,
        });
      })
      .catch(err => {
        console.error('Failed to copy code:', err);
        toast({
          title: "Failed to copy code",
          description: "Please try again",
          variant: "destructive",
          duration: 3000,
        });
      });
  };

  // Generate JSON configuration for server
  const getJsonConfig = () => {
    // Use server's install_code_blocks if available
    if (server.install_code_blocks && server.install_code_blocks.json) {
      return server.install_code_blocks.json;
    }
    
    // Fallback to generated JSON
    const config = {
      name: server.name,
      url: `https://mcp.xomatic.ai/servers/${server.slug || server.id}`,
      description: server.description || "",
      version: server.version || "1.0.0",
      category: server.category || "other",
      platform: server.platform || "all"
    };
    return JSON.stringify(config, null, 2);
  };

  // Get URL for direct installation
  const getUrlConfig = () => {
    // Use server's install_code_blocks if available
    if (server.install_code_blocks && server.install_code_blocks.url) {
      return server.install_code_blocks.url;
    }
    
    // Fallback to generated URL
    return `https://mcp.xomatic.ai/servers/${server.slug || server.id}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-primary" />
        Install
      </h2>
      
      {/* Installation type tabs */}
      <Tabs value={installType} onValueChange={(v) => setInstallType(v as any)} className="mt-4">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-800 text-zinc-400">
          <TabsTrigger 
            value="auto" 
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
          >
            <Zap className="h-4 w-4 mr-2" />
            Auto
          </TabsTrigger>
          <TabsTrigger 
            value="json" 
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
          >
            <Code className="h-4 w-4 mr-2" />
            JSON
          </TabsTrigger>
          <TabsTrigger 
            value="url" 
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            URL
          </TabsTrigger>
        </TabsList>
        
        {/* Auto installation tab */}
        <TabsContent value="auto" className="mt-4">
          <p className="text-zinc-400 text-sm mb-4">
            Choose a client to get started with automatic installation
          </p>
          
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search clients..."
              className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredClients.map(client => (
              <div 
                key={client.id}
                className="flex items-start bg-zinc-800 rounded-md p-3 hover:bg-zinc-750 transition-colors"
              >
                <div className="mr-3 mt-1">
                  {client.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{client.name}</h3>
                  <pre className="mt-2 text-xs text-zinc-400 bg-zinc-850 p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap">
                    {client.installCode(server.name, server.slug || server.id)}
                  </pre>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="ml-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  onClick={() => handleCopy(client.id, client.installCode(server.name, server.slug || server.id))}
                >
                  {copiedClient === client.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="text-center py-6 text-zinc-500">
                No clients match your search
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* JSON config tab */}
        <TabsContent value="json" className="mt-4">
          <p className="text-zinc-400 text-sm mb-4">
            Use this JSON configuration for manual installation
          </p>
          
          <div className="relative">
            <pre className="bg-zinc-800 p-4 rounded-md text-zinc-300 text-xs font-mono overflow-x-auto whitespace-pre">
              {getJsonConfig()}
            </pre>
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute top-2 right-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
              onClick={() => handleCopy('json', getJsonConfig())}
            >
              {copiedClient === 'json' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TabsContent>
        
        {/* URL config tab */}
        <TabsContent value="url" className="mt-4">
          <p className="text-zinc-400 text-sm mb-4">
            Direct server URL for manual configuration
          </p>
          
          <div className="relative">
            <pre className="bg-zinc-800 p-4 rounded-md text-zinc-300 text-sm font-mono overflow-x-auto">
              {getUrlConfig()}
            </pre>
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute top-2 right-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
              onClick={() => handleCopy('url', getUrlConfig())}
            >
              {copiedClient === 'url' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstallationPanel;
