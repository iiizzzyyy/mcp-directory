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

    // Query installation instructions from the database
    const { data, error } = await supabase
      .from('server_install_instructions')
      .select('*')
      .eq('server_id', serverId)

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

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0
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
