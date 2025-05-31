import { NextRequest, NextResponse } from 'next/server';

/**
 * Server tools API route handler
 * Proxies requests to the Supabase server-tools edge function
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/server-tools?id=${serverId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Error fetching server tools: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching server tools:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch server tools'
      },
      { status: 500 }
    );
  }
}
