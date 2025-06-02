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
    // Get the server ID from query parameters or request body
    let serverId = null
    
    // Support both GET and POST methods for flexibility
    if (req.method === 'GET') {
      const url = new URL(req.url)
      serverId = url.searchParams.get('id')
    } else if (req.method === 'POST') {
      try {
        const body = await req.json()
        serverId = body.id
      } catch (e) {
        console.error('Error parsing request body:', e)
      }
    }

    if (!serverId) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Missing server ID parameter', 
          // Include default empty data structure to prevent client-side errors
          data: {
            instructions: {},
            platforms: [],
            defaultPlatform: '',
            codeBlocks: {}
          }
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

    // RESILIENCE IMPROVEMENT: Handle malformed install_instructions
    let instructions = {
      linux: '# Installation instructions not available\nPlease check the official documentation.',
      macos: '# Installation instructions not available\nPlease check the official documentation.',
      windows: '# Installation instructions not available\nPlease check the official documentation.'
    }
    
    if (server.install_instructions) {
      try {
        // If it's already a valid object, use it
        if (typeof server.install_instructions === 'object') {
          instructions = server.install_instructions
        } 
        // If it's a string that looks like JSON, try to parse it
        else if (typeof server.install_instructions === 'string' && 
                 server.install_instructions.trim().startsWith('{')) {
          try {
            instructions = JSON.parse(server.install_instructions)
          } catch (e) {
            console.error(`Error parsing install_instructions as JSON for server ${serverId}:`, e)
          }
        }
        // Otherwise create a default structure with the content
        else {
          const content = server.install_instructions?.toString() || ''
          instructions = {
            linux: content,
            macos: content,
            windows: content
          }
          console.warn(`Converted non-object install_instructions to standard format for server ${serverId}`)
        }
        
        // Ensure at least one platform exists
        if (Object.keys(instructions).length === 0) {
          instructions = {
            linux: '# Installation instructions not available\nPlease check the official documentation.',
            macos: '# Installation instructions not available\nPlease check the official documentation.',
            windows: '# Installation instructions not available\nPlease check the official documentation.'
          }
        }
      } catch (e) {
        console.error(`Error processing install_instructions for server ${serverId}:`, e)
      }
    }

    // RESILIENCE IMPROVEMENT: Handle malformed install_code_blocks
    let codeBlocks = {}
    if (server.install_code_blocks) {
      try {
        // If it's already a valid object, use it
        if (typeof server.install_code_blocks === 'object') {
          codeBlocks = server.install_code_blocks
        } 
        // If it's a string that looks like JSON, try to parse it
        else if (typeof server.install_code_blocks === 'string') {
          try {
            // Handle array-like strings like ["pip install x"] by converting to object
            if (server.install_code_blocks.trim().startsWith('[')) {
              const commands = JSON.parse(server.install_code_blocks)
              if (Array.isArray(commands) && commands.length > 0) {
                codeBlocks = { pip: commands[0] }
              }
            } 
            // Handle object-like strings
            else if (server.install_code_blocks.trim().startsWith('{')) {
              codeBlocks = JSON.parse(server.install_code_blocks)
            }
            // Handle plain strings
            else {
              codeBlocks = { pip: server.install_code_blocks }
            }
          } catch (e) {
            console.error(`Error parsing install_code_blocks as JSON for server ${serverId}:`, e)
            codeBlocks = { pip: server.install_code_blocks.toString() }
          }
        }
        // Otherwise create a default
        else {
          codeBlocks = { pip: 'No installation commands available' }
          console.warn(`Converted non-object install_code_blocks to standard format for server ${serverId}`)
        }
      } catch (e) {
        console.error(`Error processing install_code_blocks for server ${serverId}:`, e)
      }
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
        codeBlocks: codeBlocks
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
        message: `Server error: ${error.message}`,
        // Include default empty data structure to prevent client-side errors
        data: {
          instructions: {
            linux: '# Error retrieving installation instructions\nPlease try again later or check the official documentation.',
            macos: '# Error retrieving installation instructions\nPlease try again later or check the official documentation.',
            windows: '# Error retrieving installation instructions\nPlease try again later or check the official documentation.'
          },
          platforms: ['linux', 'macos', 'windows'],
          defaultPlatform: 'macos',
          codeBlocks: {}
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 even for errors to prevent client-side errors
      }
    )
  }
})
