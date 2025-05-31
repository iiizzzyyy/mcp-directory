/**
 * Sample MCP server data specifically for PulseMCP
 */
const pulseMcpServers = [
  {
    name: "Pulse Auth MCP",
    description: "Authentication and authorization server for the Model Context Protocol.",
    tags: ["auth", "security", "identity", "oauth"],
    category: "Security",
    platform: "Node.js, Python",
    install_method: "npm install pulse-auth-mcp",
    github_url: "https://github.com/pulsemcp/auth-mcp",
    source: "https://www.pulsemcp.com/servers"
  },
  {
    name: "Pulse Vector DB",
    description: "Vector database server for Model Context Protocol applications with semantic search capabilities.",
    tags: ["vector-db", "embeddings", "search", "semantic"],
    category: "Database",
    platform: "Python, Rust",
    install_method: "pip install pulse-vector-mcp",
    github_url: "https://github.com/pulsemcp/vector-db",
    source: "https://www.pulsemcp.com/servers"
  },
  {
    name: "Pulse Orchestrator",
    description: "Workflow orchestration server for MCP agents and services.",
    tags: ["workflow", "orchestration", "automation"],
    category: "Workflow",
    platform: "TypeScript, Python",
    install_method: "npm install pulse-orchestrator",
    github_url: "https://github.com/pulsemcp/orchestrator",
    source: "https://www.pulsemcp.com/servers"
  },
  {
    name: "Pulse Image MCP",
    description: "Image generation and manipulation server for the Model Context Protocol.",
    tags: ["image", "generation", "diffusion", "graphics"],
    category: "Media",
    platform: "Python, CUDA",
    install_method: "pip install pulse-image-mcp",
    github_url: "https://github.com/pulsemcp/image-mcp",
    source: "https://www.pulsemcp.com/servers"
  },
  {
    name: "Pulse Analytics MCP",
    description: "Analytics and metrics server for Model Context Protocol applications.",
    tags: ["analytics", "metrics", "monitoring", "dashboard"],
    category: "Analytics",
    platform: "Node.js, Python",
    install_method: "npm install pulse-analytics-mcp",
    github_url: "https://github.com/pulsemcp/analytics-mcp",
    source: "https://www.pulsemcp.com/servers"
  }
];

module.exports = { pulseMcpServers };
