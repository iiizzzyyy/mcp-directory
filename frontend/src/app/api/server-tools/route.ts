import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server tools API route handler
 * Retrieves tools for a specific server directly from the database
 * Includes fallback authentication methods
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get('id');
  
  if (!serverId) {
    return NextResponse.json(
      { success: false, error: 'Server ID is required' },
      { status: 400 }
    );
  }
  
  try {
    console.log('Server tools API called with serverId:', serverId);
    
    // First attempt: Try using auth-helpers-nextjs with service role key
    try {
      console.log('Attempting to use createServerComponentClient');
      const supabase = createServerComponentClient({ cookies });
      
      // Query the database directly
      const { data: tools, error } = await supabase
        .from('server_tools')
        .select('id, name, description, method, endpoint, detection_source')
        .eq('server_id', serverId)
        .order('name');
      
      if (error) {
        console.error('Error with createServerComponentClient:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${tools?.length || 0} tools with createServerComponentClient`);
      return NextResponse.json({
        success: true,
        data: tools || []
      });
    } catch (componentClientError) {
      console.error('createServerComponentClient failed:', componentClientError);
      
      // Second attempt: Try using direct client with service role key
      console.log('Falling back to direct client with service role key');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing required environment variables for fallback client');
      }
      
      const directClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: tools, error } = await directClient
        .from('server_tools')
        .select('id, name, description, method, endpoint, detection_source')
        .eq('server_id', serverId)
        .order('name');
      
      if (error) {
        console.error('Error with direct client:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${tools?.length || 0} tools with direct client`);
      return NextResponse.json({
        success: true,
        data: tools || []
      });
    }
  } catch (error) {
    console.error('Error fetching server tools:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
