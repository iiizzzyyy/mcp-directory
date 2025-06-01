import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server changelog API route handler
 * Retrieves changelog information for a specific server from the database
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
    
    console.log('Server changelog API called with serverId:', id);
    
    // First attempt: Try using auth-helpers-nextjs
    try {
      console.log('Attempting to use createServerComponentClient');
      const supabase = createServerComponentClient({ cookies });
      
      // Query the database for server first to confirm it exists
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .select('id, name')
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
      
      // Query the changelog data
      const { data: changelog, error } = await supabase
        .from('server_changelog')
        .select('*')
        .eq('server_id', id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error with createServerComponentClient:', error);
        throw error;
      }
      
      console.log(`Successfully fetched changelog with createServerComponentClient`);
      return NextResponse.json({
        changelog: changelog || []
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
      
      // Query the database for server first to confirm it exists
      const { data: server, error: serverError } = await directClient
        .from('servers')
        .select('id, name')
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
      
      // Query the changelog data
      const { data: changelog, error } = await directClient
        .from('server_changelog')
        .select('*')
        .eq('server_id', id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error with direct client:', error);
        throw error;
      }
      
      console.log(`Successfully fetched changelog with direct client`);
      return NextResponse.json({
        changelog: changelog || []
      });
    }
  } catch (error) {
    console.error('Error fetching server changelog:', error);
    return NextResponse.json(
      { 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to fetch server changelog' 
      },
      { status: 500 }
    );
  }
}
