import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
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
          await loadUserData(session.user.id);
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
        await loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isAuthenticated: false });
        localStorage.removeItem('vivaz_auth');
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
      setDebugStep('loadUserData:usersQuery:start');
      let { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .eq('active', true)
        .single();

      agentPost({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'context/AuthContext.tsx:loadUserData:usersQuery',message:'loadUserData usersQuery result',data:{hasUserData:!!userData,errorCode:(error as any)?.code,errorMessage:(error as any)?.message},timestamp:Date.now()});
      console.info('[AGENT_DEBUG][B] loadUserData:usersQuery', { hasUserData: !!userData, errorCode: (error as any)?.code, hasError: !!error });
      setDebugStep(`loadUserData:usersQuery hasUser=${!!userData} err=${(error as any)?.code || 'none'}`);

      // Se não encontrou pelo ID, tentar buscar pelo email do Auth
      if (error && error.code === 'PGRST116') {
        console.warn('Usuário não encontrado pelo ID, tentando buscar pelo email...');
        
        // Buscar email do usuário no Auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser?.email) {
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', authUser.email)
            .eq('active', true)
            .single();

          if (!emailError && userByEmail) {
            console.warn('⚠️ Usuário encontrado por email, mas ID não corresponde. Execute o script create-admin-user.js para sincronizar.');
            userData = userByEmail;
            error = null;
          }
        }
      }

      if (error || !userData) {
        console.error('Erro ao buscar dados do usuário:', error);
        console.error('⚠️ O usuário existe no Supabase Auth mas não foi encontrado na tabela users.');
        console.error('Execute o script: node scripts/create-admin-user.js');
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/46453aa1-542a-4700-9266-b4d0c7aab459',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'context/AuthContext.tsx:loadUserData:success',message:'loadUserData success -> setLoading(false)',data:{userRole:user.role,isAuthenticated:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setDebugStep('loadUserData:success -> setLoading(false)');
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setState({ user: null, isAuthenticated: false });
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/46453aa1-542a-4700-9266-b4d0c7aab459',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'context/AuthContext.tsx:loadUserData:catch',message:'loadUserData catch -> setLoading(false)',data:{errorName:(error as any)?.name,errorMessage:(error as any)?.message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setDebugStep(`loadUserData:catch ${(error as any)?.name || 'Error'}`);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Primeiro, buscar o usuário na tabela users para obter o email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, username')
        .eq('username', username.toLowerCase())
        .eq('active', true)
        .single();

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
      // Verificar se o email existe na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .eq('active', true)
        .single();

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

  // Mostrar loading enquanto verifica sessão
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
          {debugEnabled ? (
            <div className="mt-3 text-xs text-gray-500 font-mono space-y-1">
              <div>debugStep: {debugStep}</div>
              <div>elapsed: {Math.floor((Date.now() - debugStartedAt) / 1000)}s</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
