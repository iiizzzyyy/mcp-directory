import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for the entire server component tree
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
      { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey }
    );
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}
