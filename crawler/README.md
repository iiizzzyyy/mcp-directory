# MCP Directory Crawler

A Node.js application for crawling MCP directory websites using Firecrawl, extracting server metadata, and storing it in a Supabase database.

## Features

- Extracts MCP server data from multiple directory websites
- Normalizes and deduplicates server entries
- Enriches data with GitHub repository information when available
- Parses GitHub README files for structured content extraction
- Extracts installation instructions, API documentation, and compatibility information
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
- `GITHUB_API_TOKEN`: Optional GitHub API token to increase rate limits

## Data Model

The crawler extracts the following fields for each MCP server:

### Core Server Data
- `name`: Name of the server
- `description`: Short description
- `tags`: Array of tags (lowercase)
- `category`: Functional category
- `platform`: Target platform
- `install_method`: Installation method
- `source`: Source domain where the server was found

### GitHub Repository Data
- `github_url`: GitHub repository URL
- `stars`: GitHub star count
- `forks`: GitHub fork count
- `open_issues`: GitHub open issues count
- `last_updated`: GitHub last updated timestamp

### README Data
- `readme_overview`: Extracted overview section from README
- `readme_last_updated`: Timestamp of the last README update

### Related Tables

#### server_install_instructions
- `server_id`: Reference to the server
- `instructions`: Installation instructions text
- `code_blocks`: JSON array of code blocks for installation

#### server_api_documentation
- `server_id`: Reference to the server
- `documentation`: API documentation text
- `endpoints`: JSON array of API endpoints detected

#### server_compatibility
- `server_id`: Reference to the server
- `compatibility_info`: Compatibility information text
- `platforms`: JSON array of supported platforms

## Additional Scripts

### README Processing

To process GitHub README files for existing servers:

```bash
node src/process-server-readmes.js --limit=10
```

Options:
- `--limit=N`: Process only N servers (default: 10)
- `--dryrun`: Test process without updating database

### Schema Updates

Before using the README processing feature, make sure to apply the database schema migration:

1. Navigate to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `migrations/20230601_add_readme_tables.sql`
4. Run the migration

## Troubleshooting

- **Network Issues**: Ensure your network allows connections to Firecrawl and GitHub APIs
- **API Rate Limits**: If you hit GitHub API rate limits, add a GitHub token to your .env file
- **Database Errors**: Verify your Supabase URL and service key are correct
- **GitHub Access Issues**: For private repositories, make sure your GitHub token has appropriate permissions
- **README Parsing Issues**: Try updating the README parser by modifying the extraction patterns in `readme-parser.js`
