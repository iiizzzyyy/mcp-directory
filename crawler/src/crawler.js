const fetch = require('node-fetch');
const { normalizeGitHubUrl, delay } = require('./utils');
require('dotenv').config();

/**
 * Crawl a directory using Firecrawl MCP and extract server data
 * @param {string} domain Domain URL to crawl
 * @returns {Promise<Array>} Array of extracted server data
 */
async function crawlDirectory(domain) {
  try {
    console.log(`Crawling domain: ${domain}`);
    
    // Call Firecrawl API
    const response = await fetch('https://api.firecrawl.dev/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        urls: [domain],
        prompt: 'Extract data about Model Context Protocol (MCP) servers from this page. Look for server cards, tables, or lists. For each server, find the name, description, tags/keywords, category/type, supported platforms, installation method, and GitHub repository URL. If data is in HTML tables, cards, or structured elements, extract it carefully. Pay special attention to links that might contain GitHub URLs.',
        systemPrompt: 'You are a specialized metadata extraction assistant for MCP server directories. Your task is to identify and extract all available information about Model Context Protocol servers listed on this page. Look for server names, descriptions, GitHub links, and any metadata about installation or compatibility. If information is presented in a table, card layout, or list format, be thorough in extracting all available fields.',
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              tags: { 
                type: 'array', 
                items: { type: 'string' } 
              },
              category: { type: 'string' },
              platform: { type: 'string' },
              install_method: { type: 'string' },
              github_url: { type: 'string' }
            },
            required: ['name']
          }
        },
        allowExternalLinks: true,
        includeSubdomains: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const extractedData = data.data || [];
    console.log(`Extracted ${extractedData.length} servers from ${domain}`);

    // Normalize and clean the extracted data
    const serverDataArray = [];
    
    for (const item of extractedData) {
      // Skip items without a name
      if (!item.name) {
        console.log(`Skipping item without name`);
        continue;
      }

      // Create a normalized server data object
      const serverData = {
        name: item.name.trim(),
        description: item.description?.trim(),
        category: item.category?.trim(),
        tags: Array.isArray(item.tags) 
          ? item.tags.map(tag => tag.trim().toLowerCase()) 
          : undefined,
        platform: item.platform?.trim(),
        install_method: item.install_method?.trim(),
        github_url: normalizeGitHubUrl(item.github_url?.trim()),
        source: domain
      };

      serverDataArray.push(serverData);
    }

    return serverDataArray;
  } catch (error) {
    console.error(`Error crawling ${domain}:`, error);
    throw error;
  }
}

/**
 * Process a batch of extracted servers
 * @param {Array} servers Array of server data
 * @param {Function} processServerFn Function to process each server
 * @param {Object} summary Summary object to update
 */
async function processBatch(servers, processServerFn, summary) {
  const batchSize = parseInt(process.env.CRAWL_BATCH_SIZE || '20', 10);
  const delayMs = parseInt(process.env.CRAWL_DELAY_MS || '500', 10);
  
  // Process in smaller batches to avoid overwhelming the database
  for (let i = 0; i < servers.length; i += batchSize) {
    const batch = servers.slice(i, i + batchSize);
    
    // Process each server in the batch
    for (const server of batch) {
      await processServerFn(server, summary);
    }
    
    // Add a small delay between batches
    if (i + batchSize < servers.length) {
      await delay(delayMs);
    }
  }
}

module.exports = {
  crawlDirectory,
  processBatch
};
