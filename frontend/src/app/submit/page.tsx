import React from 'react';
import { SubmitServerForm } from '@/components/submissions/SubmitServerForm';

/**
 * Server submission page
 * Allows developers to submit their MCP servers for directory inclusion
 */
export default function SubmitServerPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit Your MCP Server</h1>
          <p className="text-gray-600">
            Share your MCP server with the community. After submission, our team will review your 
            server to ensure it meets quality standards before being added to the directory.
          </p>
        </div>
        
        <SubmitServerForm />
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Submission Guidelines</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your server should be hosted in a public GitHub repository</li>
            <li>Include clear documentation on how to use your server</li>
            <li>Provide accurate category and tags to help users find your server</li>
            <li>Ensure your server follows MCP protocol specifications</li>
            <li>Maintain your server with regular updates and security patches</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Submit MCP Server | MCP Directory',
  description: 'Submit your MCP server to be listed in the directory',
};
