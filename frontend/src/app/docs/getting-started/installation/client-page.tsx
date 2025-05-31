'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { isClient } from '@/lib/client-utils';

// This is a client-side wrapper for the installation docs page
export default function ClientInstallationPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Only run on client side
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <div className="p-8">Loading documentation...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Installation Guide</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
        <p className="mb-4">
          This page provides instructions for installing and configuring the MCP Directory.
          The installation process is straightforward and can be completed in a few simple steps.
        </p>

        <h3 className="text-xl font-semibold mb-3 mt-6">Prerequisites</h3>
        <ul className="list-disc pl-5 mb-4">
          <li className="mb-2">Node.js 16.x or higher</li>
          <li className="mb-2">npm or yarn package manager</li>
          <li className="mb-2">Supabase account (for authentication and database)</li>
          <li className="mb-2">Netlify account (for hosting)</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 mt-6">Installation Steps</h3>
        <ol className="list-decimal pl-5 mb-4">
          <li className="mb-3">
            <strong>Clone the repository</strong>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md my-2 overflow-x-auto">
              <code>git clone https://github.com/your-org/mcp-directory.git</code>
            </pre>
          </li>
          <li className="mb-3">
            <strong>Install dependencies</strong>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md my-2 overflow-x-auto">
              <code>cd mcp-directory/frontend
npm install</code>
            </pre>
          </li>
          <li className="mb-3">
            <strong>Configure environment variables</strong>
            <p className="my-2">Create a <code>.env.local</code> file with the following variables:</p>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md my-2 overflow-x-auto">
              <code>NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key</code>
            </pre>
          </li>
          <li className="mb-3">
            <strong>Start the development server</strong>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md my-2 overflow-x-auto">
              <code>npm run dev</code>
            </pre>
          </li>
        </ol>

        <h3 className="text-xl font-semibold mb-3 mt-6">Deployment</h3>
        <p className="mb-4">
          To deploy the application to Netlify:
        </p>
        <ol className="list-decimal pl-5 mb-4">
          <li className="mb-2">Build the project: <code>npm run build</code></li>
          <li className="mb-2">Deploy the <code>dist</code> directory to Netlify</li>
          <li className="mb-2">Set the environment variables in the Netlify dashboard</li>
        </ol>
      </div>
    </div>
  );
}
