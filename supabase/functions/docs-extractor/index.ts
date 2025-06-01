import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';
import { parse as parseYaml } from 'https://deno.land/std@0.177.0/yaml/mod.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GitHub API token for authenticated requests
const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';

// Docs section keywords to identify documentation sections in README
const DOC_SECTIONS = [
  'api documentation',
  'api reference',
  'api usage',
  'endpoints',
  'routes',
  'how to use',
  'usage',
  'documentation',
  'api',
  'methods'
];

/**
 * Documentation extractor for MCP servers
 * 
 * This function:
 * 1. Retrieves MCP servers that need documentation extraction
 * 2. Analyzes GitHub repositories for API documentation
 * 3. Extracts documentation from OpenAPI specs, markdown files, and READMEs
 * 4. Stores processed documentation in the database
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Get servers that need documentation extraction
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name, github_url')
      .is('last_docs_scan', null)
      .is('github_url', 'not.null')
      .limit(5);
    
    if (serversError) {
      throw new Error(`Error fetching servers: ${serversError.message}`);
    }
    
    const results = [];
    
    // Process each server
    for (const server of servers) {
      try {
        if (!server.github_url) {
          continue;
        }
        
        // Extract owner and repo name from GitHub URL
        const repoInfo = extractGitHubRepoInfo(server.github_url);
        if (!repoInfo) {
          console.log(`Invalid GitHub URL for server ${server.name}: ${server.github_url}`);
          continue;
        }
        
        const { owner, repo } = repoInfo;
        
        // Extract documentation
        const docsData = await extractDocumentation(owner, repo);
        
        // Store documentation
        await storeDocumentation(server.id, docsData);
        
        // Update server's last scan timestamp
        await supabase
          .from('servers')
          .update({ last_docs_scan: new Date().toISOString() })
          .eq('id', server.id);
        
        results.push({
          server_id: server.id,
          name: server.name,
          docs_sources: docsData.sources,
          status: 'success'
        });
      } catch (err) {
        console.error(`Error extracting documentation for ${server.name}:`, err);
        results.push({
          server_id: server.id,
          name: server.name,
          status: 'error',
          error: err.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        servers_processed: servers.length,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Documentation extraction error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

/**
 * Extract owner and repo name from a GitHub URL
 * 
 * @param githubUrl GitHub repository URL
 * @returns Object with owner and repo properties, or null if invalid
 */
function extractGitHubRepoInfo(githubUrl) {
  try {
    const url = new URL(githubUrl);
    if (url.hostname !== 'github.com') {
      return null;
    }
    
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    
    return {
      owner: parts[0],
      repo: parts[1]
    };
  } catch (err) {
    return null;
  }
}

/**
 * Extract documentation for a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Documentation data
 */
async function extractDocumentation(owner, repo) {
  const docsData = {
    html: '',
    sources: [],
    title: 'API Documentation'
  };
  
  try {
    // 1. Look for OpenAPI/Swagger spec files
    const openApiFiles = await findOpenApiFiles(owner, repo);
    if (openApiFiles.length > 0) {
      for (const file of openApiFiles) {
        const openApiContent = await extractOpenApiDoc(owner, repo, file);
        if (openApiContent) {
          docsData.html += openApiContent;
          docsData.sources.push('openapi');
        }
      }
    }
    
    // 2. Look for API markdown files
    const apiMarkdownFiles = await findApiMarkdownFiles(owner, repo);
    if (apiMarkdownFiles.length > 0) {
      for (const file of apiMarkdownFiles) {
        const markdownContent = await extractMarkdownDoc(owner, repo, file);
        if (markdownContent) {
          docsData.html += markdownContent;
          docsData.sources.push('markdown');
        }
      }
    }
    
    // 3. Extract from README if other methods didn't yield results
    if (docsData.html === '') {
      const readmeContent = await extractReadmeDoc(owner, repo);
      if (readmeContent) {
        docsData.html += readmeContent;
        docsData.sources.push('readme');
      }
    }
    
    // 4. Add CSS styles and format the final HTML
    if (docsData.html !== '') {
      docsData.html = addDocStyles(docsData.html);
    }
    
    return docsData;
  } catch (err) {
    console.error(`Error extracting documentation for ${owner}/${repo}:`, err);
    return docsData;
  }
}

/**
 * Find OpenAPI/Swagger specification files in a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Array of file paths
 */
async function findOpenApiFiles(owner, repo) {
  try {
    // Search for common OpenAPI/Swagger file patterns
    const searchPatterns = [
      'openapi.yaml', 'openapi.yml', 'openapi.json',
      'swagger.yaml', 'swagger.yml', 'swagger.json',
      'api.yaml', 'api.yml', 'api.json'
    ];
    
    const foundFiles = [];
    
    // Search the repository for matching files
    for (const pattern of searchPatterns) {
      try {
        const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(`filename:${pattern} repo:${owner}/${repo}`)}`;
        const response = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${githubToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            for (const item of data.items) {
              foundFiles.push(item.path);
            }
          }
        }
      } catch (err) {
        console.error(`Error searching for ${pattern} in ${owner}/${repo}:`, err);
      }
    }
    
    return foundFiles;
  } catch (err) {
    console.error(`Error finding OpenAPI files for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Find API documentation markdown files in a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Array of file paths
 */
async function findApiMarkdownFiles(owner, repo) {
  try {
    // Search for common API documentation markdown file patterns
    const searchPatterns = [
      'API.md', 'api.md', 
      'DOCS.md', 'docs.md',
      'DOCUMENTATION.md', 'documentation.md',
      'ENDPOINTS.md', 'endpoints.md'
    ];
    
    const foundFiles = [];
    
    // Search the repository for matching files
    for (const pattern of searchPatterns) {
      try {
        const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(`filename:${pattern} repo:${owner}/${repo}`)}`;
        const response = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${githubToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            for (const item of data.items) {
              foundFiles.push(item.path);
            }
          }
        }
      } catch (err) {
        console.error(`Error searching for ${pattern} in ${owner}/${repo}:`, err);
      }
    }
    
    // Also look in docs/ directory if it exists
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/docs`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${githubToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.name.endsWith('.md') && item.type === 'file') {
              foundFiles.push(item.path);
            }
          }
        }
      }
    } catch (err) {
      // Docs directory might not exist, which is fine
    }
    
    return foundFiles;
  } catch (err) {
    console.error(`Error finding API markdown files for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Extract and parse OpenAPI/Swagger documentation
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @param filePath Path to the OpenAPI/Swagger file
 * @returns HTML content
 */
async function extractOpenApiDoc(owner, repo, filePath) {
  try {
    // Fetch the file content
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'Authorization': `token ${githubToken}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const content = await response.text();
    let apiSpec;
    
    // Parse the content based on file extension
    if (filePath.endsWith('.json')) {
      apiSpec = JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      apiSpec = parseYaml(content);
    } else {
      return null;
    }
    
    // Simple OpenAPI to HTML conversion
    // In a production environment, you'd use a proper OpenAPI UI renderer
    let html = `<h1>${apiSpec.info?.title || 'API Documentation'}</h1>`;
    
    if (apiSpec.info?.description) {
      html += `<div class="api-description">${apiSpec.info.description}</div>`;
    }
    
    if (apiSpec.info?.version) {
      html += `<div class="api-version">Version: ${apiSpec.info.version}</div>`;
    }
    
    // Paths/Endpoints
    if (apiSpec.paths) {
      html += `<h2>Endpoints</h2>`;
      
      for (const [path, methods] of Object.entries(apiSpec.paths)) {
        html += `<div class="endpoint">`;
        html += `<h3>${path}</h3>`;
        
        for (const [method, details] of Object.entries(methods)) {
          if (method === 'parameters') continue; // Skip common parameters
          
          html += `<div class="method ${method.toLowerCase()}">`;
          html += `<h4 class="method-${method.toLowerCase()}">${method.toUpperCase()}</h4>`;
          
          if (details.summary || details.description) {
            html += `<p>${details.summary || details.description}</p>`;
          }
          
          // Parameters
          if (details.parameters && details.parameters.length > 0) {
            html += `<h5>Parameters</h5>`;
            html += `<table class="parameters">`;
            html += `<thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>`;
            html += `<tbody>`;
            
            for (const param of details.parameters) {
              html += `<tr>`;
              html += `<td>${param.name}</td>`;
              html += `<td>${param.in}</td>`;
              html += `<td>${param.schema?.type || '-'}</td>`;
              html += `<td>${param.required ? 'Yes' : 'No'}</td>`;
              html += `<td>${param.description || '-'}</td>`;
              html += `</tr>`;
            }
            
            html += `</tbody></table>`;
          }
          
          // Request body
          if (details.requestBody) {
            html += `<h5>Request Body</h5>`;
            const content = details.requestBody.content;
            
            if (content) {
              for (const [mediaType, mediaTypeObj] of Object.entries(content)) {
                html += `<div class="content-type">${mediaType}</div>`;
                
                if (mediaTypeObj.schema) {
                  html += `<pre><code>${JSON.stringify(mediaTypeObj.schema, null, 2)}</code></pre>`;
                }
              }
            }
          }
          
          // Responses
          if (details.responses) {
            html += `<h5>Responses</h5>`;
            html += `<table class="responses">`;
            html += `<thead><tr><th>Code</th><th>Description</th></tr></thead>`;
            html += `<tbody>`;
            
            for (const [code, response] of Object.entries(details.responses)) {
              html += `<tr>`;
              html += `<td>${code}</td>`;
              html += `<td>${response.description || '-'}</td>`;
              html += `</tr>`;
            }
            
            html += `</tbody></table>`;
          }
          
          html += `</div>`; // Close method
        }
        
        html += `</div>`; // Close endpoint
      }
    }
    
    return html;
  } catch (err) {
    console.error(`Error extracting OpenAPI doc from ${filePath} in ${owner}/${repo}:`, err);
    return null;
  }
}

/**
 * Extract and parse markdown API documentation
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @param filePath Path to the markdown file
 * @returns HTML content
 */
async function extractMarkdownDoc(owner, repo, filePath) {
  try {
    // Fetch the file content
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: {
        'Accept': 'application/vnd.github.v3.html',
        'Authorization': `token ${githubToken}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    // GitHub API converts markdown to HTML for us
    const html = await response.text();
    
    return html;
  } catch (err) {
    console.error(`Error extracting markdown doc from ${filePath} in ${owner}/${repo}:`, err);
    return null;
  }
}

/**
 * Extract API documentation from README
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns HTML content
 */
async function extractReadmeDoc(owner, repo) {
  try {
    // Fetch the README content
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        'Accept': 'application/vnd.github.v3.html',
        'Authorization': `token ${githubToken}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    // GitHub API converts markdown to HTML for us
    const html = await response.text();
    
    // Find API documentation sections in the README
    const $ = cheerio.load(html);
    let apiDocHtml = '';
    
    // Look for headings that indicate API documentation
    $('h1, h2, h3').each((i, el) => {
      const headingText = $(el).text().toLowerCase();
      
      for (const section of DOC_SECTIONS) {
        if (headingText.includes(section)) {
          // Found an API documentation section
          const tagName = el.tagName.toLowerCase();
          const level = parseInt(tagName.substring(1), 10);
          
          // Extract content until next heading of same or higher level
          let sectionContent = `<${tagName}>${$(el).html()}</${tagName}>`;
          let nextEl = $(el).next();
          
          while (nextEl.length > 0) {
            const nextTagName = nextEl.prop('tagName');
            
            if (nextTagName && 
                nextTagName.toLowerCase().startsWith('h') && 
                parseInt(nextTagName.toLowerCase().substring(1), 10) <= level) {
              break;
            }
            
            sectionContent += nextEl.clone().wrap('<div>').parent().html();
            nextEl = nextEl.next();
          }
          
          apiDocHtml += sectionContent;
        }
      }
    });
    
    return apiDocHtml;
  } catch (err) {
    console.error(`Error extracting README doc for ${owner}/${repo}:`, err);
    return null;
  }
}

/**
 * Add CSS styles to the documentation HTML
 * 
 * @param html Raw HTML content
 * @returns Styled HTML content
 */
function addDocStyles(html) {
  return `
    <style>
      .api-docs {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
        margin: 0 auto;
      }
      
      .api-docs h1 {
        font-size: 2em;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        padding-bottom: 0.25em;
        border-bottom: 1px solid #eaecef;
      }
      
      .api-docs h2 {
        font-size: 1.5em;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        padding-bottom: 0.25em;
        border-bottom: 1px solid #eaecef;
      }
      
      .api-docs h3 {
        font-size: 1.25em;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      
      .api-docs h4 {
        font-size: 1em;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      
      .api-docs h5 {
        font-size: 0.875em;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      
      .api-docs p {
        margin-top: 0;
        margin-bottom: 1em;
      }
      
      .api-docs table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1em;
      }
      
      .api-docs table th,
      .api-docs table td {
        padding: 0.5em;
        border: 1px solid #ddd;
        text-align: left;
      }
      
      .api-docs table th {
        background-color: #f6f8fa;
        font-weight: 600;
      }
      
      .api-docs pre {
        background-color: #f6f8fa;
        border-radius: 3px;
        padding: 1em;
        overflow: auto;
        margin-bottom: 1em;
      }
      
      .api-docs code {
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        font-size: 0.875em;
        background-color: rgba(27, 31, 35, 0.05);
        border-radius: 3px;
        padding: 0.2em 0.4em;
      }
      
      .api-docs pre code {
        background-color: transparent;
        padding: 0;
      }
      
      .api-docs .endpoint {
        margin-bottom: 2em;
        border: 1px solid #eaecef;
        border-radius: 3px;
        padding: 1em;
      }
      
      .api-docs .method {
        margin-bottom: 1em;
        padding: 0.5em;
        border-radius: 3px;
      }
      
      .api-docs .method-get {
        color: #0c5460;
        background-color: #d1ecf1;
      }
      
      .api-docs .method-post {
        color: #155724;
        background-color: #d4edda;
      }
      
      .api-docs .method-put {
        color: #856404;
        background-color: #fff3cd;
      }
      
      .api-docs .method-delete {
        color: #721c24;
        background-color: #f8d7da;
      }
      
      .api-docs .api-description {
        margin-bottom: 1em;
      }
      
      .api-docs .api-version {
        color: #6c757d;
        font-size: 0.875em;
        margin-bottom: 1.5em;
      }
      
      .api-docs .content-type {
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        font-size: 0.875em;
        color: #6c757d;
        margin-bottom: 0.5em;
      }
    </style>
    <div class="api-docs">
      ${html}
    </div>
  `;
}

/**
 * Store documentation in the database
 * 
 * @param serverId Server ID
 * @param docsData Documentation data
 */
async function storeDocumentation(serverId, docsData) {
  try {
    // Store the documentation
    const { error } = await supabase
      .from('server_documentation')
      .upsert({
        server_id: serverId,
        title: docsData.title,
        content_html: docsData.html,
        sources: docsData.sources,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw error;
    }
  } catch (err) {
    console.error(`Error storing documentation for server ${serverId}:`, err);
    throw err;
  }
}
