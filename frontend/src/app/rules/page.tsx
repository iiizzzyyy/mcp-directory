"use client";

import React from 'react';
import { RuleCard } from '@/components/rules/rule-card';
import { RulesSection } from '@/components/rules/rules-section';
import { 
  Code, 
  Database, 
  Lock, 
  Network, 
  Server, 
  Zap,
  BookOpen,
  FileCode,
  RefreshCw,
  Users
} from 'lucide-react';

/**
 * Rules page component that displays MCP server integration guidelines
 */
export default function RulesPage() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-12">
      <div className="space-y-4 mb-12 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">MCP Server Rules</h1>
        <p className="text-xl text-muted-foreground">
          These rules ensure consistent, secure, and maintainable MCP servers for the ecosystem.
          Following these guidelines helps create a better experience for both developers and users.
        </p>
      </div>

      <div className="space-y-16">
        {/* API Design Rules */}
        <RulesSection 
          title="API Design" 
          description="Guidelines for creating consistent and intuitive APIs"
        >
          <RuleCard
            title="RESTful Endpoints"
            description="Design endpoints following REST principles with resources as nouns and HTTP methods for actions."
            icon={<Network className="h-5 w-5" />}
          />
          <RuleCard
            title="Versioning"
            description="Include API version in URL path (e.g., /v1/resource) to ensure backward compatibility."
            icon={<RefreshCw className="h-5 w-5" />}
          />
          <RuleCard
            title="Status Codes"
            description="Use appropriate HTTP status codes: 200 for success, 400 for client errors, 500 for server errors."
            icon={<Code className="h-5 w-5" />}
          />
          <RuleCard
            title="Error Responses"
            description="Return consistent error objects with 'error', 'message', and 'code' fields."
            icon={<Zap className="h-5 w-5" />}
          />
          <RuleCard
            title="Pagination"
            description="Support pagination with limit/offset parameters for endpoints returning multiple items."
            icon={<FileCode className="h-5 w-5" />}
          />
          <RuleCard
            title="Filtering"
            description="Allow filtering resources by common attributes using query parameters."
            icon={<Database className="h-5 w-5" />}
          />
        </RulesSection>

        {/* Security Rules */}
        <RulesSection 
          title="Security" 
          description="Practices for ensuring secure MCP server implementations"
        >
          <RuleCard
            title="Authentication"
            description="Support token-based authentication with secure token storage and transmission."
            icon={<Lock className="h-5 w-5" />}
          />
          <RuleCard
            title="Input Validation"
            description="Validate and sanitize all user inputs to prevent injection attacks and data corruption."
            icon={<Code className="h-5 w-5" />}
          />
          <RuleCard
            title="Rate Limiting"
            description="Implement rate limiting to prevent abuse and ensure fair resource usage."
            icon={<Zap className="h-5 w-5" />}
          />
          <RuleCard
            title="HTTPS Only"
            description="Always use HTTPS for all communications to ensure data privacy and integrity."
            icon={<Lock className="h-5 w-5" />}
          />
          <RuleCard
            title="Minimal Permissions"
            description="Request only the minimum permissions needed for functionality."
            icon={<Users className="h-5 w-5" />}
          />
          <RuleCard
            title="Secrets Management"
            description="Never hardcode secrets. Use environment variables or secure vaults for credentials."
            icon={<Lock className="h-5 w-5" />}
          />
        </RulesSection>

        {/* Performance Rules */}
        <RulesSection 
          title="Performance" 
          description="Optimizations for responsive and efficient MCP servers"
        >
          <RuleCard
            title="Response Time"
            description="Aim for sub-500ms response times for typical operations to ensure good user experience."
            icon={<Zap className="h-5 w-5" />}
          />
          <RuleCard
            title="Caching"
            description="Implement appropriate caching with proper cache headers for improved performance."
            icon={<RefreshCw className="h-5 w-5" />}
          />
          <RuleCard
            title="Compression"
            description="Enable gzip/brotli compression for responses to reduce bandwidth usage."
            icon={<FileCode className="h-5 w-5" />}
          />
          <RuleCard
            title="Efficient Queries"
            description="Optimize database queries and avoid N+1 query problems for better scaling."
            icon={<Database className="h-5 w-5" />}
          />
          <RuleCard
            title="Connection Pooling"
            description="Use connection pooling for database and external service connections."
            icon={<Network className="h-5 w-5" />}
          />
          <RuleCard
            title="Asynchronous Processing"
            description="Use async processing for computationally intensive or long-running tasks."
            icon={<Server className="h-5 w-5" />}
          />
        </RulesSection>

        {/* Documentation Rules */}
        <RulesSection 
          title="Documentation" 
          description="Standards for clear and comprehensive documentation"
        >
          <RuleCard
            title="OpenAPI Specification"
            description="Provide OpenAPI/Swagger documentation for all endpoints with examples."
            icon={<BookOpen className="h-5 w-5" />}
          />
          <RuleCard
            title="Getting Started"
            description="Include a clear getting started guide with installation and basic usage examples."
            icon={<BookOpen className="h-5 w-5" />}
          />
          <RuleCard
            title="Error Reference"
            description="Document all possible error codes with explanations and resolution steps."
            icon={<Zap className="h-5 w-5" />}
          />
          <RuleCard
            title="Versioning Policy"
            description="Clearly document your versioning policy and deprecation timeline."
            icon={<RefreshCw className="h-5 w-5" />}
          />
          <RuleCard
            title="Authentication Guide"
            description="Provide detailed steps for authentication setup and token management."
            icon={<Lock className="h-5 w-5" />}
          />
          <RuleCard
            title="Changelog"
            description="Maintain a detailed changelog with all API changes, additions, and deprecations."
            icon={<FileCode className="h-5 w-5" />}
          />
        </RulesSection>

        {/* Compatibility Rules */}
        <RulesSection 
          title="Compatibility" 
          description="Ensuring broad compatibility across the MCP ecosystem"
        >
          <RuleCard
            title="Language Support"
            description="Provide client libraries or examples for major programming languages."
            icon={<Code className="h-5 w-5" />}
          />
          <RuleCard
            title="Framework Integration"
            description="Document integration with popular AI frameworks and environments."
            icon={<FileCode className="h-5 w-5" />}
          />
          <RuleCard
            title="Backward Compatibility"
            description="Maintain backward compatibility within the same major version number."
            icon={<RefreshCw className="h-5 w-5" />}
          />
          <RuleCard
            title="Feature Detection"
            description="Use feature detection instead of version checking for capability determination."
            icon={<Zap className="h-5 w-5" />}
          />
          <RuleCard
            title="Standards Compliance"
            description="Follow relevant industry standards and conventions for interoperability."
            icon={<BookOpen className="h-5 w-5" />}
          />
          <RuleCard
            title="Cross-Platform"
            description="Ensure functionality works consistently across different operating systems."
            icon={<Server className="h-5 w-5" />}
          />
        </RulesSection>
      </div>
    </div>
  );
}
