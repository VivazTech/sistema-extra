// ============================================
// CONFIGURAÇÃO DO SUPABASE CLIENT
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================

import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any)?.env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

const isDebugEnabled = (() => {
  try {
    if (typeof window === 'undefined') return false;
    const search = new URLSearchParams(window.location.search);
    if (search.get('debug') === '1') return true;
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex >= 0) {
      const hashQuery = new URLSearchParams(hash.slice(qIndex + 1));
      if (hashQuery.get('debug') === '1') return true;
    }
    return false;
  } catch {
    return false;
  }
})();

const debugLog = (msg: string, data?: any) => {
  if (!isDebugEnabled) return;
  try {
    console.info(`[AGENT_DEBUG][SUPABASE_FETCH] ${msg}`, data ?? {});
  } catch {
    // ignore
  }
};

// Timeout de rede para evitar "loading infinito" quando o Supabase fica pendurado.
// Usa AbortSignal.timeout (sem setTimeout). Se não existir no browser, não aplica timeout.
const fetchWithTimeout: typeof fetch = (input, init) => {
  try {
    const timeoutMs = 15000;
    const hasTimeout = typeof (AbortSignal as any)?.timeout === 'function';
    debugLog('capabilities', { hasAbortSignalTimeout: hasTimeout });
    const signal =
      init?.signal ??
      (hasTimeout ? (AbortSignal as any).timeout(timeoutMs) : undefined);

    let urlStr = '';
    try {
      urlStr = typeof input === 'string' ? input : (input as any)?.url || '';
    } catch {
      urlStr = '';
    }

    const startedAt = Date.now();
    let urlInfo: any = { method: init?.method || 'GET', timeoutMs: hasTimeout ? timeoutMs : null };
    try {
      const u = new URL(urlStr);
      urlInfo = { ...urlInfo, host: u.host, path: u.pathname, search: u.search };
    } catch {
      urlInfo = { ...urlInfo, url: urlStr };
    }

    debugLog('start', urlInfo);

    return fetch(input, { ...(init || {}), signal })
      .then((res) => {
        debugLog('end', { ...urlInfo, status: res.status, ms: Date.now() - startedAt });
        return res;
      })
      .catch((err) => {
        debugLog('error', { ...urlInfo, ms: Date.now() - startedAt, errorName: err?.name, errorMessage: err?.message });
        throw err;
      });
  } catch {
    return fetch(input, init);
  }
};

if (isDebugEnabled) {
  try {
    const host = supabaseUrl ? new URL(supabaseUrl).host : '(empty)';
    console.info('[AGENT_DEBUG][SUPABASE] env', {
      urlHost: host,
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });
  } catch {
    console.info('[AGENT_DEBUG][SUPABASE] env', {
      urlHost: '(invalid url)',
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Função para testar conexão
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('sectors').select('count').limit(1);
    return { success: !error, error, data };
  } catch (err) {
    return { success: false, error: err, data: null };
  }
};
