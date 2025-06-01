import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server installation instructions API route handler
 * Proxies requests to Supabase edge function for installation data with proper authentication
 * Includes fallback authentication methods
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: true, message: 'Server ID is required' },
        { status: 400 }
      );
    }
    
    console.log('Server installation API called with serverId:', id);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    // First attempt: Try direct fetch to edge function with service role key
    try {
      console.log('Fetching installation instructions from edge function for server:', id);
      
      // Updated to use POST request with the ID in the body
      const response = await fetch(
        `${supabaseUrl}/functions/v1/servers-install`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ id })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Edge function returned error status ${response.status}:`, errorText);
        throw new Error(`Edge function error: ${response.status} - ${errorText}`);
      }
      
      const installData = await response.json();
      console.log('Successfully fetched installation instructions');
      
      return NextResponse.json(installData);
    } catch (edgeFunctionError) {
      console.error('Edge function request failed:', edgeFunctionError);
      
      // Fallback to querying database directly
      console.log('Falling back to direct database query');
      
      try {
        // First attempt with createServerComponentClient
        const supabase = createServerComponentClient({ cookies });
        
        // Query the database for server first
        const { data: server, error: serverError } = await supabase
          .from('servers')
          .select('id, name, install_instructions')
          .eq('id', id)
          .maybeSingle();
        
        if (serverError) {
          console.error('Error finding server:', serverError);
          throw serverError;
        }
        
        if (!server) {
          return NextResponse.json(
            { error: true, message: 'Server not found' },
            { status: 404 }
          );
        }
        
        if (server.install_instructions) {
          return NextResponse.json({
            instructions: server.install_instructions,
            platforms: ['linux', 'macos', 'windows'], // Default platforms
            defaultPlatform: 'macos'
          });
        }
        
        // If we don't have instructions in the database, use a fallback message
        return NextResponse.json({
          instructions: {
            linux: '# Installation instructions not available\nPlease check the official documentation.',
            macos: '# Installation instructions not available\nPlease check the official documentation.',
            windows: '# Installation instructions not available\nPlease check the official documentation.'
          },
          platforms: ['linux', 'macos', 'windows'],
          defaultPlatform: 'macos'
        });
      } catch (componentClientError) {
        console.error('createServerComponentClient failed:', componentClientError);
        
        // Second attempt with direct client
        const directClient = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data: server, error: serverError } = await directClient
          .from('servers')
          .select('id, name, install_instructions')
          .eq('id', id)
          .maybeSingle();
        
        if (serverError) {
          console.error('Error finding server:', serverError);
          throw serverError;
        }
        
        if (!server) {
          return NextResponse.json(
            { error: true, message: 'Server not found' },
            { status: 404 }
          );
        }
        
        if (server.install_instructions) {
          return NextResponse.json({
            instructions: server.install_instructions,
            platforms: ['linux', 'macos', 'windows'],
            defaultPlatform: 'macos'
          });
        }
        
        // If we don't have instructions in the database, use a fallback message
        return NextResponse.json({
          instructions: {
            linux: '# Installation instructions not available\nPlease check the official documentation.',
            macos: '# Installation instructions not available\nPlease check the official documentation.',
            windows: '# Installation instructions not available\nPlease check the official documentation.'
          },
          platforms: ['linux', 'macos', 'windows'],
          defaultPlatform: 'macos'
        });
      }
    }
  } catch (error) {
    console.error('Error fetching server installation instructions:', error);
    return NextResponse.json(
      { 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to fetch server installation instructions' 
      },
      { status: 500 }
    );
  }
}
