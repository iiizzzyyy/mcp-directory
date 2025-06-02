#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    // Get a single row to see column names
    const { data, error } = await supabase
      .from('servers')
      .select('*')
      .limit(1)
      .single();
      
    if (error) throw error;
    
    console.log('Server table columns:');
    console.log(Object.keys(data || {}).join(', '));
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();
