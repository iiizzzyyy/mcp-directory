// Script to check server table structure
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    // Check server table columns
    console.log('Checking servers table structure...');
    const { data: columns, error: columnsError } = await supabase.rpc('list_columns', { 
      table_name: 'servers' 
    });
    
    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      
      // Alternative method
      console.log('Trying alternative method to check structure...');
      const { data: sample, error: sampleError } = await supabase
        .from('servers')
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.error('Error fetching sample:', sampleError);
      } else {
        console.log('Sample server record structure:');
        if (sample && sample.length > 0) {
          console.log(Object.keys(sample[0]));
        } else {
          console.log('No server records found');
        }
      }
    } else {
      console.log('Server table columns:');
      console.log(columns.map(col => col.column_name));
    }
    
    // Check if there are any servers with GitHub URLs
    const { count: githubCount, error: githubError } = await supabase
      .from('servers')
      .select('*', { count: 'exact', head: true })
      .not('github_url', 'is', null);
      
    if (githubError) {
      console.error('Error counting servers with GitHub URLs:', githubError);
    } else {
      console.log(`\nFound ${githubCount} servers with GitHub URLs`);
    }
    
    // Check tools_count column - is it being used?
    const { data: toolsCountData, error: toolsCountError } = await supabase
      .from('servers')
      .select('id, name, tools_count')
      .not('tools_count', 'is', null)
      .limit(5);
      
    if (toolsCountError) {
      console.error('Error checking tools_count:', toolsCountError);
    } else {
      console.log('\nServers with tools_count:');
      console.log(toolsCountData);
    }
    
    // Check server tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('servers')
      .select('id, name, tags')
      .filter('tags', 'cs', '{"tool:"}')
      .limit(5);
      
    if (tagsError) {
      console.error('Error checking server tags:', tagsError);
    } else {
      console.log('\nServers with tool tags:');
      console.log(tagsData);
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

main();
