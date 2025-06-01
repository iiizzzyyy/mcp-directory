import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Basic tool parameter interface
interface ToolParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

// Basic tool interface
interface Tool {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  parameters: ToolParameter[];
  detection_source?: string;
}

/**
 * Directly test API endpoints for a server
 */
async function testApiEndpoints() {
  console.log('🔍 API Endpoint Detection Debugger');
  console.log('=================================\n');

  // Get test servers that should have API endpoints
  const { data: servers, error } = await supabase
    .from('servers')
    .select('id, name, health_check_url, api_documentation')
    .in('name', ['supabase-mcp-server', 'puppeteer-mcp', 'linear-mcp'])
    .order('name');

  if (error) {
    console.error('❌ Error fetching servers:', error);
    return;
  }

  console.log(`Found ${servers.length} servers to test\n`);

  for (const server of servers) {
    console.log(`\n🔍 Testing server: ${server.name}`);
    console.log(`  api_documentation: ${server.api_documentation || 'None'}`);
    console.log(`  health_check_url: ${server.health_check_url || 'None'}`);

    // Skip servers without any URLs
    if (!server.api_documentation && !server.health_check_url) {
      console.log('  ⚠️ No URLs to test, skipping');
      continue;
    }

    // Test standard MCP endpoint
    if (server.api_documentation) {
      await testEndpoint(
        `${server.api_documentation.replace(/\/$/, '')}/list_resources`,
        'Standard MCP API'
      );
    }

    // Test alternative endpoints
    const baseUrl = server.api_documentation || server.health_check_url;
    if (baseUrl) {
      const alternativeEndpoints = [
        `${baseUrl.replace(/\/$/, '')}/tools`,
        `${baseUrl.replace(/\/$/, '')}/functions`,
        `${baseUrl.replace(/\/$/, '')}/api/tools`,
        `${baseUrl.replace(/\/$/, '')}/api/functions`,
        `${baseUrl.replace(/\/$/, '')}/schema`,
        `${baseUrl.replace(/\/$/, '')}/api/schema`
      ];

      for (const endpoint of alternativeEndpoints) {
        await testEndpoint(endpoint, 'Alternative API');
      }
    }
  }
}

/**
 * Test a specific endpoint
 */
async function testEndpoint(endpoint: string, tier: string) {
  console.log(`  🔗 Testing ${tier} endpoint: ${endpoint}`);
  
  try {
    // Try with a timeout to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`    ❌ Status: ${response.status} ${response.statusText}`);
      return;
    }
    
    console.log(`    ✅ Status: ${response.status} ${response.statusText}`);
    
    // Parse response
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.log(`    ⚠️ Non-JSON response: ${contentType}`);
      const text = await response.text();
      console.log(`    Response (first 150 chars): ${text.substring(0, 150)}...`);
      return;
    }
    
    const data = await response.json();
    
    // Check for data array
    const hasDataArray = Array.isArray(data?.data) || Array.isArray(data);
    console.log(`    📊 Contains data array: ${hasDataArray ? '✅' : '❌'}`);
    
    // Get the tools array
    const rawTools: any[] = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    
    if (Array.isArray(rawTools)) {
      console.log(`    🛠️ Found ${rawTools.length} potential tools`);
      
      // Extract and process tools
      const tools: Tool[] = [];
      for (const rawTool of rawTools) {
        if (rawTool?.name) {
          tools.push({
            name: rawTool.name,
            description: rawTool.description || '',
            method: rawTool.method || 'POST',
            endpoint: rawTool.endpoint || '',
            parameters: []
          });
        }
      }
      
      console.log(`    ✅ Successfully processed ${tools.length} valid tools`);
      
      if (tools.length > 0) {
        console.log('    📋 Tools detected:');
        for (const tool of tools) {
          console.log(`      - ${tool.name}: ${tool.description.substring(0, 50)}...`);
        }
      }
    } else {
      console.log('    ❌ Data is not an array');
      console.log(`    Data type: ${typeof rawTools}`);
      
      // Special handling for OpenAPI/Swagger
      if (data.openapi || data.swagger) {
        console.log('    📚 Found OpenAPI/Swagger spec');
        const paths = data.paths || {};
        const pathCount = Object.keys(paths).length;
        console.log(`    📊 Found ${pathCount} paths in OpenAPI spec`);
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('    ⚠️ Request timed out after 5 seconds');
    } else {
      console.log(`    ❌ Error: ${err.message}`);
    }
  }
}

// Run the test
testApiEndpoints().catch(console.error);
