import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { cache } from 'react';

// Define a basic Database type if the full one isn't available
// This can be expanded as needed
type Database = {
  public: {
    Tables: {
      servers: {
        Row: any;
        Insert: any;
        Update: any;
      };
      profiles: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
  };
};

/**
 * Create a Supabase client for server components with auth context
 * Uses React cache() for request deduplication
 */
export const createServerComponentSupabaseClient = cache(() => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
});

/**
 * Create a Supabase client without auth context
 * Useful for public data fetching when no user session is needed
 */
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
};

/**
 * Creates a Supabase admin client with service role key for elevated permissions
 * WARNING: Only use in secure server contexts that require admin access
 */
export function createServerSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing admin environment variables');
    throw new Error('Missing Supabase admin environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

/**
 * Get the current user's session
 * Uses React cache() for request deduplication
 */
export const getSession = cache(async () => {
  const supabase = createServerComponentSupabaseClient();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
});

/**
 * Check if the user is authenticated
 * Uses React cache() for request deduplication
 */
export const isAuthenticated = cache(async () => {
  const session = await getSession();
  return !!session;
});

/**
 * Get the current user profile
 * Uses React cache() for request deduplication
 */
export const getCurrentUser = cache(async () => {
  const supabase = createServerComponentSupabaseClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Get additional user profile data from database if needed
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      ...user,
      profile: profile || null
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
});
