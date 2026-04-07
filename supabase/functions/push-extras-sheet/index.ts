// Edge Function: encaminha linhas da prévia de extras para Google Sheets (webhook Apps Script).
// Secrets: GOOGLE_SHEETS_WEBHOOK_URL (obrigatório), GOOGLE_SHEETS_WEBHOOK_TOKEN (opcional, vai no JSON como `token`).
// Deploy: supabase functions deploy push-extras-sheet

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'LEADER'] as const;
const MAX_ROWS = 5000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado. Token ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Token ou configuração inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    });

    if (!authRes.ok) {
      let errMsg = 'Sessão inválida ou expirada.';
      try {
        const parsed = await authRes.json();
        if (parsed?.msg) errMsg = parsed.msg;
        else if (parsed?.error_description) errMsg = parsed.error_description;
      } catch {
        /* ignore */
      }
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authJson = await authRes.json();
    const callerId = authJson?.id as string | undefined;
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Resposta do Auth inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerRow } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerId)
      .eq('active', true)
      .maybeSingle();

    const role = callerRow?.role as string | undefined;
    if (!role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para enviar à planilha (apenas Admin, Gerente ou Líder).' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_URL')?.trim();
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({
          error:
            'Integração não configurada: defina o secret GOOGLE_SHEETS_WEBHOOK_URL no Supabase (Edge Functions → Secrets).',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookToken = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_TOKEN')?.trim() || '';

    let body: { rows?: unknown[] };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Informe um array rows não vazio.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rows.length > MAX_ROWS) {
      return new Response(JSON.stringify({ error: `Máximo de ${MAX_ROWS} linhas por requisição.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Record<string, unknown> = {
      rows,
      source: 'vivaz-controle-extras',
      sentAt: new Date().toISOString(),
    };
    if (webhookToken) {
      payload.token = webhookToken;
    }

    const whRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const whText = await whRes.text();
    let whJson: { ok?: boolean; appended?: number; error?: string };
    try {
      whJson = JSON.parse(whText) as { ok?: boolean; appended?: number; error?: string };
    } catch {
      return new Response(
        JSON.stringify({
          error: 'A planilha (Apps Script) não retornou JSON válido. Confira o deploy e os logs do script.',
          detail: whText.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!whRes.ok || whJson.ok === false) {
      const err = whJson.error || `Webhook HTTP ${whRes.status}`;
      return new Response(JSON.stringify({ error: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appended = typeof whJson.appended === 'number' ? whJson.appended : rows.length;

    return new Response(
      JSON.stringify({
        success: true,
        appended,
        message: `${appended} linha(s) enviada(s) à planilha.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
