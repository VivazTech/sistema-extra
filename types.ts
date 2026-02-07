
export type UserRole = 'ADMIN' | 'MANAGER' | 'LEADER' | 'VIEWER' | 'PORTARIA';

export type AccessPageKey =
  | 'dashboard'
  | 'requests'
  | 'portaria'
  | 'reports'
  | 'catalogs'
  | 'users'
  | 'saldo'
  | 'extras'
  | 'tv'
  | 'test';

export type AccessActionKey =
  | 'manage_users'
  | 'manage_catalogs'
  | 'manage_extras'
  | 'manage_saldo'
  | 'approve_requests'
  | 'create_requests'
  | 'register_time'
  | 'view_reports'
  | 'view_dashboard'
  | 'view_only';

export type RoleAccess = Record<UserRole, { pages: AccessPageKey[]; actions: AccessActionKey[] }>;

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  sectors?: string[]; // Relevant for Managers
  email?: string;
  ramal?: string;
  whatsapp?: string;
  isRequester?: boolean;
  password?: string; // Only for creation/editing, not stored in state
}

export interface Sector {
  id: string;
  name: string;
  roles: string[];
}

export interface RequesterItem {
  id: string;
  name: string;
}

export interface ReasonItem {
  id: string;
  name: string;
  /** Valor máximo (R$) permitido para este motivo. Definido pelo admin nos Cadastros. */
  maxValue?: number;
}

export interface ShiftItem {
  id: string;
  name: string;
}

export type RequestStatus = 'SOLICITADO' | 'APROVADO' | 'REPROVADO' | 'CANCELADO';

export interface TimeRecord {
  arrival?: string;
  breakStart?: string;
  breakEnd?: string;
  departure?: string;
  photoUrl?: string;
  registeredBy?: string;
  registeredAt?: string;
  /** Observação da portaria (acontecimentos relevantes do dia). */
  observations?: string;
}

export interface WorkDay {
  date: string;
  shift: string;
  timeRecord?: TimeRecord;
}

export interface ExtraRequest {
  id: string;
  code: string; // e.g., EXT-2024-0001
  sector: string;
  role: string;
  workDays: WorkDay[];
  leaderId: string;
  leaderName: string;
  requester: string;
  reason: string;
  extraName: string;
  /** CPF do funcionário extra (quando vinculado a extra_persons). */
  extraCpf?: string;
  value: number;
  status: RequestStatus;
  needsManagerApproval?: boolean;
  urgency?: boolean;
  observations?: string;
  /** Nome do evento quando reason é EVENTO. */
  eventName?: string;
  contact?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface ExtraPerson {
  id: string;
  fullName: string;
  birthDate: string;
  cpf: string;
  contact: string;
  address: string;
  emergencyContact: string;
  /** Setor principal (primeiro da lista). Mantido para compatibilidade. */
  sector: string;
  /** Setores aos quais o extra pode ser alocado. Permite múltipla seleção no Banco de Extras. */
  sectors?: string[];
  createdAt: string;
}

export interface ExtraSaldoInput {
  setor: string;
  periodoInicio: string;
  periodoFim: string;
  quadroAprovado: number;
  quadroEfetivo: number;
  folgas: number;
  domingos: number;
  demanda: number;
  atestado: number;
  extrasSolicitados: number;
}

export interface ExtraSaldoResult {
  quadroAberto: number;
  vagasDiarias: number;
  totalDiarias: number;
  saldo: number;
  valorDiaria: number;
  valor: number;
  saldoEmReais: number;
}

export interface ExtraSaldoRecord extends ExtraSaldoInput {
  id: string;
  valorDiariaSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraSaldoSettings {
  valorDiaria: number;
}
