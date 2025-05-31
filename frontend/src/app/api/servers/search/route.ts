import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const category = searchParams.get('category') || '';
    const tag = searchParams.get('tag') || '';
    
    const supabase = createServerComponentClient({ cookies });
    
    let serverQuery = supabase
      .from('servers')
      .select('*', { count: 'exact' });
    
    // Apply filters if provided
    if (query) {
      serverQuery = serverQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    if (category) {
      serverQuery = serverQuery.eq('category', category);
    }
    
    if (tag) {
      serverQuery = serverQuery.contains('tags', [tag]);
    }
    
    // Apply pagination
    const { data: servers, error, count } = await serverQuery
      .order('stars', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching servers:', error);
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      servers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error) {
    console.error('Unexpected error in servers search API:', error);
    return NextResponse.json(
      { error: true, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
