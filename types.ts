
export type UserRole = 'ADMIN' | 'MANAGER' | 'LEADER' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  sectors?: string[]; // Relevant for Managers
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
}

export type RequestStatus = 'SOLICITADO' | 'APROVADO' | 'REPROVADO' | 'CANCELADO';

export interface TimeRecord {
  arrival?: string;
  breakStart?: string;
  breakEnd?: string;
  departure?: string;
  registeredBy?: string;
  registeredAt?: string;
}

export interface WorkDay {
  date: string;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada';
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
  value: number;
  status: RequestStatus;
  needsManagerApproval?: boolean;
  urgency?: boolean;
  observations?: string;
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
  sector: string;
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
