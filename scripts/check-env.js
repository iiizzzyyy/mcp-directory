// Simple script to check environment variables
require('dotenv').config();

console.log('Environment Variables:');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('GITHUB_TOKEN exists:', !!process.env.GITHUB_TOKEN);
