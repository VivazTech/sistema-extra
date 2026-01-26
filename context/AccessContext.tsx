import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ACCESS_ACTIONS, ACCESS_PAGES, DEFAULT_ROLE_ACCESS } from '../constants';
import { AccessActionKey, AccessPageKey, RoleAccess, UserRole } from '../types';

interface AccessContextType {
  roleAccess: RoleAccess;
  toggleRolePage: (role: UserRole, page: AccessPageKey) => void;
  toggleRoleAction: (role: UserRole, action: AccessActionKey) => void;
  hasPageAccess: (role: UserRole, page: AccessPageKey) => boolean;
  getFirstAccessiblePath: (role: UserRole) => string;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

const STORAGE_KEY = 'vivaz_role_access';

const isValidPage = (page: string): page is AccessPageKey =>
  ACCESS_PAGES.some((item) => item.key === page);

const isValidAction = (action: string): action is AccessActionKey =>
  ACCESS_ACTIONS.some((item) => item.key === action);

const mergeRoleAccess = (saved?: Partial<RoleAccess> | null): RoleAccess => {
  const merged: RoleAccess = JSON.parse(JSON.stringify(DEFAULT_ROLE_ACCESS));
  if (!saved) return merged;

  (Object.keys(DEFAULT_ROLE_ACCESS) as UserRole[]).forEach((role) => {
    const savedRole = saved[role];
    if (!savedRole) return;
    if (Array.isArray(savedRole.pages)) {
      merged[role].pages = savedRole.pages.filter((page) => isValidPage(page));
    }
    if (Array.isArray(savedRole.actions)) {
      merged[role].actions = savedRole.actions.filter((action) => isValidAction(action));
    }
  });

  return merged;
};

const loadRoleAccess = (): RoleAccess => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeRoleAccess(null);
    const parsed = JSON.parse(raw) as Partial<RoleAccess>;
    return mergeRoleAccess(parsed);
  } catch (error) {
    console.error('Erro ao carregar permissões:', error);
    return mergeRoleAccess(null);
  }
};

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roleAccess, setRoleAccess] = useState<RoleAccess>(() => loadRoleAccess());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roleAccess));
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
    }
  }, [roleAccess]);

  const toggleRolePage = (role: UserRole, page: AccessPageKey) => {
    setRoleAccess((prev) => {
      const current = prev[role].pages;
      const exists = current.includes(page);
      const pages = exists ? current.filter((item) => item !== page) : [...current, page];
      return { ...prev, [role]: { ...prev[role], pages } };
    });
  };

  const toggleRoleAction = (role: UserRole, action: AccessActionKey) => {
    setRoleAccess((prev) => {
      const current = prev[role].actions;
      const exists = current.includes(action);
      const actions = exists ? current.filter((item) => item !== action) : [...current, action];
      return { ...prev, [role]: { ...prev[role], actions } };
    });
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
