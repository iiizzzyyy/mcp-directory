import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - MCP Directory',
  description: 'Learn more about the MCP Directory project and its mission',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">About MCP Directory</h1>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          MCP Directory is the central hub for discovering, evaluating, and implementing Model Context Protocol (MCP) servers. 
          Our mission is to accelerate AI agent capabilities by making it easier for developers to find, compare, and 
          integrate with high-quality MCP servers that extend AI model capabilities.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          We believe that the future of AI lies in its ability to interact with the world through well-defined interfaces.
          The Model Context Protocol represents a significant step forward in standardizing how AI models can access external
          tools, data sources, and services.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">What is MCP?</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          The Model Context Protocol (MCP) is a standard that connects AI systems with external tools and data sources. 
          MCP servers extend AI capabilities by providing access to specialized functions, external information, and services.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          An MCP server implements a standardized API that allows AI models to:
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
          <li className="mt-2">Access real-time data and information</li>
          <li className="mt-2">Execute specialized computations or algorithms</li>
          <li className="mt-2">Interact with external systems and services</li>
          <li className="mt-2">Extend their capabilities beyond their training data</li>
        </ul>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Our Team</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          MCP Directory is maintained by a team of AI enthusiasts, developers, and researchers who believe in
          the potential of AI agents with enhanced capabilities through standardized interfaces.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          We continuously work to improve the directory, add new features, and ensure that the information
          provided is accurate and up-to-date.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Get Involved</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          We welcome contributions from the community! Whether you're a developer who wants to improve the directory,
          an MCP server provider who wants to list your service, or an AI enthusiast who wants to help curate our content,
          there are many ways to get involved.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Check out our <a href="https://github.com/yourusername/mcp-directory" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub repository</a> or 
          join our <a href="/community" className="text-blue-600 dark:text-blue-400 hover:underline">community</a> to learn more.
        </p>
      </section>
    </div>
  );
}
