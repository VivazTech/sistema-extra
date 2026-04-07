import { supabase } from './supabase';
import type { SheetsPreviewRow } from './sheetsPreviewRows';

export type PushSheetsResult =
  | { ok: true; appended: number; message?: string }
  | { ok: false; error: string };

const MAX_ROWS = 5000;

/**
 * Envia linhas da prévia para a planilha via Supabase Edge Function → Google Apps Script (webhook).
 * Requer função `push-extras-sheet` publicada e secrets `GOOGLE_SHEETS_WEBHOOK_URL` (+ opcional `GOOGLE_SHEETS_WEBHOOK_TOKEN`).
 */
export async function pushPreviewRowsToSheets(rows: SheetsPreviewRow[]): Promise<PushSheetsResult> {
  if (!rows.length) {
    return { ok: false, error: 'Não há linhas para enviar.' };
  }
  if (rows.length > MAX_ROWS) {
    return { ok: false, error: `Limite de ${MAX_ROWS} linhas por envio. Reduza o período ou o filtro de setor.` };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, error: 'Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' };
  }

  try {
    await supabase.auth.refreshSession();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/push-extras-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ rows }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 404) {
      return {
        ok: false,
        error:
          'Função push-extras-sheet não encontrada. Faça o deploy no Supabase (veja supabase/functions/push-extras-sheet/README.md).',
      };
    }

    if (!res.ok) {
      const msg =
        typeof data?.error === 'string'
          ? data.error
          : typeof data?.message === 'string'
            ? data.message
            : `Erro ${res.status}`;
      return { ok: false, error: msg };
    }

    if (data?.success === true) {
      const appended = typeof data.appended === 'number' ? data.appended : rows.length;
      return {
        ok: true,
        appended,
        message: typeof data.message === 'string' ? data.message : undefined,
      };
    }

    return { ok: false, error: 'Resposta inesperada do servidor.' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Falha de rede ao enviar.';
    return { ok: false, error: msg };
  }
}
