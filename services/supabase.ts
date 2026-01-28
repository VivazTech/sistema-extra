// ============================================
// CONFIGURAÇÃO DO SUPABASE CLIENT
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

const setGlobalFetchDebug = (patch: any) => {
  if (!isDebugEnabled) return;
  try {
    const w = window as any;
    const prev = w.__agentSupabaseFetchDebug || {};
    w.__agentSupabaseFetchDebug = { ...prev, ...patch };
  } catch {
    // ignore
  }
};

const setGlobalAnyFetchDebug = (patch: any) => {
  if (!isDebugEnabled) return;
  try {
    const w = window as any;
    const prev = w.__agentGlobalFetchDebug || {};
    w.__agentGlobalFetchDebug = { ...prev, ...patch };
  } catch {
    // ignore
  }
};

// Debug robusto: interceptar fetch global (Supabase pode não usar o fetch injetado).
if (isDebugEnabled && typeof window !== 'undefined') {
  try {
    const w = window as any;
    if (!w.__agentOriginalFetch && typeof w.fetch === 'function') {
      w.__agentOriginalFetch = w.fetch.bind(window);
      w.fetch = (input: any, init?: any) => {
        const startedAt = Date.now();
        let urlStr = '';
        try {
          urlStr = typeof input === 'string' ? input : input?.url || '';
        } catch {
          urlStr = '';
        }
        let urlInfo: any = { method: init?.method || 'GET' };
        try {
          const u = new URL(urlStr);
          urlInfo = { ...urlInfo, host: u.host, path: u.pathname, search: u.search };
        } catch {
          urlInfo = { ...urlInfo, url: urlStr };
        }
        setGlobalAnyFetchDebug({ installed: true, lastEvent: 'start', lastUrl: urlInfo, lastTs: Date.now() });
        debugLog('GLOBAL start', urlInfo);
        return w.__agentOriginalFetch(input, init)
          .then((res: any) => {
            setGlobalAnyFetchDebug({
              installed: true,
              lastEvent: 'end',
              lastUrl: urlInfo,
              lastStatus: res?.status,
              lastMs: Date.now() - startedAt,
              lastTs: Date.now(),
            });
            debugLog('GLOBAL end', { ...urlInfo, status: res?.status, ms: Date.now() - startedAt });
            return res;
          })
          .catch((err: any) => {
            setGlobalAnyFetchDebug({
              installed: true,
              lastEvent: 'error',
              lastUrl: urlInfo,
              lastErrorName: err?.name,
              lastErrorMessage: err?.message,
              lastMs: Date.now() - startedAt,
              lastTs: Date.now(),
            });
            debugLog('GLOBAL error', { ...urlInfo, ms: Date.now() - startedAt, errorName: err?.name, errorMessage: err?.message });
            throw err;
          });
      };
    }
  } catch {
    // ignore
  }
}

// Timeout de rede para evitar "loading infinito" quando o Supabase fica pendurado.
// Usa AbortSignal.timeout (sem setTimeout). Se não existir no browser, não aplica timeout.
const fetchWithTimeout: typeof fetch = (input, init) => {
  try {
    const timeoutMs = 15000;
    const hasTimeout = typeof (AbortSignal as any)?.timeout === 'function';
    debugLog('capabilities', { hasAbortSignalTimeout: hasTimeout });
    setGlobalFetchDebug({ hasAbortSignalTimeout: hasTimeout, timeoutMs, lastCapabilityTs: Date.now() });
    setGlobalAnyFetchDebug({ hasAbortSignalTimeout: hasTimeout, timeoutMs, lastCapabilityTs: Date.now() });
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
    setGlobalFetchDebug({ lastEvent: 'start', lastUrl: urlInfo, lastTs: Date.now() });

    return fetch(input, { ...(init || {}), signal })
      .then((res) => {
        debugLog('end', { ...urlInfo, status: res.status, ms: Date.now() - startedAt });
        setGlobalFetchDebug({ lastEvent: 'end', lastUrl: urlInfo, lastStatus: res.status, lastMs: Date.now() - startedAt, lastTs: Date.now() });
        return res;
      })
      .catch((err) => {
        debugLog('error', { ...urlInfo, ms: Date.now() - startedAt, errorName: err?.name, errorMessage: err?.message });
        setGlobalFetchDebug({ lastEvent: 'error', lastUrl: urlInfo, lastErrorName: err?.name, lastErrorMessage: err?.message, lastMs: Date.now() - startedAt, lastTs: Date.now() });
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
