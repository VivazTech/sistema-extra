
import { Sector, User, RequesterItem, ReasonItem, RoleAccess, UserRole } from './types';

export const INITIAL_SECTORS: Sector[] = [
  { id: '1', name: 'Restaurante', roles: ['Garçom', 'Cambuzeiro', 'Stuart', 'Cozinheiro', 'Hostess'] },
  { id: '2', name: 'Governança', roles: ['Camareira', 'Auxiliar de Limpeza', 'Governanta'] },
  { id: '3', name: 'Recepção', roles: ['Recepcionista', 'Mensageiro', 'Capitão Porteiro'] },
  { id: '4', name: 'Lazer', roles: ['Monitor', 'Guarda-vidas'] },
  { id: '5', name: 'Manutenção', roles: ['Oficial de Manutenção', 'Piscineiro'] },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Vivaz', username: 'admin', role: 'ADMIN' },
  { id: 'u2', name: 'Carlos Gerente', username: 'gerente', role: 'MANAGER', sectors: ['Restaurante', 'Governança'] },
  { id: 'u3', name: 'Ana Líder', username: 'lider', role: 'LEADER' },
  { id: 'u4', name: 'Painel TV', username: 'tv', role: 'VIEWER' },
];

export const SHIFTS = ['Manhã', 'Tarde', 'Noite', 'Madrugada'] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  LEADER: 'Líder',
  VIEWER: 'Visualizador',
  PORTARIA: 'Portaria',
};

export const ACCESS_PAGES = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'requests', label: 'Solicitações', path: '/solicitacoes' },
  { key: 'portaria', label: 'Portaria', path: '/portaria' },
  { key: 'reports', label: 'Relatórios', path: '/relatorios' },
  { key: 'catalogs', label: 'Cadastros', path: '/admin/cadastros' },
  { key: 'users', label: 'Usuários', path: '/admin/usuarios' },
  { key: 'saldo', label: 'Saldo de Extras', path: '/admin/saldo-extras' },
  { key: 'extras', label: 'Banco de Extras', path: '/admin/extras' },
  { key: 'tv', label: 'Painel 24h', path: '/tv' },
  { key: 'test', label: 'Testes Supabase', path: '/test-supabase' },
] as const;

export const ACCESS_ACTIONS = [
  { key: 'manage_users', label: 'Gerenciar usuários' },
  { key: 'manage_catalogs', label: 'Gerenciar cadastros' },
  { key: 'manage_extras', label: 'Gerenciar banco de extras' },
  { key: 'manage_saldo', label: 'Gerenciar saldo de extras' },
  { key: 'approve_requests', label: 'Aprovar/Reprovar solicitações' },
  { key: 'create_requests', label: 'Criar solicitações' },
  { key: 'register_time', label: 'Registrar horários na portaria' },
  { key: 'view_reports', label: 'Visualizar relatórios' },
  { key: 'view_dashboard', label: 'Visualizar dashboard' },
  { key: 'view_only', label: 'Acesso somente leitura' },
] as const;

export const DEFAULT_ROLE_ACCESS: RoleAccess = {
  ADMIN: {
    pages: ['dashboard', 'requests', 'portaria', 'reports', 'catalogs', 'users', 'saldo', 'extras', 'tv', 'test'],
    actions: ['manage_users', 'manage_catalogs', 'manage_extras', 'manage_saldo', 'approve_requests', 'create_requests', 'register_time', 'view_reports', 'view_dashboard'],
  },
  MANAGER: {
    pages: ['dashboard', 'requests', 'portaria', 'reports', 'saldo', 'tv'],
    actions: ['approve_requests', 'create_requests', 'register_time', 'view_reports', 'view_dashboard'],
  },
  LEADER: {
    pages: ['dashboard', 'requests', 'portaria', 'reports', 'tv'],
    actions: ['create_requests', 'register_time', 'view_reports', 'view_dashboard'],
  },
  VIEWER: {
    pages: ['portaria', 'tv'],
    actions: ['view_only'],
  },
  PORTARIA: {
    pages: ['portaria'],
    actions: ['register_time'],
  },
};

export const INITIAL_REQUESTERS: RequesterItem[] = [
  { id: 'r1', name: 'RH' },
  { id: 'r2', name: 'Gestão' },
  { id: 'r3', name: 'Operação' },
];

export const INITIAL_REASONS: ReasonItem[] = [
  { id: 'm1', name: 'Reforço de equipe' },
  { id: 'm2', name: 'Cobertura de folga' },
  { id: 'm3', name: 'Evento/Alta demanda' },
];
