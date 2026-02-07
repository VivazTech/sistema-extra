import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ACCESS_ACTIONS, ACCESS_PAGES, DEFAULT_ROLE_ACCESS } from '../constants';
import { AccessActionKey, AccessPageKey, RoleAccess, UserRole } from '../types';
import { supabase } from '../services/supabase';

interface AccessContextType {
  roleAccess: RoleAccess;
  loading: boolean;
  toggleRolePage: (role: UserRole, page: AccessPageKey) => void;
  toggleRoleAction: (role: UserRole, action: AccessActionKey) => void;
  hasPageAccess: (role: UserRole, page: AccessPageKey) => boolean;
  getFirstAccessiblePath: (role: UserRole) => string;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

const isValidPage = (page: string): page is AccessPageKey =>
  ACCESS_PAGES.some((item) => item.key === page);

const isValidAction = (action: string): action is AccessActionKey =>
  ACCESS_ACTIONS.some((item) => item.key === action);

// Converter dados do banco para RoleAccess
const mapRoleAccessFromDB = (dbData: any[]): RoleAccess => {
  const result: RoleAccess = JSON.parse(JSON.stringify(DEFAULT_ROLE_ACCESS));
  
  dbData.forEach((row) => {
    const role = row.role as UserRole;
    if (role && result[role]) {
      result[role] = {
        pages: Array.isArray(row.pages) 
          ? row.pages.filter((p: string) => isValidPage(p)) as AccessPageKey[]
          : result[role].pages,
        actions: Array.isArray(row.actions)
          ? row.actions.filter((a: string) => isValidAction(a)) as AccessActionKey[]
          : result[role].actions,
      };
    }
  });
  
  return result;
};

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roleAccess, setRoleAccess] = useState<RoleAccess>(DEFAULT_ROLE_ACCESS);
  const [loading, setLoading] = useState(true);
  const roleAccessRef = useRef<RoleAccess>(roleAccess);
  roleAccessRef.current = roleAccess;

  // Carregar configurações do banco de dados
  useEffect(() => {
    const loadRoleAccess = async () => {
      try {
        const { data, error } = await supabase
          .from('role_access')
          .select('role, pages, actions')
          .order('role');

        if (error) {
          console.error('Erro ao carregar permissões do banco:', error);
          // Usar padrão em caso de erro
          setRoleAccess(DEFAULT_ROLE_ACCESS);
        } else if (data && data.length > 0) {
          const mapped = mapRoleAccessFromDB(data);
          setRoleAccess(mapped);
        } else {
          // Se não houver dados, usar padrão
          setRoleAccess(DEFAULT_ROLE_ACCESS);
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setRoleAccess(DEFAULT_ROLE_ACCESS);
      } finally {
        setLoading(false);
      }
    };

    loadRoleAccess();
  }, []);

  const toggleRolePage = async (role: UserRole, page: AccessPageKey) => {
    const current = roleAccess[role].pages;
    const exists = current.includes(page);
    const pages = exists ? current.filter((item) => item !== page) : [...current, page];
    const nextState = { ...roleAccess, [role]: { ...roleAccess[role], pages } };

    setRoleAccess(nextState);

    try {
      const toSave = roleAccessRef.current[role];
      const { error } = await supabase
        .from('role_access')
        .upsert(
          {
            role,
            pages: toSave.pages,
            actions: toSave.actions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'role' }
        );

      if (error) {
        console.error('Erro ao salvar permissões:', error);
        setRoleAccess((prev) => ({ ...prev, [role]: { ...prev[role], pages: current } }));
        alert('Não foi possível salvar as alterações. Verifique se você é administrador e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      setRoleAccess((prev) => ({ ...prev, [role]: { ...prev[role], pages: current } }));
      alert('Não foi possível salvar as alterações. Tente novamente.');
    }
  };

  const toggleRoleAction = async (role: UserRole, action: AccessActionKey) => {
    const current = roleAccess[role].actions;
    const exists = current.includes(action);
    const actions = exists ? current.filter((item) => item !== action) : [...current, action];
    const nextState = { ...roleAccess, [role]: { ...roleAccess[role], actions } };

    setRoleAccess(nextState);

    try {
      const toSave = roleAccessRef.current[role];
      const { error } = await supabase
        .from('role_access')
        .upsert(
          {
            role,
            pages: toSave.pages,
            actions: toSave.actions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'role' }
        );

      if (error) {
        console.error('Erro ao salvar permissões:', error);
        setRoleAccess((prev) => ({ ...prev, [role]: { ...prev[role], actions: current } }));
        alert('Não foi possível salvar as alterações. Verifique se você é administrador e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      setRoleAccess((prev) => ({ ...prev, [role]: { ...prev[role], actions: current } }));
      alert('Não foi possível salvar as alterações. Tente novamente.');
    }
  };

  const hasPageAccess = (role: UserRole, page: AccessPageKey) =>
    roleAccess[role]?.pages.includes(page);

  const getFirstAccessiblePath = useMemo(() => {
    const pageByKey = new Map(ACCESS_PAGES.map((page) => [page.key, page.path]));
    return (role: UserRole) => {
      const firstPage = ACCESS_PAGES.find((page) => roleAccess[role]?.pages.includes(page.key));
      return pageByKey.get(firstPage?.key || 'portaria') || '/';
    };
  }, [roleAccess]);

  return (
    <AccessContext.Provider
      value={{
        roleAccess,
        loading,
        toggleRolePage,
        toggleRoleAction,
        hasPageAccess,
        getFirstAccessiblePath,
      }}
    >
      {children}
    </AccessContext.Provider>
  );
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) throw new Error('useAccess must be used within AccessProvider');
  return context;
};
