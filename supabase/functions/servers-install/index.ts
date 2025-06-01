// servers-install/index.ts
// Edge function to retrieve server installation instructions

// Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define response headers with CORS support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the server ID from query parameters
    const url = new URL(req.url)
    const serverId = url.searchParams.get('id')

    if (!serverId) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Missing server ID parameter' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query installation instructions from the servers table
    const { data: server, error } = await supabase
      .from('servers')
      .select('id, name, install_instructions, install_code_blocks')
      .eq('id', serverId)
      .maybeSingle()

    if (error) {
      console.error(`Error fetching installation instructions: ${error.message}`)
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: `Database error: ${error.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    if (!server) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Server not found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Format installation instructions for the client
    const instructions = server.install_instructions || {
      linux: '# Installation instructions not available\nPlease check the official documentation.',
      macos: '# Installation instructions not available\nPlease check the official documentation.',
      windows: '# Installation instructions not available\nPlease check the official documentation.'
    }

    // Get available platforms from the instructions object
    const platforms = Object.keys(instructions)

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        instructions: instructions,
        platforms: platforms,
        defaultPlatform: platforms.includes('macos') ? 'macos' : platforms[0],
        codeBlocks: server.install_code_blocks || {}
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    // Handle unexpected errors
    console.error(`Unexpected error: ${error.message}`)
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: `Server error: ${error.message}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
