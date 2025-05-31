/**
 * API Documentation Generator Edge Function
 * Generates HTML documentation for MCP server APIs based on server metadata
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400' // 24 hours
}

interface ServerEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: Parameter[];
  responses?: Record<string, Response>;
}

interface Parameter {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description: string;
}

interface Response {
  description: string;
  schema?: Record<string, unknown>;
}

interface ServerData {
  id: string;
  name: string;
  description: string;
  github_url: string;
  endpoints?: string[];
  api_methods?: Record<string, string[]>;
  api_documentation?: Record<string, ServerEndpoint>;
}

Deno.serve(async (req) => {
  console.log('Received request:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract the server ID from the URL
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const serverId = parts[parts.length - 1];

    if (!serverId) {
      return new Response(
        JSON.stringify({ error: 'Server ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client using environment variables
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query the server data from the database
    const { data: serverData, error } = await supabaseClient
      .from('servers')
      .select('id, name, description, github_url, endpoints, api_methods, api_documentation')
      .eq('id', serverId)
      .single();

    if (error || !serverData) {
      console.error('Error fetching server data:', error);
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: `Server with ID ${serverId} not found` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate documentation HTML based on server data
    const documentationHtml = generateDocumentation(serverData);

    // Return the HTML documentation
    return new Response(
      JSON.stringify({ 
        success: true, 
        html: documentationHtml 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Error generating documentation:', err);
    
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: 'Failed to generate documentation', 
        details: err.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Generate HTML documentation from server data
 * 
 * @param serverData The server data to generate documentation from
 * @returns HTML documentation string
 */
function generateDocumentation(serverData: ServerData): string {
  let html = `
    <div class="documentation">
      <h1>${serverData.name} API Documentation</h1>
      <p>${serverData.description}</p>
      
      <h2>Getting Started</h2>
      <p>To use the ${serverData.name} MCP server, you'll need to include it in your project.</p>
      <pre><code>npm install ${serverData.name.toLowerCase().replace(/\s+/g, '-')}</code></pre>
      
      <h2>Basic Usage</h2>
      <pre><code>import { createClient } from '${serverData.name.toLowerCase().replace(/\s+/g, '-')}';

const client = createClient({
  // Your configuration options
});

// Now you can use the client to make API calls
</code></pre>
  `;

  // Add Endpoints section if available
  if (serverData.endpoints && serverData.endpoints.length > 0) {
    html += '<h2>Available Endpoints</h2><ul>';
    
    serverData.endpoints.forEach(endpoint => {
      const methods = serverData.api_methods?.[endpoint] || ['GET'];
      const methodsStr = methods.join(', ');
      
      html += `<li><strong>${endpoint}</strong> - Supported methods: ${methodsStr}</li>`;
    });
    
    html += '</ul>';
  }

  // Add detailed API documentation if available
  if (serverData.api_documentation && Object.keys(serverData.api_documentation).length > 0) {
    html += '<h2>API Reference</h2>';
    
    for (const [path, endpoint] of Object.entries(serverData.api_documentation)) {
      html += `
        <div class="endpoint">
          <h3>${endpoint.method} ${path}</h3>
          <p>${endpoint.description}</p>
          
          ${endpoint.parameters && endpoint.parameters.length > 0 ? `
            <h4>Parameters</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Located in</th>
                  <th>Required</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${endpoint.parameters.map(param => `
                  <tr>
                    <td>${param.name}</td>
                    <td>${param.in}</td>
                    <td>${param.required ? 'Yes' : 'No'}</td>
                    <td>${param.type}</td>
                    <td>${param.description}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${endpoint.responses ? `
            <h4>Responses</h4>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(endpoint.responses).map(([code, response]) => `
                  <tr>
                    <td>${code}</td>
                    <td>${response.description}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>
      `;
    }
  } else {
    // If no specific API documentation is available, generate basic documentation
    // based on endpoints and methods
    if (serverData.endpoints && serverData.endpoints.length > 0) {
      html += '<h2>API Reference</h2>';
      
      serverData.endpoints.forEach(endpoint => {
        const methods = serverData.api_methods?.[endpoint] || ['GET'];
        
        methods.forEach(method => {
          html += `
            <div class="endpoint">
              <h3>${method} ${endpoint}</h3>
              <p>This endpoint allows you to interact with the ${serverData.name} service.</p>
              
              <h4>Example Usage</h4>
              <pre><code>const response = await client.${method.toLowerCase()}('${endpoint}', {
  // Your request parameters
});</code></pre>
            </div>
          `;
        });
      });
    }
  }

  // Add GitHub repository link
  html += `
    <h2>Additional Resources</h2>
    <ul>
      <li><a href="${serverData.github_url}" target="_blank">GitHub Repository</a></li>
      <li><a href="${serverData.github_url}/issues" target="_blank">Report Issues</a></li>
    </ul>
  `;

  return html;
}
