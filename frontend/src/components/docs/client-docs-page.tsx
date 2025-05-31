"use client";

import React, { useEffect, useState } from 'react';
import { DocPageTemplate } from '@/components/docs/doc-page-template';

/**
 * Client-side only docs page component to prevent SSR issues with window
 */
export default function ClientDocsPage() {
  const [content, setContent] = useState<string>("");
  
  useEffect(() => {
    // In a real application, this would be fetched from a CMS or API
    const introContent = `
# Introduction to MCP Directory

The Model Context Protocol (MCP) Directory is a centralized registry for discovering, installing, and monitoring MCP servers. This documentation will help you understand how to use the directory and how to create and manage your own MCP servers.

## What is MCP?

The Model Context Protocol (MCP) is a standard that connects AI systems with external tools and data sources. MCP servers extend AI capabilities by providing access to specialized functions, external information, and services.

## Key Features

- **Server Discovery**: Find and explore available MCP servers across various categories like authentication, document processing, data sources, and more.
- **Installation Guides**: Get detailed installation instructions for each server, including CLI commands and configuration steps.
- **Compatibility Information**: Check which AI models and frameworks are compatible with each MCP server.
- **Health Monitoring**: View the current status and uptime of MCP servers.
- **Documentation**: Access comprehensive documentation for each server.

## Getting Started

Visit the [Getting Started](/docs/getting-started/installation) section to learn how to:

1. Browse the directory
2. Install MCP servers
3. Use MCP servers with your AI applications
4. Submit your own MCP server to the directory

## Contributing

MCP Directory is an open community project. You can contribute by:

- Adding your MCP server to the directory
- Improving documentation
- Reporting issues or bugs
- Suggesting new features

Visit the [GitHub repository](https://github.com/example/mcp-directory) to learn more about contributing.
`;
    
    setContent(introContent);
  }, []);
  
  return (
    <DocPageTemplate 
      title="Documentation"
      content={content}
      lastUpdated="2025-05-01"
      authors={["MCP Directory Team"]}
    />
  );
}
