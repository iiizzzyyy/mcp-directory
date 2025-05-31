# MCP Directory Crawler

A Node.js application for crawling MCP directory websites using Firecrawl, extracting server metadata, and storing it in a Supabase database.

## Features

- Extracts MCP server data from multiple directory websites
- Normalizes and deduplicates server entries
- Enriches data with GitHub repository information when available
- Batched processing to prevent overwhelming APIs
- Detailed crawl summary with statistics

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on the `.env.example` template:
   ```bash
   cp .env.example .env
   ```

3. Add your API keys to the `.env` file:
   ```
   SUPABASE_URL=https://nryytfezkmptcmpawlva.supabase.co
   SUPABASE_SERVICE_KEY=your_service_key_here
   FIRECRAWL_API_KEY=your_firecrawl_api_key_here
   GITHUB_API_TOKEN=your_github_token_here  # Optional
   ```

## Usage

Run the crawler:
```bash
npm start
```

## Configuration

You can adjust these settings in your `.env` file:

- `CRAWL_BATCH_SIZE`: Number of servers to process in a batch (default: 20)
- `CRAWL_DELAY_MS`: Delay between processing batches in milliseconds (default: 500)

## Data Model

The crawler extracts the following fields for each MCP server:

- `name`: Name of the server
- `description`: Short description
- `tags`: Array of tags (lowercase)
- `category`: Functional category
- `platform`: Target platform
- `install_method`: Installation method
- `github_url`: GitHub repository URL
- `stars`: GitHub star count
- `forks`: GitHub fork count
- `open_issues`: GitHub open issues count
- `last_updated`: GitHub last updated timestamp
- `source`: Source domain where the server was found

## Troubleshooting

- **Network Issues**: Ensure your network allows connections to Firecrawl and GitHub APIs
- **API Rate Limits**: If you hit GitHub API rate limits, add a GitHub token to your .env file
- **Database Errors**: Verify your Supabase URL and service key are correct
