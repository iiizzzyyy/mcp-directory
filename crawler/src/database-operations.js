const { createClient } = require('@supabase/supabase-js');
const { extractReadmeData } = require('./readme-parser');
const { slugify } = require('./utils');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a server already exists in the database
 * @param {Object} server Server data
 * @returns {Promise<boolean>} True if server exists, along with existing server data if found
 */
async function serverExists(server) {
  try {
    // First check by GitHub URL if available
    if (server.github_url) {
      const { data: githubData, error: githubError } = await supabase
        .from('servers')
        .select('id, name, slug')
        .eq('github_url', server.github_url)
        .maybeSingle();
        
      if (githubError) {
        console.error('Error checking server by GitHub URL:', githubError);
      } else if (githubData) {
        console.log(`Server exists with GitHub URL ${server.github_url}: ${githubData.name} (${githubData.id})`);
        return { exists: true, data: githubData };
      }
    }
    
    // Then check by slug
    const { data: slugData, error: slugError } = await supabase
      .from('servers')
      .select('id, name, slug')
      .eq('slug', server.slug)
      .maybeSingle();
      
    if (slugError) {
      console.error('Error checking server by slug:', slugError);
    } else if (slugData) {
      console.log(`Server exists with slug ${server.slug}: ${slugData.name} (${slugData.id})`);
      return { exists: true, data: slugData };
    }
    
    // Finally check by name
    const { data: nameData, error: nameError } = await supabase
      .from('servers')
      .select('id, name, slug')
      .ilike('name', server.name)
      .maybeSingle();
      
    if (nameError) {
      console.error('Error checking server by name:', nameError);
    } else if (nameData) {
      console.log(`Server exists with name ${server.name}: ${nameData.name} (${nameData.id})`);
      return { exists: true, data: nameData };
    }
    
    // Server doesn't exist
    return { exists: false, data: null };
  } catch (error) {
    console.error('Unexpected error checking if server exists:', error);
    return { exists: false, data: null };
  }
}

/**
 * Insert a server into the database with all related data
 * @param {Object} server Server data
 * @returns {Promise<Object>} Result of the insert operation
 */
async function insertServer(server) {
  try {
    console.log(`Inserting server: ${server.name}`);
    
    // Ensure we have a valid slug
    if (!server.slug) {
      server.slug = slugify(server.name);
    }
    
    // Make sure install_instructions is valid
    if (!server.install_instructions || typeof server.install_instructions !== 'object') {
      server.install_instructions = { linux: {}, macos: {}, windows: {} };
    }
    
    // Prepare server record with appropriate types
    const serverRecord = {
      name: server.name,
      slug: server.slug,
      owner: server.owner || null,
      description: server.description || null,
      category: server.category || null,
      tags: Array.isArray(server.tags) ? server.tags : [],
      github_url: server.github_url || null,
      source_code_url: server.source_code_url || server.github_url || null,
      homepage_url: server.homepage_url || null,
      stars: typeof server.stars === 'number' ? server.stars : parseInt(server.stars) || 0,
      forks: typeof server.forks === 'number' ? server.forks : parseInt(server.forks) || 0,
      open_issues: typeof server.open_issues === 'number' ? server.open_issues : parseInt(server.open_issues) || 0,
      contributors: typeof server.contributors === 'number' ? server.contributors : parseInt(server.contributors) || 0,
      contributors_list: server.contributors_list || null,
      last_updated: server.last_updated || new Date().toISOString(),
      monthly_tool_calls: typeof server.monthly_tool_calls === 'number' ? server.monthly_tool_calls : parseInt(server.monthly_tool_calls) || 0,
      success_rate: typeof server.success_rate === 'number' ? server.success_rate : parseFloat(server.success_rate) || 0,
      average_response_time: typeof server.average_response_time === 'number' ? server.average_response_time : parseInt(server.average_response_time) || 0,
      active_users: typeof server.active_users === 'number' ? server.active_users : parseInt(server.active_users) || 0,
      tools_count: Array.isArray(server.tools) ? server.tools.length : (typeof server.tools_count === 'number' ? server.tools_count : 0),
      readme_overview: server.readme_overview || null,
      license: server.license || null,
      version: server.version || null,
      deploy_branch: server.deploy_branch || null,
      deploy_commit: server.deploy_commit || null,
      security_audit: server.security_audit || null,
      verification_status: server.verification_status || null,
      pricing_details: server.pricing_details || null,
      is_local: !!server.is_local,
      published_date: server.published_date || null,
      install_instructions: server.install_instructions,
      install_code_blocks: server.install_code_blocks || null,
      example_code: server.example_code || null,
      platform: server.platform || 'server',
      source: server.source || 'smithery',
      health_check_url: server.health_check_url || null,
      icon_url: server.icon_url || null,
    };
    
    // Insert server record
    console.log('Inserting server record with data:', JSON.stringify(serverRecord, null, 2));
    const { data: serverData, error: serverError } = await supabase
      .from('servers')
      .insert(serverRecord)
      .select('id')
      .single();
      
    if (serverError) {
      console.error('Error inserting server:', serverError);
      throw new Error(`Failed to insert server: ${serverError.message}`);
    }
    
    const serverId = serverData.id;
    console.log(`Successfully inserted server with ID: ${serverId}`);
    
    // Insert server tools if available
    if (Array.isArray(server.tools) && server.tools.length > 0) {
      await insertServerTools(serverId, server.tools);
    }
    
    // Insert server metrics
    await insertServerMetrics(serverId, server);
    
    // Insert health data
    await insertHealthData(serverId, server);
    
    // Insert compatible clients if available
    if (Array.isArray(server.compatible_clients) && server.compatible_clients.length > 0) {
      await insertCompatibleClients(serverId, server.compatible_clients);
    }
    
    return serverId;
  } catch (error) {
    console.error('Error inserting server:', error);
    throw error;
  }
}

/**
 * Insert tools for a server
 * @param {string} serverId Server ID
 * @param {Array} tools Array of tool data
 */
async function insertServerTools(serverId, tools) {
  try {
    // Log incoming tools array for debugging
    console.log(`Attempting to insert ${tools ? tools.length : 0} tools for server ${serverId}`);
    console.log(`Tools array type: ${typeof tools}`);
    
    // Guard against invalid tool data
    if (!tools || !Array.isArray(tools) || tools.length === 0) {
      console.warn(`No valid tools to insert for server ${serverId}`);  
      return;
    }
    
    console.log(`Inserting ${tools.length} tools for server ${serverId}`);
    console.log(`First tool example: ${JSON.stringify(tools[0])}`);
    
    for (const tool of tools) {
      // Format the tool data
      const toolRecord = {
        server_id: serverId,
        name: tool.name,
        description: tool.description || null,
        parameters: Array.isArray(tool.parameters) ? tool.parameters : null,
        return_type: tool.return_type || null,
        example: tool.example || null,
        is_active: true
      };
      
      // Insert the tool
      const { data: toolData, error: toolError } = await supabase
        .from('server_tools')
        .insert(toolRecord)
        .select('id')
        .single();
        
      if (toolError) {
        console.error(`Error inserting tool ${tool.name}:`, toolError);
      } else {
        console.log(`Successfully inserted tool ${tool.name} with ID: ${toolData.id}`);
      }
    }
  } catch (error) {
    console.error('Error inserting server tools:', error);
  }
}

/**
 * Insert metrics for a server
 * @param {string} serverId Server ID
 * @param {Object} server Server data
 */
async function insertServerMetrics(serverId, server) {
  try {
    console.log(`Inserting metrics for server ${serverId}`);
    
    // Only insert metrics if we have meaningful data
    if (server.monthly_tool_calls || server.success_rate || server.average_response_time || server.active_users) {
      const metricsRecord = {
        server_id: serverId,
        monthly_tool_calls: typeof server.monthly_tool_calls === 'number' ? server.monthly_tool_calls : parseInt(server.monthly_tool_calls) || 0,
        success_rate: typeof server.success_rate === 'number' ? server.success_rate : parseFloat(server.success_rate) || 0,
        average_response_time: typeof server.average_response_time === 'number' ? server.average_response_time : parseInt(server.average_response_time) || 0,
        active_users: typeof server.active_users === 'number' ? server.active_users : parseInt(server.active_users) || 0
      };
      
      const { error: metricsError } = await supabase
        .from('server_metrics')
        .insert(metricsRecord);
        
      if (metricsError) {
        console.error('Error inserting server metrics:', metricsError);
      } else {
        console.log(`Successfully inserted metrics for server ${serverId}`);
      }
    } else {
      console.log(`No meaningful metrics found for server ${serverId}, skipping`);
    }
  } catch (error) {
    console.error('Error inserting server metrics:', error);
  }
}

/**
 * Insert health data for a server
 * @param {string} serverId Server ID
 * @param {Object} server Server data
 */
async function insertHealthData(serverId, server) {
  try {
    console.log(`Inserting health data for server ${serverId}`);
    
    // Default health status based on verification status
    const status = server.verification_status === 'verified' ? 'online' : 'unknown';
    
    const healthRecord = {
      server_id: serverId,
      status: status,
      verification_status: server.verification_status || null,
      uptime_percentage: server.uptime_percentage || 0,
      response_time_ms: server.average_response_time || 0,
      check_method: 'scrape'
    };
    
    const { error: healthError } = await supabase
      .from('health_data')
      .insert(healthRecord);
      
    if (healthError) {
      console.error('Error inserting health data:', healthError);
    } else {
      console.log(`Successfully inserted health data for server ${serverId}`);
    }
  } catch (error) {
    console.error('Error inserting health data:', error);
  }
}

/**
 * Insert compatible clients for a server
 * @param {string} serverId Server ID
 * @param {Array} clients Array of client data
 */
async function insertCompatibleClients(serverId, clients) {
  try {
    console.log(`Inserting ${clients.length} compatible clients for server ${serverId}`);
    
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      
      const clientRecord = {
        server_id: serverId,
        name: client.name,
        icon_url: client.icon_url || null,
        website_url: client.website_url || null,
        priority: i + 1
      };
      
      const { error: clientError } = await supabase
        .from('compatible_clients')
        .insert(clientRecord);
        
      if (clientError) {
        console.error(`Error inserting compatible client ${client.name}:`, clientError);
      } else {
        console.log(`Successfully inserted compatible client ${client.name}`);
      }
    }
  } catch (error) {
    console.error('Error inserting compatible clients:', error);
  }
}

/**
 * Update an existing server with new data
 * @param {string} serverId Server ID
 * @param {Object} server New server data
 * @returns {Promise<boolean>} Success status
 */
async function updateServer(serverId, server) {
  try {
    console.log(`Updating server ${serverId} with new data`);
    
    // First, get existing server data
    const { data: existingServer, error: getError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single();
      
    if (getError) {
      console.error(`Error getting existing server ${serverId}:`, getError);
      return false;
    }
    
    // Prepare update record with only changed fields
    const updateRecord = {};
    const fieldsToUpdate = [
      'name', 'description', 'category', 'tags', 'github_url', 'source_code_url', 'homepage_url',
      'stars', 'forks', 'open_issues', 'contributors', 'contributors_list', 'last_updated',
      'monthly_tool_calls', 'success_rate', 'average_response_time', 'active_users', 'tools_count',
      'readme_overview', 'license', 'version', 'deploy_branch', 'deploy_commit',
      'security_audit', 'verification_status', 'pricing_details', 'is_local', 'published_date',
      'install_instructions', 'install_code_blocks', 'example_code', 'platform', 'health_check_url', 'icon_url'
    ];
    
    for (const field of fieldsToUpdate) {
      if (server[field] !== undefined && 
          JSON.stringify(server[field]) !== JSON.stringify(existingServer[field])) {
        updateRecord[field] = server[field];
      }
    }
    
    // Only update if we have changes
    if (Object.keys(updateRecord).length === 0) {
      console.log(`No changes detected for server ${serverId}, skipping update`);
      return true;
    }
    
    // Add updated_at timestamp
    updateRecord.updated_at = new Date().toISOString();
    
    // Update the server
    const { error: updateError } = await supabase
      .from('servers')
      .update(updateRecord)
      .eq('id', serverId);
      
    if (updateError) {
      console.error(`Error updating server ${serverId}:`, updateError);
      return false;
    }
    
    console.log(`Successfully updated server ${serverId}`);
    
    // Update related data if needed
    if (Array.isArray(server.tools)) {
      // First delete existing tools
      await supabase.from('server_tools').delete().eq('server_id', serverId);
      // Then insert new tools
      await insertServerTools(serverId, server.tools);
    }
    
    if (server.monthly_tool_calls || server.success_rate || server.average_response_time || server.active_users) {
      await insertServerMetrics(serverId, server);
    }
    
    if (Array.isArray(server.compatible_clients)) {
      // First delete existing clients
      await supabase.from('compatible_clients').delete().eq('server_id', serverId);
      // Then insert new clients
      await insertCompatibleClients(serverId, server.compatible_clients);
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating server ${serverId}:`, error);
    return false;
  }
}

/**
 * Verify data consistency across all tables
 * @returns {Promise<Object>} Verification results
 */
async function verifyDataConsistency() {
  const results = {
    servers: 0,
    tools: 0,
    metrics: 0,
    health: 0,
    clients: 0,
    issues: []
  };
  
  try {
    console.log('Verifying data consistency...');
    
    // Get all servers
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name, slug');
      
    if (serversError) {
      console.error('Error getting servers:', serversError);
      results.issues.push({ type: 'servers', error: serversError.message });
      return results;
    }
    
    results.servers = servers.length;
    console.log(`Found ${servers.length} servers`);
    
    // Check for each server
    for (const server of servers) {
      // Check for tools
      const { data: tools, error: toolsError } = await supabase
        .from('server_tools')
        .select('id')
        .eq('server_id', server.id);
        
      if (toolsError) {
        results.issues.push({ type: 'tools', server: server.name, error: toolsError.message });
      } else {
        results.tools += tools.length;
      }
      
      // Check for metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('server_metrics')
        .select('id')
        .eq('server_id', server.id);
        
      if (metricsError) {
        results.issues.push({ type: 'metrics', server: server.name, error: metricsError.message });
      } else {
        results.metrics += metrics.length;
      }
      
      // Check for health data
      const { data: health, error: healthError } = await supabase
        .from('health_data')
        .select('id')
        .eq('server_id', server.id);
        
      if (healthError) {
        results.issues.push({ type: 'health', server: server.name, error: healthError.message });
      } else {
        results.health += health.length;
      }
      
      // Check for compatible clients
      const { data: clients, error: clientsError } = await supabase
        .from('compatible_clients')
        .select('id')
        .eq('server_id', server.id);
        
      if (clientsError) {
        results.issues.push({ type: 'clients', server: server.name, error: clientsError.message });
      } else {
        results.clients += clients.length;
      }
    }
    
    console.log('Verification completed:');
    console.log(`- Servers: ${results.servers}`);
    console.log(`- Tools: ${results.tools}`);
    console.log(`- Metrics: ${results.metrics}`);
    console.log(`- Health records: ${results.health}`);
    console.log(`- Compatible clients: ${results.clients}`);
    console.log(`- Issues: ${results.issues.length}`);
    
    return results;
  } catch (error) {
    console.error('Error verifying data consistency:', error);
    results.issues.push({ type: 'general', error: error.message });
    return results;
  }
}

module.exports = {
  supabase,
  serverExists,
  insertServer,
  updateServer,
  verifyDataConsistency,
  // Export internal functions for testing
  insertServerTools,
  insertServerMetrics,
  insertHealthData,
  insertCompatibleClients
};
