
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType extends AuthState {
  login: (username: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Tentar carregar do localStorage primeiro (fallback)
    const saved = localStorage.getItem('vivaz_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (e) {
        console.error('Erro ao carregar auth do localStorage:', e);
      }
    }
  }, []);

  const login = async (username: string): Promise<boolean> => {
    try {
      // Buscar usuário no Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('active', true)
        .single();

      if (error || !userData) {
        console.error('Erro ao buscar usuário:', error);
        return false;
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
      };

      const newState = { user, isAuthenticated: true };
      setState(newState);
      
      // Salvar no localStorage como fallback
      localStorage.setItem('vivaz_auth', JSON.stringify(newState));
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const logout = () => {
    setState({ user: null, isAuthenticated: false });
    localStorage.removeItem('vivaz_auth');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
