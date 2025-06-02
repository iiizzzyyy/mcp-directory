import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Check if GitHub token is configured
const githubToken = process.env.GITHUB_TOKEN;

async function debugToolsDetector() {
  console.log('🔗 Connected to Supabase project:', supabaseUrl);
  console.log('🔑 GitHub token is ' + (githubToken ? 'configured (✅)' : 'missing (❌)'));

  // Get a single server record
  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id, name, health_check_url, api_documentation, github_url')
    .eq('name', 'supabase-mcp-server')
    .single();

  if (serverError) {
    console.error('❌ Error fetching server:', serverError);
    return;
  }

  console.log('📋 Server details:');
  console.log(JSON.stringify(server, null, 2));

  try {
    // Call the tools-detector function directly with detailed logging
    console.log('⏳ Calling tools-detector function...');
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/tools-detector`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          server_ids: [server.id],
          force_refresh: true,
          run_mode: 'debug'
        })
      }
    );

    // Check response status
    console.log(`🔄 Response status: ${response.status} ${response.statusText}`);
    
    // Get response body
    const result = await response.json();
    console.log('📊 Response body:');
    console.log(JSON.stringify(result, null, 2));

    // Check logs
    console.log('📜 Checking function logs...');
    // Note: In a real implementation, we would fetch logs from Supabase here
    
    // Check if any tools were detected
    if (result.results && result.results.length > 0) {
      const serverResult = result.results[0];
      console.log(`🔍 Tools detected for ${serverResult.name}: ${serverResult.tools_detected || 0}`);
      
      if (serverResult.tools_detected && serverResult.tools_detected > 0) {
        // Fetch the detected tools from the database
        const { data: tools, error: toolsError } = await supabase
          .from('server_tools')
          .select('*')
          .eq('server_id', server.id);
          
        if (toolsError) {
          console.error('❌ Error fetching tools:', toolsError);
        } else {
          console.log('🛠️ Detected tools:');
          console.log(JSON.stringify(tools, null, 2));
        }
      } else {
        console.log('❌ No tools detected');
        
        if (serverResult.error) {
          console.error('🚨 Error during detection:', serverResult.error);
        }
      }
    } else {
      console.log('❌ No results returned from tools-detector');
    }
    
  } catch (error) {
    console.error('❌ Error calling tools-detector:', error);
  }
}

debugToolsDetector().catch(console.error);
