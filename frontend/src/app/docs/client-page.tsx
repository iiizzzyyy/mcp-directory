'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClientDocsPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Documentation categories
  const categories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of MCP Directory',
      links: [
        { title: 'Introduction', href: '/docs/getting-started/introduction' },
        { title: 'Installation', href: '/docs/getting-started/installation' },
        { title: 'Quick Start', href: '/docs/getting-started/quickstart' }
      ]
    },
    {
      title: 'Core Concepts',
      description: 'Understanding Model Context Protocol',
      links: [
        { title: 'What is MCP?', href: '/docs/core-concepts/what-is-mcp' },
        { title: 'Server Types', href: '/docs/core-concepts/server-types' },
        { title: 'Architecture', href: '/docs/core-concepts/architecture' }
      ]
    },
    {
      title: 'Using MCP',
      description: 'Working with MCP servers',
      links: [
        { title: 'Connecting to Servers', href: '/docs/using-mcp/connecting' },
        { title: 'Authentication', href: '/docs/using-mcp/authentication' },
        { title: 'Making Requests', href: '/docs/using-mcp/requests' }
      ]
    },
    {
      title: 'Development',
      description: 'Creating your own MCP servers',
      links: [
        { title: 'Creating a Server', href: '/docs/development/creating-server' },
        { title: 'API Reference', href: '/docs/development/api-reference' },
        { title: 'Best Practices', href: '/docs/development/best-practices' }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">MCP Directory Documentation</h1>
      <p className="text-lg mb-10">
        Comprehensive guides and references to help you get started with Model Context Protocol.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {categories.map((category, index) => (
          <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">{category.title}</h2>
            <p className="text-gray-600 mb-4">{category.description}</p>
            <ul className="space-y-2">
              {category.links.map((link, linkIndex) => (
                <li key={linkIndex}>
                  <Link href={link.href} className="text-blue-600 hover:underline">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
