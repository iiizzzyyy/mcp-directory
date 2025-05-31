import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Community - MCP Directory',
  description: 'Join the MCP Directory community and connect with other MCP server developers and users',
};

export default function CommunityPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Join Our Community</h1>
      
      <section className="mb-10">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          The MCP Directory is built by and for the community. Connect with other developers,
          share your experiences, and help shape the future of Model Context Protocol servers.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* GitHub */}
          <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3">GitHub</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Contribute to the MCP Directory codebase, report issues, or suggest new features.
              Our project is open source and welcomes contributions of all kinds.
            </p>
            <a 
              href="https://github.com/yourusername/mcp-directory" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Visit GitHub Repository
            </a>
          </div>
          
          {/* Discord */}
          <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3">Discord</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join our Discord server to chat with other MCP enthusiasts, get help with implementation,
              and stay updated on the latest developments.
            </p>
            <a 
              href="https://discord.gg/example" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Join Discord Server
            </a>
          </div>
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Ways to Contribute</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-medium mb-2">Submit Your MCP Server</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Have you built an MCP server? Add it to our directory to help others discover and use it.
            </p>
            <Link 
              href="/submit"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Submit your server →
            </Link>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-medium mb-2">Report Issues with Existing Servers</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Help us maintain the quality of our directory by reporting servers that are offline,
              malfunctioning, or have outdated information.
            </p>
            <Link 
              href="/docs/reporting-issues"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Learn how to report issues →
            </Link>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-medium mb-2">Improve Our Documentation</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Good documentation is essential for helping developers integrate MCP servers.
              Help us improve our docs with corrections, examples, or new guides.
            </p>
            <a 
              href="https://github.com/yourusername/mcp-directory/tree/main/docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contribute to documentation →
            </a>
          </div>
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Community Guidelines</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          To ensure a productive and welcoming environment for all members, we ask that you follow these guidelines:
        </p>
        
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-3">
          <li>Be respectful and inclusive toward all community members</li>
          <li>Share knowledge freely and help others when you can</li>
          <li>Provide constructive feedback focused on ideas, not individuals</li>
          <li>Only submit servers that are functional and appropriately described</li>
          <li>Respect intellectual property and give proper attribution</li>
          <li>Follow best practices for security and data privacy</li>
        </ul>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          We regularly host community events to discuss MCP development, share knowledge, and collaborate on projects.
        </p>
        
        <div className="border rounded-lg p-6 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-medium">MCP Integration Workshop</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">June 15, 2025 • 10:00 AM PST</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Online</span>
          </div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            Learn how to integrate various MCP servers with popular AI frameworks and build
            powerful agent workflows.
          </p>
          <a 
            href="#" 
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
          >
            Register →
          </a>
        </div>
        
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-medium">MCP Directory Community Call</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">July 5, 2025 • 2:00 PM PST</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Online</span>
          </div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            Monthly community call to discuss the latest updates to the MCP Directory,
            showcase new servers, and gather feedback.
          </p>
          <a 
            href="#" 
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
          >
            Add to Calendar →
          </a>
        </div>
      </section>
    </div>
  );
}
