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

type AppsScriptOk = { ok?: boolean; appended?: number; error?: string };
type AppsScriptFail = { error: string; detail?: string };

function parseJsonLoose(text: string): AppsScriptOk | null {
  const t = text.replace(/^\uFEFF/, '').trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as AppsScriptOk;
  } catch {
    /* continue */
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1)) as AppsScriptOk;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extractGoogleEchoUrl(html: string): string | null {
  const m =
    html.match(/<A HREF="(https:\/\/script\.googleusercontent\.com\/[^"]+)"/i) ||
    html.match(/href="(https:\/\/script\.googleusercontent\.com\/[^"]+)"/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

function explainHtmlResponse(status: number, text: string): AppsScriptFail {
  const sample = text.replace(/\s+/g, ' ').trim().slice(0, 180);
  if (status === 403 || /<title>[^<]*403|access denied|acesso negado/i.test(text)) {
    return {
      error:
        'O Apps Script bloqueou o acesso (403). Edite a implantação e defina «Quem tem acesso» = Qualquer pessoa (não «somente eu» nem «qualquer usuário do Google»).',
      detail: sample,
    };
  }
  if (status === 404 || /<title>[^<]*404|not found|não encontrado/i.test(text)) {
    return {
      error:
        'A URL do Apps Script não existe mais (404). Gere uma nova implantação (Aplicativo da Web → Qualquer pessoa) e atualize o secret GOOGLE_SHEETS_WEBHOOK_URL.',
      detail: sample,
    };
  }
  if (/sign in|fazer login|accounts\.google|Authorization needed|autorização necessária/i.test(text)) {
    return {
      error:
        'O Apps Script exigiu login do Google. Na implantação, defina «Quem tem acesso» = Qualquer pessoa e use a URL /exec (não /dev).',
      detail: sample,
    };
  }
  if (/Moved Temporarily/i.test(text)) {
    return {
      error:
        'O Google devolveu um redirecionamento em HTML em vez do JSON do script. Confira se a implantação está ativa e «Qualquer pessoa».',
      detail: sample,
    };
  }
  return {
    error: 'A planilha (Apps Script) não retornou JSON válido. Confira o deploy e os logs do script.',
    detail: sample,
  };
}

async function postToAppsScript(
  url: string,
  payload: Record<string, unknown>
): Promise<{ status: number; text: string }> {
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };

  try {
    const first = await fetch(url, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    });

    if (first.status >= 300 && first.status < 400) {
      const loc = first.headers.get('Location');
      if (loc) {
        const second = await fetch(loc, { method: 'GET', redirect: 'follow' });
        return { status: second.status, text: await second.text() };
      }
    }

    const text = await first.text();
    const echo = extractGoogleEchoUrl(text);
    if (echo) {
      const echoed = await fetch(echo, { method: 'GET', redirect: 'follow' });
      return { status: echoed.status, text: await echoed.text() };
    }

    if (first.status === 0 || (!text && first.status >= 300)) {
      const followed = await fetch(url, { method: 'POST', headers, body, redirect: 'follow' });
      return { status: followed.status, text: await followed.text() };
    }

    return { status: first.status, text };
  } catch {
    const followed = await fetch(url, { method: 'POST', headers, body, redirect: 'follow' });
    return { status: followed.status, text: await followed.text() };
  }
}

async function parseAppsScriptResponse(
  status: number,
  text: string
): Promise<AppsScriptOk | AppsScriptFail> {
  const parsed = parseJsonLoose(text);
  if (parsed) return parsed;
  return explainHtmlResponse(status, text);
}

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

    // Apps Script redireciona POST → GET no echo do Google. text/plain evita
    // HTML de login/preflight; se ainda vier HTML, seguimos o href manualmente.
    const { status: whStatus, text: whText } = await postToAppsScript(webhookUrl, payload);
    const whJson = await parseAppsScriptResponse(whStatus, whText);

    if ('error' in whJson && !('ok' in whJson)) {
      return new Response(JSON.stringify({ error: whJson.error, detail: whJson.detail }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (whStatus >= 400 || whJson.ok === false) {
      const err = whJson.error || `Webhook HTTP ${whStatus}`;
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
