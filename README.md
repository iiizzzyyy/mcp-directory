# MCP Directory

A comprehensive directory for Model Context Protocol (MCP) servers with dynamic server-side rendering, Supabase integration, and real-time metrics.

## Features

- **Server Discovery**: Browse and search across all available MCP servers
- **Detailed Server Information**: View compatibility, health status, and installation instructions
- **Tools Detection**: Automatic discovery and indexing of MCP server tools
- **GitHub Integration**: Automatic enrichment of server data from GitHub repositories
- **Health Monitoring**: Track uptime and performance metrics for MCP servers
- **Submission System**: GitHub-powered server submission with validation

## Architecture

The MCP Directory consists of several integrated components:

1. **Frontend**: Next.js application with dynamic SSR and client components using Tailwind and Shadcn UI
2. **Database**: Supabase PostgreSQL with RLS policies for public/private data access
3. **Edge Functions**: Supabase serverless functions for tools detection, crawling, enrichment, and metrics
4. **MCP Integration**: Direct integration with Firecrawl MCP for web crawling
5. **Tools Detection**: Multi-tier system for discovering MCP server tools via API endpoints and GitHub analysis

## Tech Stack

- **Next.js**: React framework with App Router for server and client components
- **Supabase**: Backend as a Service with PostgreSQL, Auth, and Edge Functions
- **TypeScript**: Type-safe development across frontend and backend
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Shadcn UI**: Component library built on Radix UI primitives
- **Vercel**: Hosting and deployment platform

## Getting Started

1. Clone this repository
2. Install dependencies with `npm install` in the frontend directory
3. Set up environment variables (see `.env.example`)
4. Run the development server with `npm run dev`

## Database Schema

The project uses the following primary tables:
- `servers`: Main server records with metadata
- `health_data`: Health monitoring data for servers
- `server_metrics`: Performance metrics time-series data
- `server_install_instructions`: Platform-specific installation commands
- `server_tools`: Tools detected for each MCP server
- `tool_parameters`: Parameters for each detected tool
- `pending_servers`: User-submitted servers awaiting review

## Documentation

Detailed documentation for specific features can be found in the `docs/` directory:

- [Tools Detection System](./docs/tools-detection.md): Architecture and usage of the MCP tools detection system

## Deployment

This project is deployed on Vercel with Supabase providing the backend services.
