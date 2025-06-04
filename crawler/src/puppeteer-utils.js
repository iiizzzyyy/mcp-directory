/**
 * Puppeteer utilities for web scraping
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Global variables
let browserInstance = null;
let puppeteerPath = null;
const SAMPLE_DIR = path.join(__dirname, '../samples');

// Simple in-memory cache to reduce repeated scraping attempts
// Keys are URLs, values are {data, timestamp} objects
const scrapeCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL
if (!fs.existsSync(SAMPLE_DIR)) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
}

/**
 * Browser singleton to reuse browser instance
 */
let browser = null;

/**
 * Get a browser instance
 * @returns {Promise<import('puppeteer').Browser>} Puppeteer browser instance
 */
async function getBrowser() {
  if (browser && browser.connected) {
    try {
      // Test if browser is truly usable
      const pages = await browser.pages().catch(() => null);
      if (pages) {
        return browser;
      }
    } catch (e) {
      console.log('Existing browser connection is not usable, creating a new one');
      try {
        await closeBrowser();
      } catch (closeError) {
        console.log('Error closing existing browser:', closeError.message);
      }
    }
  }
  
  console.log('Launching browser...');
  let retries = 3;
  let lastError;
  
  while (retries > 0) {
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--window-size=1920x1080',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials'
        ],
        ignoreHTTPSErrors: true,
        timeout: 60000 // Increase timeout to 60 seconds
      });
      
      // Add disconnect handler
      browser.on('disconnected', () => {
        console.log('Browser disconnected');
        browser = null;
      });
      
      return browser;
    } catch (error) {
      lastError = error;
      console.error(`Failed to launch browser (attempt ${4-retries}/3):`, error.message);
      retries--;
      if (retries > 0) {
        console.log(`Retrying browser launch in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.error('All browser launch attempts failed');
  throw lastError;
}

/**
 * Close browser instance if it exists
 */
async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
      console.log('Browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    } finally {
      browser = null;
    }
  }
}

/**
 * Scrape a page using Puppeteer
 * @param {string} url URL to scrape
 * @param {Object} options Scraping options
 * @returns {Promise<Object>} Scraped content
 */
async function scrapePage(url, options = {}) {
  // Extract and set defaults for options
  const retryCount = options.retries !== undefined ? options.retries : 2;
  const retryDelay = options.retryDelay !== undefined ? options.retryDelay : 2000;
  const useCache = options.useCache !== undefined ? options.useCache : true;
  const forceFresh = options.forceFresh === true;
  
  // Check cache first (unless force fresh is enabled)
  if (useCache && !forceFresh) {
    const cachedResult = scrapeCache.get(url);
    const now = Date.now();
    
    if (cachedResult && (now - cachedResult.timestamp < CACHE_TTL_MS)) {
      console.log(`Using cached data for ${url} (${Math.round((now - cachedResult.timestamp)/1000)}s old)`);
      return cachedResult.data;
    }
  }
  
  let lastError;
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      console.log(`Scraping page: ${url}`);
      
      if (attempt > 0) {
        console.log(`Retrying scrape attempt ${attempt + 1}/${retryCount} for ${url}...`);
        
        // If we've had a connection issue, force browser restart
        if (lastError && (
          lastError.message.includes('socket hang up') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('Target closed') ||
          lastError.message.includes('Session closed') ||
          lastError.message.includes('disconnected')
        )) {
          console.log('Browser connection issue detected, restarting browser...');
          await closeBrowser();
          browserInstance = null;
        }
        
        // Wait before retry
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      const result = await scrapePageInternal(url, options);
      
      // Cache successful results
      if (useCache && result.success) {
        scrapeCache.set(url, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error scraping page ${url} (attempt ${attempt + 1}/${retryCount}):`, error.message || error);
      lastError = error;
    }
  }
  
  console.error(`All ${retryCount} scraping attempts failed for ${url}:`, lastError);
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    data: null
  };
}

/**
 * Internal implementation of page scraping
 * @param {string} url URL to scrape
 * @param {Object} options Scraping options
 * @returns {Promise<Object>} Scraped content
 */
async function scrapePageInternal(url, options = {}) {
  const {
    selector = 'body',
    waitForSelector = null,
    waitForTimeout = 2000,
    saveSamples = false,
    samplePrefix = 'page',
    evaluate = null
  } = options;
  
  console.log(`Scraping page: ${url}`);
  
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Configure page timeouts and behavior
    await page.setDefaultNavigationTimeout(60000);
    
    // Go to URL with robust navigation handling
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    }).catch(async (err) => {
      console.warn(`Navigation error: ${err.message}, trying alternate strategy...`);
      
      // If the first navigation attempt fails, try a different strategy
      await page.goto('about:blank');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    
    // Check if the response was successful
    if (response && !response.ok()) {
      console.warn(`Page returned status ${response.status()}: ${url}`);
    }
    
    // Sometimes the page can still be loading resources, wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for selector if specified
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
        console.log(`Selector ${waitForSelector} not found, continuing anyway`);
      });
    }
    
    // Wait for timeout to ensure dynamic content is loaded
    if (waitForTimeout > 0) {
      await new Promise(resolve => setTimeout(resolve, waitForTimeout));
    }
    
    // Sometimes scrolling helps load lazy content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get the page content
    const html = await page.content();
    
    // Get markdown version of the text content
    const markdown = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    // Run custom evaluation function if provided
    let evaluationResult = null;
    if (evaluate) {
      evaluationResult = await page.evaluate(evaluate);
    }
    
    // Save samples if requested
    if (saveSamples) {
      const sampleData = {
        url,
        html: html.substring(0, 10000), // Limit size
        markdown: markdown.substring(0, 10000), // Limit size
        evaluationResult
      };
      
      try {
        const fs = require('fs');
        const path = require('path');
        const samplesDir = path.join(__dirname, '../samples');
        
        // Create samples directory if it doesn't exist
        if (!fs.existsSync(samplesDir)) {
          fs.mkdirSync(samplesDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const sampleFile = path.join(samplesDir, `${samplePrefix}-${timestamp}.json`);
        
        fs.writeFileSync(sampleFile, JSON.stringify(sampleData, null, 2));
        console.log(`Saved sample to ${sampleFile}`);
      } catch (error) {
        console.error('Error saving sample:', error);
      }
    }
    
    // Close the page
    await page.close().catch(err => {
      console.warn(`Error closing page: ${err.message}, continuing...`);
    });
    
    return {
      success: true,
      data: {
        url,
        html,
        markdown,
        evaluationResult
      }
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message || error);
    
    try {
      await page.close().catch(() => {});
    } catch (closeError) {
      // Ignore page close errors
    }
    
    throw error;
  }
}

/**
 * Extract tools data from a server page
 * @param {string} url Server URL
 * @param {string} serverSlug Server slug for naming
 * @returns {Promise<Object>} Extracted tools data
 */
async function extractToolsData(url, serverSlug) {
  console.log(`Extracting tools data for ${serverSlug} from ${url}`);
  
  try {
    // Set default response structure
    const defaultResponse = {
      tools: []
    };
    
    // First try to scrape tools tab
    const toolsUrl = url.endsWith('/tools') ? url : `${url}/tools`;
    let toolsTabResult;
    let mainPageResult = null;
    
    try {
      toolsTabResult = await scrapePage(toolsUrl, {
        waitForTimeout: 3000,
        saveSamples: true,
        samplePrefix: `${serverSlug}-tools`,
        retries: 2,
        retryDelay: 3000,
        evaluate: () => {
          // Try to extract tools directly from the page
          const tools = [];
          
          // Look for specific tool elements
          const toolElements = Array.from(document.querySelectorAll('.tool, .function, [class*="tool"], [class*="function"]'));
          toolElements.forEach(element => {
            const nameEl = element.querySelector('.name, h3, [class*="name"], [class*="title"]');
            const descEl = element.querySelector('.description, p, [class*="description"]');
            
            if (nameEl) {
              tools.push({
                name: nameEl.textContent.trim(),
                description: descEl ? descEl.textContent.trim() : 'No description available'
              });
            }
          });
          
          // Look for code blocks that might contain function definitions
          const codeBlocks = Array.from(document.querySelectorAll('pre, code, [class*="code"]'));
          if (codeBlocks && codeBlocks.length > 0) {
            codeBlocks.forEach(block => {
              if (!block || !block.textContent) return;
              const content = block.textContent;
              // Look for function definitions
              const functionMatches = content.match(/function\s+([a-zA-Z0-9_]+)\s*\(/g);
              if (functionMatches) {
                functionMatches.forEach(match => {
                  const name = match.replace(/function\s+|\s*\(/g, '').trim();
                  if (name && name.length > 3) {
                    tools.push({
                      name,
                      description: `Function found in code block: ${name}`
                    });
                  }
                });
              }
              
              // Look for MCP style function names
              const mcpMatches = content.match(/(?:mcp[0-9]*_|firecrawl_|hubspot-|netlify-|puppeteer_)([a-zA-Z0-9_-]+)/g);
              if (mcpMatches) {
                mcpMatches.forEach(name => {
                  if (name && name.length > 3) {
                    tools.push({
                      name,
                      description: `MCP function found in code block: ${name}`
                    });
                  }
                });
              }
            });
          }
          
          return tools;
        }
      });
    } catch (error) {
      console.error('Error scraping tools tab:', error);
      toolsTabResult = { success: false, data: null };
    }
    
    // If tools tab didn't return any tools or returned an error, try the main page
    let tools = [];
    
    if (toolsTabResult && toolsTabResult.success && toolsTabResult.data && 
        toolsTabResult.data.evaluationResult && toolsTabResult.data.evaluationResult.length > 0) {
      // We found tools in the tools tab
      tools = toolsTabResult.data.evaluationResult;
      console.log(`Found ${tools.length} tools on tools tab`);
    } else {
      console.log('No tools found on tools tab, trying main page...');
      
      // If tools tab doesn't have tools, try the main page
      const mainPageUrl = url.replace(/\/tools$/, '');
      
      try {
        mainPageResult = await scrapePage(mainPageUrl, {
          waitForTimeout: 3000,
          saveSamples: true,
          samplePrefix: `${serverSlug}-main`,
          retries: 2,
          retryDelay: 3000,
          evaluate: () => {
            const tools = [];
            
            // Extract from text content
            const text = document.body.innerText;
            
            // Pattern for MCP style function names
            const mcpRegex = /(?:mcp[0-9]*_|firecrawl_|hubspot-|netlify-|puppeteer_)([a-zA-Z0-9_-]+)/g;
            let match;
            const foundTools = new Set();
            
            while ((match = mcpRegex.exec(text)) !== null) {
              const name = match[0].trim();
              if (!foundTools.has(name)) {
                foundTools.add(name);
                
                // Try to find a description near this name
                const surroundingText = text.substring(
                  Math.max(0, match.index - 100),
                  Math.min(text.length, match.index + name.length + 200)
                );
                
                // Look for a description pattern
                const descPattern = new RegExp(`${name}[^\\n]*?[-:] ([^\\n\\.]{10,})`, 'i');
                const descMatch = surroundingText.match(descPattern);
                
                const description = descMatch ? 
                  descMatch[1].trim() : 
                  `MCP Tool: ${name}`;
                
                tools.push({ name, description });
              }
            }
            
            // Look for function sections in the text
            const functionSections = text.match(/function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)[^{]*{/g);
            if (functionSections) {
              functionSections.forEach(section => {
                const functionName = section.match(/function\s+([a-zA-Z0-9_]+)/);
                if (functionName && functionName[1] && !foundTools.has(functionName[1])) {
                  foundTools.add(functionName[1]);
                  tools.push({
                    name: functionName[1],
                    description: `JavaScript function: ${functionName[1]}`
                  });
                }
              });
            }
            
            return tools;
          }
        });
        
        if (mainPageResult && mainPageResult.success && mainPageResult.data && 
            mainPageResult.data.evaluationResult && mainPageResult.data.evaluationResult.length > 0) {
          tools = mainPageResult.data.evaluationResult;
          console.log(`Found ${tools.length} tools on main page`);
        } else {
          console.log('No tools found on main page');
        }
      } catch (error) {
        console.error('Error scraping main page:', error);
      }
    }
    
    // Extract tools from text content as fallback
    if (tools.length === 0) {
      console.log('No tools found via DOM extraction, trying text-based extraction...');
      
      // Try to extract from main page content using text patterns
      const toolsTabMarkdown = toolsTabResult && toolsTabResult.data ? toolsTabResult.data.markdown : null;
      const mainPageMarkdown = mainPageResult && mainPageResult.data ? mainPageResult.data.markdown : null;
      const markdown = toolsTabMarkdown || mainPageMarkdown || '';
      
      if (markdown) {
        const textExtractedTools = extractToolsFromText(markdown, serverSlug);
        if (textExtractedTools && textExtractedTools.length > 0) {
          console.log(`Extracted ${textExtractedTools.length} tools via text pattern matching`);
          tools = [...tools, ...textExtractedTools];
        }
      } else {
        console.log('No markdown content available for text extraction');
      }
    }
      
    return {
      tools: tools.filter(tool => tool && tool.name && tool.name.length > 2)
    };
  } catch (error) {
    console.error('Error extracting tools data:', error);
    // Return empty tools array instead of throwing error
    return {
      tools: []
    };
  }
}

/**
 * Extract tools from text content
 * @param {string} text Text content
 * @param {string} serverSlug Server slug
 * @returns {Array} Array of tool objects
 */
function extractToolsFromText(text, serverSlug) {
  if (!text) return [];
  
  const tools = [];
  console.log(`Extracting tools from text for ${serverSlug}...`);
  
  // Pattern for MCP style function names
  const mcpPattern = /(?:mcp[0-9]*_|firecrawl_|hubspot-|netlify-|puppeteer_)([a-zA-Z0-9_-]+)/gi;
  let mcpMatch;
  const foundTools = new Set();
  
  // Extract MCP tool references
  while ((mcpMatch = mcpPattern.exec(text)) !== null) {
    const fullName = mcpMatch[0].trim();
    
    if (!foundTools.has(fullName)) {
      foundTools.add(fullName);
      
      // Find a description near this function name
      const surroundingText = text.substring(
        Math.max(0, mcpMatch.index - 100),
        Math.min(text.length, mcpMatch.index + fullName.length + 200)
      );
      
      // Look for a description pattern
      const descPattern = new RegExp(`${fullName}[^\\n]*?[-:] ([^\\n\\.]{10,})`, 'i');
      const descMatch = surroundingText.match(descPattern);
      
      const description = descMatch ? 
        descMatch[1].trim() : 
        `${serverSlug} MCP Tool: ${fullName}`;
      
      tools.push({ name: fullName, description });
      console.log(`Found tool from text: ${fullName}`);
    }
  }
  
  // Look for function references in general text
  const functionPatterns = [
    /\*\*(?:Function|Tool|Command):\*\*\s+`([a-zA-Z0-9_-]+)`[\s\S]*?(?:\*\*Description:\*\*|\*\*Purpose:\*\*)\s+([^\n]+)/gi,
    /\|\s*`?([a-zA-Z0-9_-]+)`?\s*\|\s*([^\|\n]{10,})\|/g,  // | name | description | (table format)
    /function\s+([a-zA-Z0-9_-]+)\s*\(([^\)]*?)\)/g  // function name(...)
  ];
  
  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      let description = match[2] ? match[2].trim() : `Function: ${name}`;
      
      // Clean up description if it's parameter list
      if (description.includes(',') && description.includes(':')) {
        description = `Function: ${name} with parameters (${description})`;
      }
      
      if (!foundTools.has(name) && 
          name.length > 3 && 
          !['example', 'function', 'test'].includes(name.toLowerCase())) {
        foundTools.add(name);
        tools.push({ name, description });
        console.log(`Found function reference: ${name}`);
      }
    }
  }
  
  return tools;
}

/**
 * Extract overview data from a server page
 * @param {string} url Server URL
 * @returns {Promise<Object>} Extracted overview data
 */
async function extractOverviewData(url) {
  console.log(`Extracting overview data from ${url}`);
  
  try {
    const result = await scrapePage(url, {
      waitForTimeout: 3000,
      saveSamples: true,
      samplePrefix: 'overview',
      retries: 2,
      retryDelay: 3000,
      evaluate: () => {
        // Try to extract server information
        const title = document.title || '';
        let name = '';
        let description = '';
        let authorName = '';
        let stars = 0;
        let installCommands = {};
        let compatibleClients = [];
        
        // Extract name from heading or title
        const headings = Array.from(document.querySelectorAll('h1, h2, [class*="heading"], [class*="title"]'));
        if (headings.length > 0) {
          name = headings[0].textContent.trim();
        }
        
        // Extract description from paragraphs
        const paragraphs = Array.from(document.querySelectorAll('p, [class*="description"], [class*="content"]'));
        if (paragraphs.length > 0) {
          description = paragraphs[0].textContent.trim();
        }
        
        // Look for author information
        const authorElements = Array.from(document.querySelectorAll('[class*="author"], [class*="creator"], [class*="owner"]'));
        if (authorElements.length > 0) {
          authorName = authorElements[0].textContent.trim();
        }
        
        // Look for stars count
        const starsElements = Array.from(document.querySelectorAll('[class*="star"], [class*="rating"]'));
        if (starsElements.length > 0) {
          const starsText = starsElements[0].textContent.trim();
          const starsMatch = starsText.match(/\d+/);
          if (starsMatch) {
            stars = parseInt(starsMatch[0], 10);
          }
        }
        
        // Look for install commands
        const codeBlocks = Array.from(document.querySelectorAll('pre, code, [class*="code"]'));
        codeBlocks.forEach(block => {
          const content = block.textContent.trim();
          
          // Try to determine platform from context
          let platform = 'unknown';
          const parentText = block.parentElement?.textContent.toLowerCase() || '';
          
          if (parentText.includes('linux') || parentText.includes('ubuntu') || parentText.includes('debian')) {
            platform = 'linux';
          } else if (parentText.includes('mac') || parentText.includes('macos')) {
            platform = 'macos';
          } else if (parentText.includes('windows')) {
            platform = 'windows';
          }
          
          // Save install command for this platform
          if (content.includes('npm') || content.includes('pip') || content.includes('install') || content.includes('curl')) {
            installCommands[platform] = content;
          }
        });
        
        // Ensure we have placeholders for required platforms
        const requiredPlatforms = ['linux', 'macos', 'windows'];
        requiredPlatforms.forEach(platform => {
          if (!installCommands[platform]) {
            installCommands[platform] = '';
          }
        });
        
        // Look for compatible clients
        const clientElements = Array.from(document.querySelectorAll('[class*="client"], [class*="compatible"]'));
        clientElements.forEach(element => {
          const clientName = element.textContent.trim();
          if (clientName && clientName.length > 0) {
            compatibleClients.push(clientName);
          }
        });
        
        return {
          name,
          description,
          authorName,
          stars,
          installCommands,
          compatibleClients
        };
      }
    });
    
    if (result.success) {
      return result.data.evaluationResult || {};
    } else {
      console.error('Failed to extract overview data');
      return {};
    }
  } catch (error) {
    console.error(`Error extracting overview data:`, error);
    return {};
  }
}

/**
 * Extract API data from a server page
 * @param {string} url API URL
 * @returns {Promise<Object>} Extracted API data
 */
async function extractApiData(url) {
  console.log(`Extracting API data from ${url}`);
  
  try {
    const result = await scrapePage(url, {
      waitForTimeout: 3000,
      saveSamples: true,
      samplePrefix: 'api',
      retries: 2,
      retryDelay: 3000,
      evaluate: () => {
        // Try to extract API information
        const title = document.title || '';
        let description = '';
        let endpoints = [];
        
        // Extract description from paragraphs
        const paragraphs = Array.from(document.querySelectorAll('p, [class*="description"], [class*="content"]'));
        if (paragraphs.length > 0) {
          description = paragraphs[0].textContent.trim();
        }
        
        // Look for API endpoints
        const endpointElements = Array.from(document.querySelectorAll('[class*="endpoint"], [class*="api"], [class*="route"]'));
        endpointElements.forEach(element => {
          const path = element.textContent.trim();
          if (path && path.length > 0) {
            endpoints.push(path);
          }
        });
        
        return {
          description,
          endpoints
        };
      }
    });
    
    if (result.success) {
      return result.data.evaluationResult || {};
    } else {
      console.error('Failed to extract API data');
      return {};
    }
  } catch (error) {
    console.error(`Error extracting API data:`, error);
    return {};
  }
}

/**
 * Clears the scrape cache for a specific URL or all URLs
 * @param {string} [url] Optional URL to clear from cache. If not provided, clears all cache.
 */
function clearCache(url) {
  if (url) {
    console.log(`Clearing cache for ${url}`);
    scrapeCache.delete(url);
  } else {
    console.log('Clearing entire scrape cache');
    scrapeCache.clear();
  }
}

/**
 * Gets cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return {
    cacheSize: scrapeCache.size,
    urls: Array.from(scrapeCache.keys()),
    oldestEntry: scrapeCache.size > 0 ? 
      Math.min(...Array.from(scrapeCache.values()).map(item => item.timestamp)) : null,
    newestEntry: scrapeCache.size > 0 ? 
      Math.max(...Array.from(scrapeCache.values()).map(item => item.timestamp)) : null
  };
}

module.exports = {
  scrapePage,
  getBrowser,
  closeBrowser,
  extractToolsData,
  extractOverviewData,
  extractApiData,
  clearCache,
  getCacheStats,
  extractToolsFromText
};
