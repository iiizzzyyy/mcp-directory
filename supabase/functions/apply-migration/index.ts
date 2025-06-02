/**
 * apply-migration.ts
 * 
 * Supabase Edge Function to apply database migrations
 * This function reads a specified SQL migration file and applies it to the database.
 * 
 * Usage:
 * POST /apply-migration
 * Body: { "migration_name": "20250601_add_tools_column" }
 */
// Import directly from URLs for Deno compatibility
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  migration_name: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData: RequestBody = await req.json();
    const { migration_name } = requestData;

    // Validate input
    if (!migration_name) {
      return new Response(
        JSON.stringify({ error: "Missing migration name" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Initialize Supabase client with service role key (required for migrations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read the migration file
    const migrationPath = `./migrations/${migration_name}.sql`;
    let migrationSql: string;
    
    try {
      // In production, we would read from a migrations directory
      // For now, we'll use a hardcoded migration for the tools column
      if (migration_name === "20250601_add_tools_column") {
        migrationSql = `
          -- Add the tools column with a default empty array
          ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;
          
          -- Add a comment to explain the column purpose
          COMMENT ON COLUMN public.servers.tools IS 'JSON array of tool definitions for the MCP server, including name, description, parameters, etc.';
          
          -- Create an index to improve query performance on the JSONB field
          CREATE INDEX IF NOT EXISTS idx_servers_tools ON public.servers USING GIN (tools);
        `;
      } else {
        return new Response(
          JSON.stringify({ error: "Migration not found" }),
          { 
            status: 404, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Failed to read migration file: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Execute the migration SQL directly
    try {
      // Split the SQL into separate statements
      const sqlStatements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      // Execute each statement separately
      for (const sql of sqlStatements) {
        const { error } = await supabase.from('_dummy_query_').select().limit(0).then(
          async () => {
            // Use PostgreSQL raw query API instead of RPC
            return await supabase.rpc('postgres_js', { 
              query: `${sql};`,
              params: [] 
            });
          }
        ).catch(err => ({ error: err }));

        if (error) {
          return new Response(
            JSON.stringify({ error: `Migration failed: ${error.message}`, sql }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Migration execution failed: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Log the migration in schema_migrations table if it exists
    try {
      const logSql = `
        DO $$ 
        BEGIN
          IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schema_migrations') THEN
            INSERT INTO public.schema_migrations (version, name, applied_at) 
            VALUES ('${migration_name.split('_')[0]}', '${migration_name.split('_').slice(1).join('_')}', CURRENT_TIMESTAMP);
          END IF;
        END $$;
      `;
      
      const { error: logError } = await supabase.from('_dummy_query_').select().limit(0).then(
        async () => {
          return await supabase.rpc('postgres_js', { 
            query: logSql,
            params: [] 
          });
        }
      ).catch(err => ({ error: err }));

      if (logError) {
        console.error("Failed to log migration:", logError);
        // Continue anyway, as the migration itself succeeded
      }
    } catch (logError) {
      console.error("Failed to log migration:", logError);
      // Continue anyway, as the migration itself succeeded
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Migration ${migration_name} applied successfully`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
