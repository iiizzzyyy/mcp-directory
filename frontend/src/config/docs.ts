/**
 * Documentation site configuration
 * Defines the structure of the documentation site
 */

export const docsConfig = {
  sidebarNav: [
    {
      title: "Getting Started",
      items: [
        {
          title: "Introduction",
          href: "/docs",
        },
        {
          title: "Installation",
          href: "/docs/getting-started/installation",
        },
        {
          title: "Quick Start",
          href: "/docs/getting-started/quickstart",
        },
        {
          title: "Key Concepts",
          href: "/docs/getting-started/key-concepts",
        }
      ],
    },
    {
      title: "Server Development",
      items: [
        {
          title: "Creating a Server",
          href: "/docs/server-development/creating-a-server",
        },
        {
          title: "Server Configuration",
          href: "/docs/server-development/server-configuration",
        },
        {
          title: "Error Handling",
          href: "/docs/server-development/error-handling",
        },
        {
          title: "Deployment",
          href: "/docs/server-development/deployment",
        },
      ],
    },
    {
      title: "API Reference",
      items: [
        {
          title: "Core API",
          href: "/docs/api-reference/core-api",
        },
        {
          title: "Server API",
          href: "/docs/api-reference/server-api",
        },
        {
          title: "Client API",
          href: "/docs/api-reference/client-api",
        },
        {
          title: "Utilities",
          href: "/docs/api-reference/utilities",
        },
      ],
    },
    {
      title: "Guides",
      items: [
        {
          title: "Authentication",
          href: "/docs/guides/authentication",
        },
        {
          title: "Data Fetching",
          href: "/docs/guides/data-fetching",
        },
        {
          title: "Caching",
          href: "/docs/guides/caching",
        },
        {
          title: "Rate Limiting",
          href: "/docs/guides/rate-limiting",
        },
      ],
    },
    {
      title: "Examples",
      items: [
        {
          title: "Basic MCP Server",
          href: "/docs/examples/basic-server",
        },
        {
          title: "Database Integration",
          href: "/docs/examples/database-integration",
        },
        {
          title: "AI Function Calling",
          href: "/docs/examples/ai-function-calling",
        },
        {
          title: "Full-Stack Application",
          href: "/docs/examples/full-stack-application",
        },
      ],
    },
    {
      title: "Resources",
      items: [
        {
          title: "Community",
          href: "/docs/resources/community",
        },
        {
          title: "Support",
          href: "/docs/resources/support",
        },
        {
          title: "Roadmap",
          href: "/docs/resources/roadmap",
        },
        {
          title: "FAQ",
          href: "/docs/resources/faq",
        },
      ],
    },
  ],
};
