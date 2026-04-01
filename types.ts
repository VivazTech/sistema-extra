
export type UserRole = 'ADMIN' | 'MANAGER' | 'LEADER' | 'VIEWER' | 'PORTARIA';

export type AccessPageKey =
  | 'dashboard'
  | 'requests'
  | 'portaria'
  | 'portaria_pj'
  | 'reports'
  | 'graficos'
  | 'catalogs'
  | 'users'
  | 'saldo'
  | 'extras'
  | 'tv'
  | 'test'
  | 'logs'
  | 'escala';

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
  | 'view_only'
  | 'manage_escala';

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

export interface EmployeeScheduleItem {
  id: string;
  entryTime: string;
  exitTime: string;
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
  /** 'combinado' = valor por dia/turno (total = valor × quantidade de dias); 'por_hora' = cálculo por horas (valor/7h20 × horas). */
  valueType?: 'combinado' | 'por_hora';
  /** Quando preenchido, recibo/relatório usa este total (ex.: solicitações agrupadas por extra = soma dos valores de cada uma). */
  consolidatedTotal?: number;
  /** Valores por dia na ordem de workDays; usado no recibo agrupado para respeitar o tipo de valor de cada solicitação de origem. */
  consolidatedDayValues?: number[];
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

/** Funcionário PJ (Portaria PJ) — apenas nome e setor; sem vínculo com valores de extras. */
export interface PjEmployee {
  id: string;
  name: string;
  sector: string;
  sectorId?: string;
  active?: boolean;
}

export interface Employee {
  id: string;
  name: string;
  sector: string; // resolved sector name
  sectorId?: string; // the database id of the sector
  active?: boolean;
  /** Nome(s) dos turnos do funcionário (ex.: "Manhã,Tarde,Noite"). Usado como metadado da escala. */
  turnos?: string[];
  /** Horário (escala) em texto livre (ex.: "07:00-15:20 / 08:00-16:20"). */
  escalaTime?: string;
  /** Dia fixo de folga: 0=Domingo ... 6=Sábado. -1 = não configurado. */
  fixedDayOff?: number;
  /** Lista de datas (YYYY-MM-DD) em que o funcionário está em férias/afastado. */
  feriasDates?: string[];
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

/** Registro de ação para a seção de logs (auditoria). */
export interface ActionLog {
  id: string;
  user_id: string | null;
  user_name: string;
  created_at: string;
  action_where: string;
  result: string;
  details?: Record<string, unknown>;
}

export interface EscalaUser {
  userId: string;
  userName: string;
  fixedDayOff: number; // 0=Domingo, 1=Segunda, etc.
  escalaTime: string; // Ex: 08:00 12:00 / 13:00 17:00
  extraDaysOff: string[]; // ['2026-03-05', '2026-03-12']
  holidays: string[]; // Feriados específicos ['2026-03-25']
  vacations?: string[]; // Dias em que o funcionário está de férias (YYYY-MM-DD)
  customDays?: Record<string, string>; // Dias específicos de folga ou horários únicos
}

export interface EscalaRecord {
  id: string;
  month: number;
  year: number;
  sector: string;
  data: EscalaUser[];
  createdAt: string;
  updatedAt: string;
}
