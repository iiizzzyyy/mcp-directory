import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Server {
  id: string;
  health_url?: string | null;
  github_url?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: servers, error } = await supabase
      .from('servers')
      .select('id, health_url, github_url');

    if (error) {
      console.error('Failed to fetch servers', error);
      return new Response(
        JSON.stringify({ error: true, message: error.message }),
        { headers: corsHeaders, status: 500 }
      );
    }

    let checked = 0;
    for (const server of servers as Server[]) {
      const url = server.health_url || server.github_url || '';
      if (!url) continue;
      const healthEndpoint = url.endsWith('/health') ? url : `${url}/health`;

      const start = Date.now();
      let status = 'unknown';
      let errMsg: string | null = null;
      try {
        const res = await fetch(healthEndpoint, { method: 'GET' });
        status = res.ok ? 'online' : 'offline';
      } catch (err) {
        status = 'offline';
        errMsg = (err as Error).message;
      }

      await supabase.from('health_data').insert({
        server_id: server.id,
        last_check_time: new Date().toISOString(),
        status,
        response_time_ms: Date.now() - start,
        error_message: errMsg,
        check_method: 'http-get'
      });

      checked++;
    }

    return new Response(
      JSON.stringify({ checked }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error', err);
    return new Response(
      JSON.stringify({ error: true, message: (err as Error).message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
