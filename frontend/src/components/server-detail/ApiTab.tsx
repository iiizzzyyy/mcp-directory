"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ApiTabProps as BaseApiTabProps } from '@/lib/types';

interface ApiTabProps extends BaseApiTabProps {
  // We'll keep the original implementation which expects a server object
  // but we'll also support the new pattern with serverId
  server?: {
    id: string;
    name: string;
    slug?: string;
  };
}

export default function ApiTab({ server, serverId }: ApiTabProps) {
  // For compatibility with both prop patterns
  const id = serverId || (server?.id);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState('typescript');

  const copyToClipboard = async (text: string, snippetId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(snippetId);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Sample installation commands for different languages
  const installCommands = {
    typescript: `npm install @modelcontextprotocol/sdk @smithery/sdk`,
    python: `pip install modelcontextprotocol smithery-sdk`,
  };

  const apiKeySnippet = `You'll need to login and generate a Smithery API key to connect to this server.`;

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">API Integration</h2>
        <p className="text-gray-600 mt-1">
          Integrate this MCP server into your applications.
        </p>
      </div>

      {/* API Key Section */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="font-medium text-base mb-2">Get your API Key</h3>
        <p className="text-gray-700 text-sm mb-2">
          You'll need to login and <a href="#" className="text-orange-500 hover:underline">generate a Smithery API key</a> to connect to this server.
        </p>
      </div>

      {/* Language Selector */}
      <div className="mt-8">
        <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
          <TabsList className="bg-background inline-flex h-9 items-center text-muted-foreground w-fit rounded-md border-b mb-3 overflow-x-auto">
            <TabsTrigger value="typescript" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none border-b-2 border-transparent">
              TypeScript
            </TabsTrigger>
            <TabsTrigger value="python" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none border-b-2 border-transparent">
              Python
            </TabsTrigger>
          </TabsList>

          {/* Installation section */}
          <div className="mb-6">
            <h3 className="font-medium text-base mb-3">Installation</h3>
            <p className="text-gray-600 text-sm mb-3">Install the official MCP SDKs using npm:</p>
            
            {Object.entries(installCommands).map(([lang, command]) => (
              <TabsContent key={lang} value={lang} className="mt-0">
                <div className="relative">
                  <div className="bg-gray-900 rounded-md p-0.5">
                    <div className="flex items-center px-3 py-1 border-b border-gray-700">
                      <span className="text-xs text-gray-400">bash</span>
                    </div>
                    <pre className="p-3 overflow-x-auto text-sm font-mono text-gray-300">
                      {command}
                    </pre>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-9 right-2 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(command, `install-${lang}`)}
                  >
                    {copiedSnippet === `install-${lang}` ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
            ))}
          </div>

          {/* TypeScript SDK Usage */}
          <TabsContent value="typescript" className="mt-6">
            <h3 className="font-medium text-base mb-3">TypeScript SDK</h3>
            <p className="text-gray-600 text-sm mb-3">Example usage with TypeScript:</p>
            
            <div className="relative">
              <div className="bg-gray-900 rounded-md p-0.5">
                <div className="flex items-center px-3 py-1 border-b border-gray-700">
                  <span className="text-xs text-gray-400">typescript</span>
                </div>
                <pre className="p-3 overflow-x-auto text-sm font-mono text-gray-300">
{`import { MCP } from '@modelcontextprotocol/sdk';
import { Context7Client } from '@smithery/sdk';

// Initialize the client
const client = new Context7Client({
  apiKey: 'your-api-key-here'
});

// Use the client to call tools
const result = await client.runTool('resolve-library-id', {
  name: 'react'
});`}
                </pre>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-9 right-2 h-8 w-8 p-0"
                onClick={() => copyToClipboard(`import { MCP } from '@modelcontextprotocol/sdk';
import { Context7Client } from '@smithery/sdk';

// Initialize the client
const client = new Context7Client({
  apiKey: 'your-api-key-here'
});

// Use the client to call tools
const result = await client.runTool('resolve-library-id', {
  name: 'react'
});`, "typescript-example")}
              >
                {copiedSnippet === "typescript-example" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>

          {/* Python SDK Usage */}
          <TabsContent value="python" className="mt-6">
            <h3 className="font-medium text-base mb-3">Python SDK</h3>
            <p className="text-gray-600 text-sm mb-3">Example usage with Python:</p>
            
            <div className="relative">
              <div className="bg-gray-900 rounded-md p-0.5">
                <div className="flex items-center px-3 py-1 border-b border-gray-700">
                  <span className="text-xs text-gray-400">python</span>
                </div>
                <pre className="p-3 overflow-x-auto text-sm font-mono text-gray-300">
{`from modelcontextprotocol import MCP
from smithery import Context7Client

# Initialize the client
client = Context7Client(
    api_key="your-api-key-here"
)

# Use the client to call tools
result = client.run_tool("resolve-library-id", {
    "name": "react"
})`}
                </pre>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-9 right-2 h-8 w-8 p-0"
                onClick={() => copyToClipboard(`from modelcontextprotocol import MCP
from smithery import Context7Client

# Initialize the client
client = Context7Client(
    api_key="your-api-key-here"
)

# Use the client to call tools
result = client.run_tool("resolve-library-id", {
    "name": "react"
})`, "python-example")}
              >
                {copiedSnippet === "python-example" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
