
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User } from '../types';
import { MOCK_USERS } from '../constants';

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
    const saved = localStorage.getItem('vivaz_auth');
    if (saved) {
      setState(JSON.parse(saved));
    }
  }, []);

  const login = async (username: string): Promise<boolean> => {
    // Simulating API call
    const user = MOCK_USERS.find(u => u.username === username.toLowerCase());
    if (user) {
      const newState = { user, isAuthenticated: true };
      setState(newState);
      localStorage.setItem('vivaz_auth', JSON.stringify(newState));
      return true;
    }
    return false;
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
