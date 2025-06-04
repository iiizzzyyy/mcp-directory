const fetch = require('node-fetch');
const { cachedApiCall } = require('./api-utils');
const { delay } = require('./enhanced-utils');
const { normalizeGitHubUrl } = require('./utils');
const puppeteerUtils = require('./puppeteer-utils');

// No longer need Firecrawl API key since we're using Puppeteer
require('dotenv').config();

// Create partial results directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const PARTIALS_DIR = path.join(__dirname, '../.partials');

if (!fs.existsSync(PARTIALS_DIR)) {
  fs.mkdirSync(PARTIALS_DIR, { recursive: true });
  console.log(`Created partials directory: ${PARTIALS_DIR}`);
}

/**
 * Crawl a Smithery.ai server page and extract comprehensive data
 * @param {string} serverUrl Full URL to the Smithery server page
 * @returns {Promise<Object>} Extracted server data
 */
async function crawlSmitheryServer(serverUrl) {
  try {
    console.log(`Crawling Smithery server: ${serverUrl}`);
    
    // Extract server slug from URL
    const slugMatch = serverUrl.match(/\/server\/@([^\/]+)\/([^\/]+)/);
    if (!slugMatch) {
      throw new Error(`Invalid Smithery server URL format: ${serverUrl}`);
    }
    
    const owner = slugMatch[1];
    const serverSlug = slugMatch[2];
    
    // Check for partial results first
    const partialFile = path.join(PARTIALS_DIR, `${owner}-${serverSlug}.json`);
    let partialData = {};
    
    if (fs.existsSync(partialFile)) {
      try {
        partialData = JSON.parse(fs.readFileSync(partialFile, 'utf8'));
        console.log(`Found partial data for ${owner}/${serverSlug}`);
      } catch (error) {
        console.error(`Error reading partial data file:`, error);
      }
    }
    
    // Initialize with partial data
    let overviewData = partialData.overview || {};
    let toolsData = partialData.tools || { tools: [] };
    let apiData = partialData.api || { install_code_blocks: {}, example_code: {} };
    
    // Fetch missing data with error handling for each part separately
    try {
      if (Object.keys(overviewData).length === 0 || !overviewData.name) {
        console.log(`Extracting overview data for ${serverSlug}...`);
        overviewData = await extractOverviewTab(serverUrl);
        
        // Save partial data immediately
        savePartialData(owner, serverSlug, 'overview', overviewData);
      }
    } catch (error) {
      console.error(`Failed to extract overview data:`, error);
    }
    
    try {
      // Always extract tools data, regardless of cache status
      console.log(`Extracting tools data for ${serverSlug}...`);
      toolsData = await extractToolsTab(`${serverUrl}/tools`, serverSlug);
      
      // Save partial data immediately
      savePartialData(owner, serverSlug, 'tools', toolsData);
      
      // Log tool data structure for debugging
      console.log(`Tools data structure after primary attempt: ${JSON.stringify(Object.keys(toolsData))}`);
      if (toolsData.tools && Array.isArray(toolsData.tools) && toolsData.tools.length > 0) {
        console.log(`Found ${toolsData.tools.length} tools for ${serverSlug} using Puppeteer.`);
      } else {
        console.log(`No tools found with Puppeteer or invalid tools array for ${serverSlug}. Attempting fallback...`);
        try {
          toolsData = await extractToolsTabFallback(`${serverUrl}/tools`);
          // Save partial data again if fallback was successful
          savePartialData(owner, serverSlug, 'tools', toolsData);
          if (toolsData.tools && Array.isArray(toolsData.tools) && toolsData.tools.length > 0) {
            console.log(`Found ${toolsData.tools.length} tools for ${serverSlug} using Fallback (Firecrawl).`);
          } else {
            console.log(`No tools found for ${serverSlug} even after fallback.`);
            toolsData = { tools: [] }; // Ensure it's an empty array if fallback also fails
          }
        } catch (fallbackError) {
          console.error(`Error during tools extraction fallback for ${serverSlug}:`, fallbackError);
          toolsData = { tools: [] }; // Ensure it's an empty array on fallback error
        }
      }

      // If still no tools found from tools tab (primary or fallback), try to extract from overview page
        if (overviewData && overviewData.description) {
          console.log(`Attempting to extract tools from overview content for ${serverSlug}...`);
          const toolsFromOverview = extractToolsFromText(overviewData.description, serverSlug);
          
          if (toolsFromOverview.length > 0) {
            console.log(`Found ${toolsFromOverview.length} tools from overview content`);
            toolsData.tools = toolsFromOverview;
          }
        }
    } catch (error) {
      console.error(`Failed to extract tools data:`, error); // Main catch for tools extraction
    }
    
    try {
      if (!apiData.install_code_blocks || Object.keys(apiData.install_code_blocks).length === 0) {
        console.log(`Extracting API data for ${serverSlug}...`);
        apiData = await extractApiTab(`${serverUrl}/api`);
        
        // Save partial data immediately
        savePartialData(owner, serverSlug, 'api', apiData);
        
        // If no tools found yet, try to extract from API tab content
        if (toolsData.tools.length === 0 && apiData && apiData.description) {
          console.log(`Attempting to extract tools from API content for ${serverSlug}...`);
          const toolsFromApi = extractToolsFromText(apiData.description, serverSlug);
          
          if (toolsFromApi.length > 0) {
            console.log(`Found ${toolsFromApi.length} tools from API content`);
            toolsData.tools = toolsFromApi;
            
            // Update partial data with new tools
            savePartialData(owner, serverSlug, 'tools', toolsData);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to extract API data:`, error);
    }
    
    // For debugging only - log the structure of extracted data
    console.log(`Overview data structure: ${Object.keys(overviewData).join(', ')}`);
    
    // If no name is available but we have the slug, use it to create a fallback name
    let serverName = '';
    if (overviewData.name) {
      serverName = overviewData.name;
    } else {
      // Create a name from the slug by replacing hyphens with spaces and capitalizing
      serverName = serverSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      console.log(`Using fallback name: ${serverName} (derived from slug)`);
    }
    
    // Merge data from all tabs
    const serverData = {
      name: serverName,
      slug: serverSlug,
      owner: `@${owner}`,
      description: overviewData.description || `${serverName} MCP Server`,
      category: overviewData.category || 'MCP Server',
      tags: overviewData.tags || [],
      github_url: normalizeGitHubUrl(overviewData.github_url) || '',
      homepage_url: overviewData.homepage_url || '',
      source_code_url: overviewData.source_code_url || overviewData.github_url || '',
      
      // GitHub stats
      stars: parseInt(overviewData.stars) || 0,
      forks: parseInt(overviewData.forks) || 0,
      open_issues: parseInt(overviewData.open_issues) || 0,
      contributors: parseInt(overviewData.contributors) || 0,
      
      // Metrics
      monthly_tool_calls: parseInt(overviewData.monthly_tool_calls) || 0,
      success_rate: parseFloat(overviewData.success_rate) || 0,
      
      // Deployment info
      deploy_branch: overviewData.deploy_branch || '',
      deploy_commit: overviewData.deploy_commit || '',
      
      // Additional metadata
      license: overviewData.license || '',
      is_local: overviewData.is_local === true,
      published_date: overviewData.published_date || null,
      security_audit: overviewData.security_audit || { status: '', verified_by: '' },
      verification_status: overviewData.verification_status || '',
      
      // Installation data
      install_instructions: overviewData.install_instructions || { linux: {}, macos: {}, windows: {} },
      install_code_blocks: apiData.install_code_blocks || {},
      example_code: apiData.example_code || {},
      
      // Additional fields
      platform: overviewData.platform || 'server',
      source: 'smithery',
      icon_url: overviewData.icon_url || '',
      health_check_url: '',
      
      // Tools data - will be stored in a separate table
      tools: toolsData && Array.isArray(toolsData.tools) ? toolsData.tools : []
    };
    
    // Extract compatible clients
    serverData.compatible_clients = overviewData.compatible_clients || [];
    
    // If we don't have a name, this crawl likely failed
    if (!serverData.name) {
      throw new Error(`Failed to extract server name for ${serverUrl}`);
    }
    
    return serverData;
  } catch (error) {
    console.error(`Error crawling Smithery server ${serverUrl}:`, error);
    throw error;
  }
}

/**
 * Save partial data for a server to enable resuming crawls
 * @param {string} owner Server owner
 * @param {string} serverSlug Server slug
 * @param {string} section Data section (overview, tools, api)
 * @param {Object} data Section data
 */
function savePartialData(owner, serverSlug, section, data) {
  const partialFile = path.join(PARTIALS_DIR, `${owner}-${serverSlug}.json`);
  
  try {
    // Read existing data if available
    let partialData = {};
    if (fs.existsSync(partialFile)) {
      partialData = JSON.parse(fs.readFileSync(partialFile, 'utf8'));
    }
    
    // Update section and save
    partialData[section] = data;
    partialData.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(partialFile, JSON.stringify(partialData, null, 2));
    console.log(`Saved partial ${section} data for ${owner}/${serverSlug}`);
  } catch (error) {
    console.error(`Error saving partial data:`, error);
  }
}

/**
 * Extract data from the Overview tab
 * @param {string} url URL to the Overview tab
 * @returns {Promise<Object>} Extracted data
 */
async function extractOverviewTab(url) {
  try {
    console.log(`Extracting data from Overview tab: ${url}`);
    
    // Define request parameters
    const requestBody = {
      urls: [url],
      prompt: 'Extract comprehensive data about this Model Context Protocol (MCP) server from the overview page. Find the server name, description, tags, category, GitHub URL, homepage URL, installation instructions for different clients, security status, metrics like monthly tool calls and success rate, deployment info like branch and commit, license info, and publication date. Also extract any compatible clients listed.',
      systemPrompt: 'You are a specialized metadata extraction assistant for MCP server pages. Extract all available information in a structured format.',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' },
          github_url: { type: 'string' },
          homepage_url: { type: 'string' },
          source_code_url: { type: 'string' },
          stars: { type: 'string' },
          forks: { type: 'string' },
          open_issues: { type: 'string' },
          contributors: { type: 'string' },
          monthly_tool_calls: { type: 'string' },
          success_rate: { type: 'string' },
          license: { type: 'string' },
          deploy_branch: { type: 'string' },
          deploy_commit: { type: 'string' },
          security_audit: { 
            type: 'object',
            properties: {
              status: { type: 'string' },
              verified_by: { type: 'string' }
            }
          },
          verification_status: { type: 'string' },
          is_local: { type: 'boolean' },
          published_date: { type: 'string' },
          platform: { type: 'string' },
          icon_url: { type: 'string' },
          compatible_clients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                icon_url: { type: 'string' },
                website_url: { type: 'string' }
              }
            }
          }
        }
      },
      allowExternalLinks: true
    };
    
    // Use cached API call with retry
    return await cachedApiCall(
      async () => {
        const response = await fetch('https://api.firecrawl.dev/v1/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Firecrawl API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.data || {};
      },
      url,
      { requestType: 'overview' },
      { 
        maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours cache
        retryOptions: {
          maxRetries: 5,
          initialDelay: 5000,
          maxDelay: 60000,
          logPrefix: 'OVERVIEW API'
        }
      }
    );
  } catch (error) {
    console.error(`Error extracting Overview tab data:`, error);
    return {};
  }
}

/**
 * Extract data from the Tools tab
 * @param {string} url URL to the Tools tab
 * @returns {Promise<Object>} Extracted data
 */
/**
 * Poll for extraction results using the extraction ID
 * @param {string} extractionId Extraction ID to poll
 * @param {number} maxAttempts Maximum number of polling attempts
 * @param {number} delayMs Delay between polling attempts in milliseconds
 * @returns {Promise<Object>} Extraction results
 */
async function pollExtractionResults(extractionId, maxAttempts = 10, delayMs = 3000) {
  console.log(`Polling for extraction results with ID: ${extractionId}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
      
      const response = await fetch(`https://api.firecrawl.dev/v1/extractions/${extractionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
        }
      });
      
      if (!response.ok) {
        console.log(`Polling failed with status ${response.status}, will retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      const data = await response.json();
      console.log(`Extraction status: ${data.status || 'unknown'}`);
      
      // Check if extraction is complete
      if (data.status === 'completed' || data.status === 'succeeded') {
        console.log('Extraction completed successfully!');
        return data;
      } else if (data.status === 'failed') {
        throw new Error(`Extraction failed: ${JSON.stringify(data.error || {})}`);
      }
      
      // If still processing, wait and try again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error(`Error polling for extraction results (attempt ${attempt}/${maxAttempts}):`, error);
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Extraction timed out after ${maxAttempts} polling attempts`);
}

/**
 * Extract data from the Tools tab using Puppeteer
 * @param {string} url URL to the Tools tab
 * @param {string} serverSlug The server slug for sample naming
 * @returns {Promise<Object>} Extracted tools data
 */
async function extractToolsTab(url, serverSlug = null) {
  try {
    console.log(`Extracting data from Tools tab using Puppeteer: ${url}`);
    
    // Use cachedApiCall to handle caching and retries
    return await cachedApiCall(
      async () => {
        // Use our Puppeteer-based tools extractor
        const toolsData = await puppeteerUtils.extractToolsData(url, serverSlug);
        
        // Sample saving is handled inside the puppeteerUtils.extractToolsData function
        
        console.log(`Successfully extracted ${toolsData.tools.length} tools with Puppeteer`);
        
        return { tools: toolsData.tools || [] };
      },
      `${url}?t=${Date.now()}`, // Add timestamp as query param to force fresh URL cache key
      { requestType: 'tools' },
      { 
        maxAgeMs: 0, // Disable caching completely for tools
        retryOptions: {
          maxRetries: 3,
          initialDelay: 5000,
          maxDelay: 30000,
          logPrefix: 'TOOLS PUPPETEER'
        }
      }
    );
  } catch (error) {
    console.error(`Error extracting Tools tab data with Puppeteer:`, error);
    return { tools: [] };
  }
}

/**
 * Extract data from the Tools tab using Firecrawl API (fallback method)
 * @param {string} url URL to the Tools tab
 * @returns {Promise<Object>} Extracted tools data
 */
async function extractToolsTabFallback(url) {
  try {
    console.log(`[Fallback] Attempting to scrape URL: ${url}`);
    console.log(`Extracting data from Tools tab using fallback method: ${url}`);
    
    // Use cachedApiCall to handle caching and retries
    return await cachedApiCall(
      async () => {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({
            url: url, // Changed from urls: [url]
            formats: ['markdown', 'html']
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Firecrawl API error details: ${errorText}`);
          throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tools = [];
        
        // Process the response and extract tools
        if (data && (data.html || data.markdown)) {
          console.log('Received HTML and/or markdown content from Firecrawl API');
          
          // First try to extract from HTML if available
          if (data.html) {
            try {
              // Basic HTML parsing to extract tool sections
              const html = data.html;
              
              // Look for tool cards or sections in the HTML
              // This regex pattern looks for div elements with class containing 'tool-card' or similar
              const toolCardPattern = /<div[^>]*class=['"][^'"]*tool[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;
              let toolCardMatch;
              
              while ((toolCardMatch = toolCardPattern.exec(html)) !== null) {
                // Extract tool name (typically in h3 or similar heading)
                const nameMatch = /<h\d[^>]*>([^<]+)<\/h\d>/i.exec(toolCardMatch[1]);
                const descriptionMatch = /<p[^>]*>([^<]+)<\/p>/i.exec(toolCardMatch[1]);
                
                if (nameMatch) {
                  const tool = {
                    name: nameMatch[1].trim(),
                    description: descriptionMatch ? descriptionMatch[1].trim() : '',
                    parameters: [],
                    category: 'unknown'
                  };
                  
                  tools.push(tool);
                }
              }
            } catch (parseError) {
              console.error('Error parsing HTML for tools:', parseError);
            }
          }
          
          // If no tools found from HTML or no HTML available, try markdown
          if (tools.length === 0 && data.markdown) {
            try {
              // Use the existing text-based extraction function
              const markdownTools = extractToolsFromText(data.markdown);
              tools.push(...markdownTools);
            } catch (markdownError) {
              console.error('Error extracting tools from markdown:', markdownError);
            }
          }
        } else {
          console.log('No HTML or markdown content in Firecrawl API response');
        }
        
        console.log(`Successfully extracted ${tools.length} tools from Firecrawl API content`);
        
        return { tools };
      },
      `${url}?t=${Date.now()}`, // Add timestamp as query param to force fresh URL cache key
      { requestType: 'tools' },
      { 
        maxAgeMs: 0, // Disable caching completely for tools
        retryOptions: {
          maxRetries: 5,
          initialDelay: 5000,
          maxDelay: 60000,
          logPrefix: 'TOOLS API'
        }
      }
    );
  } catch (error) {
    console.error(`Error extracting Tools tab data:`, error);
    return { tools: [] };
  }
}

/**
 * Extract data from the Overview tab
 * @param {string} url URL to the Overview tab
 * @returns {Promise<Object>} Extracted data
 */
async function extractOverviewTab(url) {
try {
console.log(`Extracting data from Overview tab: ${url}`);
  
// Use cachedApiCall to handle caching and retries
return await cachedApiCall(
  async () => {
    // Use our Puppeteer-based extractor
    const overviewData = await puppeteerUtils.extractOverviewData(url);
    
    // Ensure we have the required structure even if some data is missing
    const result = {
      name: overviewData.name || '',
      description: overviewData.description || '',
      authorName: overviewData.authorName || '',
      stars: overviewData.stars || 0,
      installCommands: overviewData.installCommands || {
        linux: '',
        macos: '',
        windows: ''
      },
      compatibleClients: overviewData.compatibleClients || []
    };
    
    // Ensure installCommands has all required platforms
    const requiredPlatforms = ['linux', 'macos', 'windows'];
    requiredPlatforms.forEach(platform => {
      if (!result.installCommands[platform]) {
        result.installCommands[platform] = '';
      }
    });
    
    return result;
  },
  url,
  { requestType: 'overview' },
  { 
    maxRetries: 3, 
    initialDelay: 5000, 
    maxDelay: 15000,
    logPrefix: 'OVERVIEW API'
  }
);
} catch (error) {
console.error(`Error extracting overview data:`, error);
return {};
}
}

/**
 * Extract data from the API tab using Puppeteer
 * @param {string} url URL to the API tab
 * @returns {Promise<Object>} Extracted data
 */
async function extractApiTab(url) {
  try {
    console.log(`Extracting data from API tab using Puppeteer: ${url}`);
    
    // Use cachedApiCall to handle caching and retries
    return await cachedApiCall(
      async () => {
        // Use our Puppeteer-based API extractor
        const apiData = await puppeteerUtils.extractApiData(url);
        
        // Ensure we have the required structure even if some data is missing
        const result = {
          install_code_blocks: apiData.install_code_blocks || {
            npm: '',
            pip: '',
            cargo: '',
            go: '',
            docker: '',
            other: ''
          },
          example_code: apiData.example_code || {
            javascript: '',
            python: '',
            typescript: '',
            rust: '',
            go: '',
            java: '',
            other: ''
          }
        };
        
        console.log(`Successfully extracted API data with Puppeteer`);
        return result;
      },
      url,
      { requestType: 'api' },
      { 
        maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours cache
        retryOptions: {
          maxRetries: 3,
          initialDelay: 5000,
          maxDelay: 30000,
          logPrefix: 'API PUPPETEER'
        }
      }
    );
  } catch (error) {
    console.error(`Error extracting API tab data with Puppeteer:`, error);
    return { install_code_blocks: {}, example_code: {} };
  }
}

/**
 * Process a batch of Smithery.ai server URLs
 * @param {Array} serverUrls Array of server URLs
 * @param {Function} processServerFn Function to process each server
 * @param {Object} summary Summary object to update
 */
async function processBatch(serverUrls, processServerFn, summary) {
  const batchSize = parseInt(process.env.CRAWL_BATCH_SIZE || '5', 10);
  const delayMs = parseInt(process.env.CRAWL_DELAY_MS || '1000', 10);
  
  console.log(`Processing batch of ${serverUrls.length} servers with batch size ${batchSize} and delay ${delayMs}ms`);
  
  for (let i = 0; i < serverUrls.length; i += batchSize) {
    const batch = serverUrls.slice(i, i + batchSize);
    
    console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(serverUrls.length/batchSize)}`);
    
    const promises = batch.map(async (url) => {
      try {
        const serverData = await crawlSmitheryServer(url);
        summary.crawled++;
        
        if (processServerFn) {
          await processServerFn(serverData, summary);
        }
      } catch (error) {
        console.error(`Error processing server ${url}:`, error);
        summary.errors++;
        summary.details.errors.push({
          url,
          error: error.message
        });
      }
    });
    
    await Promise.all(promises);
    
    if (i + batchSize < serverUrls.length) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await delay(delayMs);
    }
  }
}

/**
 * Extract tool information from text content
 * @param {string} text Text content to extract tools from
 * @param {string} serverSlug Server slug for naming
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
      const descPattern = new RegExp(`${fullName}[^\n]*?[-:] ([^\n\.]{10,})`, 'i');
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

module.exports = {
  crawlSmitheryServer,
  processBatch
};
