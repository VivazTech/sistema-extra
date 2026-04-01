// Edge Function: permite que um ADMIN redefina a senha de outro usuário sem enviar email.
// Deploy: supabase functions deploy admin-set-password
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (já disponíveis no projeto Supabase).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Token ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Anon key do próprio projeto (injetada no Edge pelo Supabase). Usada só para validar o JWT em /auth/v1/user.
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token inválido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_ANON_KEY ausente no runtime da função. Contate o suporte ou defina o secret no Dashboard.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validar JWT via API Auth (mesmo fluxo do GoTrue): Bearer + apikey = anon do projeto.
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    });
    if (!authRes.ok) {
      const errText = await authRes.text();
      let errMsg = 'Sessão inválida ou expirada. Faça login novamente.';
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.msg) errMsg = parsed.msg;
        else if (parsed?.error_description) errMsg = parsed.error_description;
      } catch (_) {}
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const authJson = await authRes.json();
    const callerId = authJson?.id as string | undefined;
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: 'Resposta do Auth inválida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const caller = { id: callerId };

    const { data: callerRow } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .eq('active', true)
      .maybeSingle();

    if (callerRow?.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem redefinir senha de outros usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { user_id: userId, new_password: newPassword } = body || {};

    if (!userId || typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Informe user_id e new_password (mínimo 6 caracteres).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: targetUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Senha alterada com sucesso.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
