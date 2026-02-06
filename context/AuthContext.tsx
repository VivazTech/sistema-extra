import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthState, User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);
  const [debugStep, setDebugStep] = useState<string>('init');
  const [debugStartedAt] = useState<number>(() => Date.now());
  const [debugNow, setDebugNow] = useState<number>(() => Date.now());

  const loadUserInFlightRef = useRef<Promise<void> | null>(null);

  const debugEnabled = (() => {
    try {
      if (typeof window === 'undefined') return false;
      const search = new URLSearchParams(window.location.search);
      if (search.get('debug') === '1') return true;
      // HashRouter: query pode estar dentro do hash (/#/rota?debug=1)
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

  // Atualizar timestamp na tela de loading sem setTimeout (apenas para debug visual)
  useEffect(() => {
    if (!debugEnabled) return;
    if (!loading) return;
    let raf = 0;
    const loop = () => {
      setDebugNow((prev) => {
        const now = Date.now();
        // throttle ~4x/s
        return now - prev > 250 ? now : prev;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [debugEnabled, loading]);

  const canPostLocalDebug = (() => {
    try {
      if (typeof window === 'undefined') return false;
      return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  })();

  const agentPost = (payload: any) => {
    if (!canPostLocalDebug) return;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/46453aa1-542a-4700-9266-b4d0c7aab459',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(()=>{});
    // #endregion
  };

  // Verificar sessão existente ao carregar
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1) Cache local para evitar "loading infinito" em reload
        // (se o Supabase travar ao resolver sessão/token, o app não fica preso na tela de loading)
        try {
          const raw = localStorage.getItem('vivaz_auth');
          if (raw) {
            const parsed = JSON.parse(raw) as AuthState;
            if (parsed?.isAuthenticated && parsed?.user?.id) {
              setState(parsed);
              setLoading(false);
              setDebugStep('cache:vivaz_auth -> setLoading(false)');
            }
          }
        } catch {
          // ignore cache parse errors
        }

        agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'context/AuthContext.tsx:checkSession:start',message:'checkSession start',data:{loadingBefore:true},timestamp:Date.now()});
        // Fallback (caso o envio de logs para 127.0.0.1 esteja bloqueado no navegador)
        console.info('[AGENT_DEBUG][A] checkSession:start');
        setDebugStep('checkSession:start');
        const { data: { session } } = await supabase.auth.getSession();

        agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'context/AuthContext.tsx:checkSession:gotSession',message:'checkSession gotSession',data:{hasSession:!!session,hasSessionUser:!!session?.user},timestamp:Date.now()});
        console.info('[AGENT_DEBUG][A] checkSession:gotSession', { hasSession: !!session, hasSessionUser: !!session?.user });
        setDebugStep(`checkSession:gotSession hasUser=${!!session?.user}`);

        if (session?.user) {
          // Buscar dados do usuário na tabela users
          setDebugStep('checkSession:hasSessionUser -> loadUserData');
          // Evitar chamadas concorrentes que podem travar em alguns browsers
          if (!loadUserInFlightRef.current) {
            loadUserInFlightRef.current = loadUserData(session.user.id).finally(() => {
              loadUserInFlightRef.current = null;
            });
          }
          // Não bloquear o boot esperando o banco; o app já pode renderizar com cache
          void loadUserInFlightRef.current;
          // Se ainda está em loading, liberar aqui
          setLoading(false);
        } else {
          setLoading(false);
          agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D',location:'context/AuthContext.tsx:checkSession:noSession',message:'checkSession noSession -> setLoading(false)',data:{},timestamp:Date.now()});
          setDebugStep('checkSession:noSession -> setLoading(false)');
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setLoading(false);
        agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'context/AuthContext.tsx:checkSession:catch',message:'checkSession catch -> setLoading(false)',data:{errorName:(error as any)?.name,errorMessage:(error as any)?.message},timestamp:Date.now()});
        setDebugStep(`checkSession:catch ${(error as any)?.name || 'Error'}`);
      }
    };

    checkSession();

    // Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C',location:'context/AuthContext.tsx:onAuthStateChange',message:'onAuthStateChange',data:{event,hasSession:!!session,hasSessionUser:!!session?.user},timestamp:Date.now()});
      console.info('[AGENT_DEBUG][C] onAuthStateChange', { event, hasSessionUser: !!session?.user });
      setDebugStep(`onAuthStateChange:${event} hasUser=${!!session?.user}`);
      if (event === 'SIGNED_IN' && session?.user) {
        if (!loadUserInFlightRef.current) {
          loadUserInFlightRef.current = loadUserData(session.user.id).finally(() => {
            loadUserInFlightRef.current = null;
          });
        }
        void loadUserInFlightRef.current;
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isAuthenticated: false });
        localStorage.removeItem('vivaz_auth');
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (authUserId: string) => {
    try {
      agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'context/AuthContext.tsx:loadUserData:start',message:'loadUserData start',data:{hasAuthUserId:!!authUserId},timestamp:Date.now()});
      console.info('[AGENT_DEBUG][B] loadUserData:start', { hasAuthUserId: !!authUserId });
      setDebugStep('loadUserData:start');
      // Buscar usuário na tabela users pelo ID do Auth (que deve ser o mesmo)
      // maybeSingle() evita HTTP 406 quando não há linha (single() exige exatamente 1 linha)
      setDebugStep('loadUserData:usersQuery:start');
      let { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .eq('active', true)
        .maybeSingle();

      agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'context/AuthContext.tsx:loadUserData:usersQuery',message:'loadUserData usersQuery result',data:{hasUserData:!!userData,errorCode:(error as any)?.code,errorMessage:(error as any)?.message},timestamp:Date.now()});
      console.info('[AGENT_DEBUG][B] loadUserData:usersQuery', { hasUserData: !!userData, errorCode: (error as any)?.code, hasError: !!error });
      setDebugStep(`loadUserData:usersQuery hasUser=${!!userData} err=${(error as any)?.code || 'none'}`);

      // Se não encontrou pelo ID, tentar buscar pelo email do Auth (fallback para ID dessincronizado)
      if (!userData && !error) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.email) {
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('*')
              .eq('email', authUser.email)
              .eq('active', true)
              .maybeSingle();

            if (!emailError && userByEmail) {
              const alreadyWarned = sessionStorage.getItem('vivaz_sync_id_warn') === '1';
              if (!alreadyWarned) {
                console.warn('Usuário encontrado por email, mas ID do Auth não corresponde ao ID na tabela users. Para sincronizar: node scripts/create-admin-user.js');
                sessionStorage.setItem('vivaz_sync_id_warn', '1');
              }
              userData = userByEmail;
            }
          }
        } catch (_) {
          // ignora falha no fallback
        }
      }

      if (error || !userData) {
        if (error) console.error('Erro ao buscar dados do usuário:', error);
        else console.error('Usuário do Auth não encontrado na tabela users. Execute: node scripts/create-admin-user.js');
        setState({ user: null, isAuthenticated: false });
        setLoading(false);
        setDebugStep('loadUserData:notFound -> setLoading(false)');
        return;
      }

      // Buscar setores do usuário (se for manager)
      let sectors: string[] = [];
      if (userData.role === 'MANAGER') {
        const { data: userSectors } = await supabase
          .from('user_sectors')
          .select('sectors(name)')
          .eq('user_id', userData.id);

        sectors = userSectors?.map((us: any) => us.sectors?.name).filter(Boolean) || [];
      }

      // Converter para formato User
      const user: User = {
        id: userData.id,
        name: userData.name,
        username: userData.username,
        role: userData.role as User['role'],
        sectors: sectors.length > 0 ? sectors : undefined,
        email: userData.email,
        ramal: userData.ramal,
        whatsapp: userData.whatsapp,
        isRequester: userData.is_requester || false,
      };

      const newState = { user, isAuthenticated: true };
      setState(newState);
      
      // Cache temporário no localStorage (apenas para melhorar UX, não é fonte primária)
      // A fonte primária é sempre o Supabase Auth e a tabela users
      try {
        localStorage.setItem('vivaz_auth', JSON.stringify(newState));
      } catch (error) {
        // Ignorar erros de localStorage (pode estar desabilitado)
      }
      setLoading(false);
      setDebugStep('loadUserData:success -> setLoading(false)');
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setState({ user: null, isAuthenticated: false });
      setLoading(false);
      setDebugStep(`loadUserData:catch ${(error as any)?.name || 'Error'}`);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Primeiro, buscar o usuário na tabela users para obter o email (maybeSingle evita 406 se não houver linha)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, username')
        .eq('username', username.toLowerCase())
        .eq('active', true)
        .maybeSingle();

      if (userError || !userData) {
        setLoading(false);
        return { success: false, error: 'Usuário não encontrado ou inativo' };
      }

      // Se o usuário não tem email, não pode fazer login via Supabase Auth
      if (!userData.email) {
        setLoading(false);
        return { success: false, error: 'Usuário não possui email cadastrado. Entre em contato com o administrador.' };
      }

      // Fazer login no Supabase Auth usando o email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      });

      if (authError) {
        console.error('Erro no login:', authError);
        setLoading(false);
        if (authError.message.includes('Invalid login credentials')) {
          return { 
            success: false, 
            error: 'Usuário ou senha incorretos' 
          };
        }
        if (authError.message.includes('Email not confirmed')) {
          return {
            success: false,
            error: 'Email não confirmado. Verifique sua caixa de entrada e a pasta de spam.',
          };
        }
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        setLoading(false);
        return { success: false, error: 'Erro ao autenticar usuário' };
      }

      // Carregar dados do usuário
      await loadUserData(authData.user.id);
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro no login:', error);
      setLoading(false);
      return { success: false, error: error.message || 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    try {
      // Limpar estado primeiro para evitar loading infinito
      setState({ user: null, isAuthenticated: false });
      localStorage.removeItem('vivaz_auth');
      
      // Fazer signOut do Supabase (não bloqueia)
      supabase.auth.signOut().catch(err => {
        console.error('Erro ao fazer signOut:', err);
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, limpar estado local
      setState({ user: null, isAuthenticated: false });
      localStorage.removeItem('vivaz_auth');
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verificar se o email existe na tabela users (maybeSingle evita 406 se não houver linha)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .eq('active', true)
        .maybeSingle();

      if (userError || !userData || !userData.email) {
        return { success: false, error: 'Email não encontrado ou usuário inativo' };
      }

      // Enviar email de recuperação de senha
      // Usar hash router (#) para funcionar com HashRouter
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (resetError) {
        console.error('Erro ao enviar email de recuperação:', resetError);
        return { success: false, error: resetError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      return { success: false, error: error.message || 'Erro ao enviar email de recuperação' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error('Erro ao alterar senha:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      return { success: false, error: error.message || 'Erro ao alterar senha' };
    }
  };

  // Mostrar loading enquanto verifica sessão
  if (loading) {
    const fetchDebug = (() => {
      try {
        return (window as any).__agentSupabaseFetchDebug || null;
      } catch {
        return null;
      }
    })();
    const globalFetchDebug = (() => {
      try {
        return (window as any).__agentGlobalFetchDebug || null;
      } catch {
        return null;
      }
    })();
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
          {debugEnabled ? (
            <div className="mt-3 text-xs text-gray-500 font-mono space-y-1 text-left inline-block">
              <div>debugStep: {debugStep}</div>
              <div>elapsed: {Math.floor((debugNow - debugStartedAt) / 1000)}s</div>
              <div className="pt-1 text-gray-400">supabase.fetch (injetado)</div>
              <div>sb.lastEvent: {fetchDebug?.lastEvent || '(none)'}</div>
              <div>sb.lastHost: {fetchDebug?.lastUrl?.host || '(n/a)'}</div>
              <div>sb.lastPath: {fetchDebug?.lastUrl?.path || '(n/a)'}</div>
              <div>sb.status: {typeof fetchDebug?.lastStatus === 'number' ? fetchDebug.lastStatus : '(n/a)'}</div>
              <div>sb.ms: {typeof fetchDebug?.lastMs === 'number' ? fetchDebug.lastMs : '(n/a)'}</div>
              <div>sb.AbortSignal.timeout: {String(fetchDebug?.hasAbortSignalTimeout)}</div>

              <div className="pt-2 text-gray-400">global.fetch (browser)</div>
              <div>gl.installed: {String(globalFetchDebug?.installed)}</div>
              <div>gl.lastEvent: {globalFetchDebug?.lastEvent || '(none)'}</div>
              <div>gl.lastHost: {globalFetchDebug?.lastUrl?.host || '(n/a)'}</div>
              <div>gl.lastPath: {globalFetchDebug?.lastUrl?.path || '(n/a)'}</div>
              <div>gl.status: {typeof globalFetchDebug?.lastStatus === 'number' ? globalFetchDebug.lastStatus : '(n/a)'}</div>
              <div>gl.ms: {typeof globalFetchDebug?.lastMs === 'number' ? globalFetchDebug.lastMs : '(n/a)'}</div>
              <div>gl.error: {globalFetchDebug?.lastErrorName ? `${globalFetchDebug.lastErrorName}` : '(n/a)'}</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
