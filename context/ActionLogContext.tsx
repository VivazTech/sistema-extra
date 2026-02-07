import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { logAction as logActionService } from '../services/actionLogService';

interface ActionLogContextType {
  /** Registra ação: onde clicou e o que retornou. Usa usuário logado. */
  logAction: (actionWhere: string, result: string, details?: Record<string, unknown>) => void;
}

const ActionLogContext = createContext<ActionLogContextType | undefined>(undefined);

export const ActionLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const logAction = useCallback(
    (actionWhere: string, result: string, details?: Record<string, unknown>) => {
      if (!user?.id || !user?.name) return;
      logActionService(user.id, user.name, actionWhere, result, details).catch(() => {});
    },
    [user?.id, user?.name]
  );

  return (
    <ActionLogContext.Provider value={{ logAction }}>
      {children}
    </ActionLogContext.Provider>
  );
};

export const useActionLog = (): ActionLogContextType => {
  const context = useContext(ActionLogContext);
  if (!context) {
    return {
      logAction: () => {},
    };
  }
  return context;
};
