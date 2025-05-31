/**
 * Sample MCP server data for testing
 */
const mockServers = [
  {
    name: "MongoDB MCP",
    description: "MongoDB integration with Model Context Protocol for structured data storage and retrieval.",
    tags: ["database", "nosql", "document-store", "storage"],
    category: "Database",
    platform: "Node.js, Python, Java",
    install_method: "npm install mongodb-mcp",
    github_url: "https://github.com/mongodb/mongodb-mcp",
    source: "sample-data"
  },
  {
    name: "Supabase MCP",
    description: "Supabase server for the Model Context Protocol providing database, auth, and edge functions.",
    tags: ["database", "postgres", "auth", "serverless", "edge-functions"],
    category: "Backend Services",
    platform: "JavaScript, TypeScript, Python",
    install_method: "npm install supabase-mcp",
    github_url: "https://github.com/supabase/supabase-mcp",
    source: "sample-data"
  },
  {
    name: "Firecrawl MCP",
    description: "Web crawling and extraction server for the Model Context Protocol.",
    tags: ["web-crawling", "extraction", "search", "ai"],
    category: "Data Collection",
    platform: "JavaScript, Python",
    install_method: "pip install firecrawl-mcp",
    github_url: "https://github.com/firecrawl/firecrawl-mcp",
    source: "sample-data"
  },
  {
    name: "Netlify MCP",
    description: "Netlify integration with Model Context Protocol for serverless deployments and edge functions.",
    tags: ["hosting", "jamstack", "serverless", "deployment"],
    category: "Web Hosting",
    platform: "JavaScript, Go",
    install_method: "npm install netlify-mcp",
    github_url: "https://github.com/netlify/netlify-mcp",
    source: "sample-data"
  },
  {
    name: "HubSpot MCP",
    description: "HubSpot integration with Model Context Protocol for CRM operations and marketing automation.",
    tags: ["crm", "marketing", "sales", "automation"],
    category: "CRM",
    platform: "JavaScript, PHP",
    install_method: "npm install hubspot-mcp",
    github_url: "https://github.com/hubspot/hubspot-mcp",
    source: "sample-data"
  },
  {
    name: "Brave Search MCP",
    description: "Brave Search integration with Model Context Protocol for private and secure web search.",
    tags: ["search", "privacy", "indexing"],
    category: "Search",
    platform: "JavaScript, Python, Rust",
    install_method: "npm install brave-search-mcp",
    github_url: "https://github.com/brave/brave-search-mcp",
    source: "sample-data"
  },
  {
    name: "Puppeteer MCP",
    description: "Headless browser automation for the Model Context Protocol.",
    tags: ["browser", "automation", "testing", "scraping"],
    category: "Browser Automation",
    platform: "JavaScript, TypeScript",
    install_method: "npm install puppeteer-mcp",
    github_url: "https://github.com/puppeteer/puppeteer-mcp",
    source: "sample-data"
  },
  {
    name: "Context7 MCP",
    description: "Knowledge base and document retrieval server for the Model Context Protocol.",
    tags: ["knowledge-base", "document-retrieval", "search"],
    category: "Knowledge Base",
    platform: "Python, JavaScript",
    install_method: "pip install context7-mcp",
    github_url: "https://github.com/context7/context7-mcp",
    source: "sample-data"
  },
  {
    name: "GitMCP",
    description: "Git integration with Model Context Protocol for code repository access and analysis.",
    tags: ["git", "code", "repositories", "version-control"],
    category: "Source Control",
    platform: "Node.js, Python",
    install_method: "npm install gitmcp",
    github_url: "https://github.com/gitmcp/gitmcp",
    source: "sample-data"
  },
  {
    name: "OpenAI MCP",
    description: "OpenAI integration with Model Context Protocol for AI model access and inference.",
    tags: ["ai", "machine-learning", "gpt", "inference"],
    category: "AI",
    platform: "Python, JavaScript",
    install_method: "pip install openai-mcp",
    github_url: "https://github.com/openai/openai-mcp",
    source: "sample-data"
  }
];

module.exports = { mockServers };
