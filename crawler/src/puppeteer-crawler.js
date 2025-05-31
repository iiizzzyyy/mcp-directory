const fetch = require('node-fetch');
const { serverExists, insertServer, enrichWithGitHubData } = require('./database');
const { formatDate, normalizeGitHubUrl } = require('./utils');
require('dotenv').config();

// Domain to crawl
const domain = 'https://www.pulsemcp.com/servers';

// Summary statistics
const summary = {
  crawled: 0,
  added: 0,
  skipped: 0,
  duplicates: 0,
  errors: 0,
  details: {
    added: [],
    skipped: [],
    errors: []
  }
};

/**
 * Process a single server
 * @param {Object} server Server data
 * @param {Object} summary Summary object to update
 */
async function processServer(server, summary) {
  try {
    // Check if server already exists
    const exists = await serverExists(server);
    
    if (exists) {
      summary.skipped++;
      summary.duplicates++;
      summary.details.skipped.push({
        name: server.name,
        source: server.source,
        reason: 'duplicate'
      });
      console.log(`Skipped duplicate: ${server.name}`);
      return;
    }
    
    // Enrich with GitHub data if available
    if (server.github_url) {
      console.log(`Enriching ${server.name} with GitHub data from ${server.github_url}`);
      const githubData = await enrichWithGitHubData(server.github_url);
      Object.assign(server, githubData);
    }
    
    // Insert server into database
    await insertServer(server);
    
    summary.added++;
    summary.details.added.push({
      name: server.name,
      source: server.source
    });
    console.log(`Added server: ${server.name}`);
  } catch (error) {
    summary.errors++;
    summary.details.errors.push({
      domain: server.source,
      error: `Error processing server ${server.name}: ${error.message}`
    });
    console.error(`Error processing server ${server.name}:`, error);
  }
}

/**
 * Use Puppeteer MCP to scrape the page content
 * @param {string} url URL to scrape
 * @returns {Promise<Array>} Array of server data
 */
async function scrapePuppeteer(url) {
  try {
    console.log(`Navigating to ${url} with Puppeteer MCP...`);
    
    // First navigate to the page
    const navigationResponse = await fetch('https://api.puppeteer.dev/v1/navigate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        url: url
      })
    });
    
    if (!navigationResponse.ok) {
      const errorText = await navigationResponse.text();
      throw new Error(`Puppeteer navigation error: ${navigationResponse.status} ${navigationResponse.statusText} - ${errorText}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to load
    
    // Now evaluate some JavaScript to extract server data
    const evalResponse = await fetch('https://api.puppeteer.dev/v1/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        script: `
            // Find all server cards or elements on the page
            function extractServers() {
              const servers = [];
              
              // Look for server cards or list items
              const serverElements = document.querySelectorAll('.server-card, .mcp-server, .directory-item, .card');
              
              serverElements.forEach(element => {
                const server = {};
                
                // Extract name (could be in different elements)
                const nameEl = element.querySelector('h2, h3, .title, .name');
                if (nameEl) server.name = nameEl.textContent.trim();
                
                // Extract description
                const descEl = element.querySelector('p, .description, .desc');
                if (descEl) server.description = descEl.textContent.trim();
                
                // Extract tags/categories
                const tagEls = element.querySelectorAll('.tag, .category, .badge');
                if (tagEls.length > 0) {
                  server.tags = Array.from(tagEls).map(tag => tag.textContent.trim().toLowerCase());
                }
                
                // Extract category
                const categoryEl = element.querySelector('.category-name, .type');
                if (categoryEl) server.category = categoryEl.textContent.trim();
                
                // Extract platform
                const platformEl = element.querySelector('.platform, .compatibility');
                if (platformEl) server.platform = platformEl.textContent.trim();
                
                // Extract install method
                const installEl = element.querySelector('.install, .installation');
                if (installEl) server.install_method = installEl.textContent.trim();
                
                // Extract GitHub URL
                const githubLink = element.querySelector('a[href*="github.com"]');
                if (githubLink) server.github_url = githubLink.href;
                
                if (server.name) {
                  servers.push(server);
                }
              });
              
              // If we didn't find server cards, look for tables
              if (servers.length === 0) {
                const tables = document.querySelectorAll('table');
                tables.forEach(table => {
                  // Check if this looks like a server table
                  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
                  
                  if (headers.includes('name') || headers.includes('server')) {
                    // This might be a server table
                    const rows = table.querySelectorAll('tbody tr');
                    
                    rows.forEach(row => {
                      const cells = row.querySelectorAll('td');
                      if (cells.length >= 2) {
                        const server = {};
                        
                        // Map headers to values
                        headers.forEach((header, index) => {
                          if (index < cells.length) {
                            const value = cells[index].textContent.trim();
                            
                            if (header.includes('name')) server.name = value;
                            else if (header.includes('desc')) server.description = value;
                            else if (header.includes('tag')) server.tags = value.split(',').map(t => t.trim().toLowerCase());
                            else if (header.includes('category')) server.category = value;
                            else if (header.includes('platform')) server.platform = value;
                            else if (header.includes('install')) server.install_method = value;
                          }
                        });
                        
                        // Look for GitHub link
                        const githubLink = row.querySelector('a[href*="github.com"]');
                        if (githubLink) server.github_url = githubLink.href;
                        
                        if (server.name) {
                          servers.push(server);
                        }
                      }
                    });
                  }
                });
              }
              
              // Last resort: look for any divs with MCP-related text
              if (servers.length === 0) {
                const allText = document.body.innerText.toLowerCase();
                if (allText.includes('mcp') || allText.includes('model context protocol')) {
                  // Extract all links that might be GitHub repos
                  const links = document.querySelectorAll('a[href*="github.com"]');
                  
                  links.forEach(link => {
                    const nearbyHeading = link.closest('div').querySelector('h1, h2, h3, h4');
                    if (nearbyHeading) {
                      servers.push({
                        name: nearbyHeading.textContent.trim(),
                        github_url: link.href,
                        source: window.location.href
                      });
                    }
                  });
                }
              }
              
              return servers;
            }
            
            return extractServers();
          `
          `
        }
      })
    });
    
    if (!evalResponse.ok) {
      const errorText = await evalResponse.text();
      throw new Error(`Puppeteer evaluation error: ${evalResponse.status} ${evalResponse.statusText} - ${errorText}`);
    }
    
    const evalData = await evalResponse.json();
    const extractedServers = evalData.data || [];
    
    // Process extracted servers
    const serverDataArray = extractedServers.map(server => ({
      ...server,
      source: url,
      github_url: server.github_url ? normalizeGitHubUrl(server.github_url) : undefined
    }));
    
    console.log(`Extracted ${serverDataArray.length} servers from ${url} using Puppeteer`);
    return serverDataArray;
  } catch (error) {
    console.error(`Error scraping ${url} with Puppeteer:`, error);
    return [];
  }
}

/**
 * Main function to run the Puppeteer crawler
 */
async function main() {
  console.log('Starting Puppeteer MCP Crawler');
  console.log(`Using Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`Firecrawl/Puppeteer API Key present: ${!!process.env.FIRECRAWL_API_KEY}`);
  console.log(`GitHub API Token present: ${!!process.env.GITHUB_API_TOKEN}`);
  console.log('-------------------------------------------');
  
  const startTime = new Date();
  
  try {
    // Scrape the domain using Puppeteer
    const servers = await scrapePuppeteer(domain);
    summary.crawled = servers.length;
    
    if (servers.length > 0) {
      // Process each server
      for (const server of servers) {
        await processServer(server, summary);
      }
    } else {
      console.log(`No servers found at ${domain} using Puppeteer MCP`);
    }
  } catch (error) {
    summary.errors++;
    summary.details.errors.push({
      domain,
      error: error.message
    });
    console.error(`Error processing ${domain}:`, error);
  }
  
  const endTime = new Date();
  const durationMs = endTime - startTime;
  
  // Print summary
  console.log('\n-------------------------------------------');
  console.log('Crawl Summary:');
  console.log(`Crawled: ${summary.crawled} servers`);
  console.log(`Added: ${summary.added} servers`);
  console.log(`Skipped: ${summary.skipped} servers (Duplicates: ${summary.duplicates})`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(2)} seconds`);
  
  if (summary.details.added.length > 0) {
    console.log('\nAdded Servers:');
    summary.details.added.forEach(server => {
      console.log(`- ${server.name} (from ${server.source})`);
    });
  }
  
  if (summary.details.skipped.length > 0) {
    console.log('\nSkipped Servers:');
    summary.details.skipped.forEach(server => {
      console.log(`- ${server.name} (from ${server.source}): ${server.reason}`);
    });
  }
  
  if (summary.details.errors.length > 0) {
    console.log('\nErrors:');
    summary.details.errors.forEach(error => {
      console.log(`- ${error.domain || 'Unknown'}: ${error.error}`);
    });
  }
  
  console.log('\nCrawl completed at', formatDate(endTime));
}

// Run the crawler
main().catch(console.error);
