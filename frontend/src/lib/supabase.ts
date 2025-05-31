import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase client for interacting with the Supabase API
 * 
 * Uses environment variables for configuration:
 * - NEXT_PUBLIC_SUPABASE_URL: The URL of your Supabase project
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: The anonymous key for your Supabase project
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
