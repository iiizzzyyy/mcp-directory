import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mockServers } from '@/lib/mock-data';

// Enable dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API Route: POST /api/debug/init-db
 * Initializes the database with mock data if the servers table is empty
 * This endpoint should be protected or removed in production
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check if Supabase credentials are available
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    
    // Check if the servers table exists
    try {
      // First check if the table has any data
      const { count, error: countError } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        return NextResponse.json(
          { 
            error: 'Error checking servers table',
            details: countError.message,
            code: countError.code
          },
          { status: 500 }
        );
      }
      
      // If table exists but is empty, populate it with mock data
      if (count === 0) {
        // Format mock data for database insertion
        const serversToInsert = mockServers.map(server => ({
          id: server.id,
          name: server.name,
          description: server.description || '',
          category: server.category || 'uncategorized',
          tags: server.tags || [],
          platform: server.platform || 'unknown',
          install_method: server.install_method || 'npm',
          github_url: server.github_url || null,
          stars: server.stars || 0,
          forks: server.forks || 0,
          open_issues: server.open_issues || 0,
          contributors: server.contributors || 0,
          last_updated: server.last_updated || new Date().toISOString(),
          source: 'mock_data',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        // Insert the mock data
        const { data, error: insertError } = await supabase
          .from('servers')
          .insert(serversToInsert)
          .select();
        
        if (insertError) {
          return NextResponse.json(
            { 
              error: 'Error populating servers table',
              details: insertError.message,
              code: insertError.code
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Database initialized with mock data',
          count: serversToInsert.length
        });
      }
      
      // Table already has data
      return NextResponse.json({
        success: true,
        message: 'Database already contains data',
        count: count
      });
      
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Database initialization error',
          message: error.message
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Unexpected error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
