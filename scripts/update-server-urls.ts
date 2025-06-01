import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Interface for server record
 */
interface ServerRecord {
  id: string;
  name: string;
  health_check_url: string | null;
  api_documentation: any; // JSONB type in the database
  github_url: string | null;
}

/**
 * URL update mapping for MCP servers
 */
interface ServerUrlMap {
  oldDomain: string;
  newDomain: string;
}

/**
 * Main function to update server URLs
 */
async function updateServerUrls() {
  console.log('🔄 Updating MCP server URLs for production use...');
  
  try {
    // Get all test servers we care about
    const { data: servers, error } = await supabase
      .from('servers')
      .select('id, name, health_check_url, api_documentation, github_url')
      .in('name', [
        'puppeteer-mcp', 
        'supabase-mcp-server', 
        'linear-mcp', 
        'firecrawl-mcp', 
        'hubspot-mcp', 
        'gitmcp', 
        'netlify-mcp', 
        'pulsemcp', 
        'brave-search'
      ]);
    
    if (error) throw error;
    
    if (!servers || servers.length === 0) {
      console.log('ℹ️ No servers found to update.');
      return;
    }
    
    console.log(`🔍 Found ${servers.length} servers to update.`);
    
    // Define new URL mappings
    const urlMappings: Record<string, ServerUrlMap> = {
      'standard_mcp_api': {
        oldDomain: 'mcpland.cloud',
        newDomain: 'windsurf.cloud'
      },
      'alternative_api': {
        oldDomain: 'mcpland.cloud',
        newDomain: 'windsurf.cloud'
      },
      'github_repository': {
        oldDomain: 'pulsemcp.com',
        newDomain: 'mcp-directory.windsurf.cloud'
      }
    };
    
    // Generate updates for each server
    const serverUrlUpdates = servers.map(server => {
      let apiDocumentation: string | null = null;
      let healthCheckUrl: string | null = server.health_check_url;
      let mapping: ServerUrlMap | null = null;
      
      // Determine which detection tier the server belongs to
      if (['puppeteer-mcp', 'supabase-mcp-server', 'linear-mcp'].includes(server.name)) {
        // Tier 1: Standard MCP API
        mapping = urlMappings.standard_mcp_api;
        apiDocumentation = `https://${server.name}.${mapping.newDomain}/api`;
      } else if (['firecrawl-mcp', 'hubspot-mcp'].includes(server.name)) {
        // Tier 2: Alternative API
        mapping = urlMappings.alternative_api;
        apiDocumentation = `https://${server.name}.${mapping.newDomain}/api`;
      } else if (['gitmcp', 'netlify-mcp', 'pulsemcp', 'brave-search'].includes(server.name)) {
        // Tier 3: GitHub repository - just keep github_url, but update health_check_url
        mapping = urlMappings.github_repository;
        if (healthCheckUrl && healthCheckUrl.includes(mapping.oldDomain)) {
          healthCheckUrl = healthCheckUrl.replace(mapping.oldDomain, mapping.newDomain);
        } else {
          healthCheckUrl = `https://${mapping.newDomain}/servers/${server.name}`;
        }
      }
      
      return {
        id: server.id,
        name: server.name,
        old_api_url: typeof server.api_documentation === 'string' ? server.api_documentation : JSON.stringify(server.api_documentation),
        new_api_url: apiDocumentation,
        old_health_url: server.health_check_url,
        new_health_url: healthCheckUrl
      };
    });
    
    console.log('📝 Planned URL updates:');
    for (const update of serverUrlUpdates) {
      console.log(`  🔹 ${update.name}:`);
      if (update.old_api_url !== update.new_api_url) {
        console.log(`    API: ${update.old_api_url} → ${update.new_api_url}`);
      }
      if (update.old_health_url !== update.new_health_url) {
        console.log(`    Health: ${update.old_health_url} → ${update.new_health_url}`);
      }
    }
    
    // Update each server
    console.log('🚀 Updating server URLs...');
    for (const update of serverUrlUpdates) {
      // Handle api_documentation as either JSON or string based on server type
      let apiDocValue = update.new_api_url;
      
      // For GitHub repository servers, null is fine for api_documentation
      if (!update.new_api_url) {
        apiDocValue = null;
      }
      
      // Update the server record
      const { error: updateError } = await supabase
        .from('servers')
        .update({
          api_documentation: apiDocValue,
          health_check_url: update.new_health_url
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${update.name}:`, updateError);
      } else {
        console.log(`✅ Updated ${update.name}`);
      }
      
      // Add a small delay between updates to avoid rate limits
      await setTimeout(100);
    }
    
    console.log('✅ Server URL updates completed successfully!');
  } catch (error) {
    console.error('❌ Error updating server URLs:', error);
  }
}

// Run the update
updateServerUrls().catch(console.error);
