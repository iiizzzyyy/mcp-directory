import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Enable dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API Route: GET /api/debug/supabase
 * Diagnostic endpoint to check Supabase connection, RLS policies, and table data
 * This endpoint should be protected or removed in production
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check if Supabase credentials are available
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          error: 'Supabase credentials missing',
          environment: {
            supabaseUrlExists: !!supabaseUrl,
            supabaseKeyExists: !!supabaseKey,
            nodeEnv: process.env.NODE_ENV
          }
        },
        { status: 500 }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    
    // Run diagnostics
    const diagnostics: {
      timestamp: string;
      environment: {
        supabaseUrl: string;
        supabaseKeyExists: boolean;
        nodeEnv: string | undefined;
      };
      connection: {
        success: boolean;
        error: { message: string; code?: string; details?: string; stack?: string } | null;
      } | null;
      serversTable: {
        exists: boolean;
        error: { message: string; code: string } | null;
      } | null;
      sampleData: {
        success: boolean;
        hasData: boolean | null;
        count: number;
        firstRow: Record<string, any> | null;
        error: { message: string; code: string } | null;
      } | null;
      tableCount: {
        success: boolean;
        count: number;
        tables: string[];
        error: { message: string; code: string } | null;
      } | null;
    } = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl.substring(0, 15) + '...', // Truncate for security
        supabaseKeyExists: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      },
      connection: null,
      serversTable: null,
      sampleData: null,
      tableCount: null
    };
    
    // Check connection
    try {
      const { data, error } = await supabase.from('servers').select('count()', { count: 'exact' });
      diagnostics.connection = {
        success: !error,
        error: error ? { 
          message: error.message, 
          code: error.code,
          details: error.details
        } : null
      };
      
      if (!error) {
        // Check servers table structure if connection succeeded
        const { data: columns, error: schemaError } = await supabase
          .from('servers')
          .select()
          .limit(0);
          
        diagnostics.serversTable = {
          exists: !schemaError,
          error: schemaError ? {
            message: schemaError.message,
            code: schemaError.code
          } : null
        };
        
        // Get sample data
        const { data: sample, error: sampleError } = await supabase
          .from('servers')
          .select('id, name, description, created_at')
          .limit(3);
          
        diagnostics.sampleData = {
          success: !sampleError,
          hasData: sample && sample.length > 0,
          count: sample?.length || 0,
          firstRow: sample && sample.length > 0 ? sample[0] : null,
          error: sampleError ? {
            message: sampleError.message,
            code: sampleError.code
          } : null
        };
        
        // Count total tables
        const { data: tableList, error: tableError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public');
          
        diagnostics.tableCount = {
          success: !tableError,
          count: tableList?.length || 0,
          tables: tableList?.map((t: any) => t.tablename) || [],
          error: tableError ? {
            message: tableError.message,
            code: tableError.code
          } : null
        };
      }
    } catch (error: any) {
      diagnostics.connection = {
        success: false,
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
    }
    
    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Diagnostic error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
