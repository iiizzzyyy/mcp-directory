import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    
    const supabase = createServerComponentClient({ cookies });
    
    // Check if the ID is a UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let serverQuery;
    if (isUuid) {
      // If UUID, query directly by ID
      serverQuery = await supabase.from('servers').select('*').eq('id', id).maybeSingle();
    } else {
      // If slug, first try to match the slug
      serverQuery = await supabase.from('servers').select('*').eq('slug', id).maybeSingle();
      
      // If no match by slug, try to match by name (converting slug to name)
      if (!serverQuery.data && !serverQuery.error) {
        serverQuery = await supabase.from('servers').select('*')
          .ilike('name', id.replace(/-/g, ' '))
          .maybeSingle();
      }
    }
    
    const { data: server, error } = serverQuery;
    
    if (error) {
      console.error('Error fetching server from Supabase:', error.message);
      return NextResponse.json(
        { error: true, message: `Database error: ${error.message}` },
        { status: 400 }
      );
    }
    
    if (!server) {
      return NextResponse.json(
        { error: true, message: 'Server not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(server);
  } catch (error) {
    console.error('Unexpected error in server detail API:', error);
    return NextResponse.json(
      { error: true, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
