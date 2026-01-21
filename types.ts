
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

export interface ExtraRequest {
  id: string;
  code: string; // e.g., EXT-2024-0001
  sector: string;
  role: string;
  workDays: {
    date: string;
    shift: 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada';
  }[];
  leaderId: string;
  leaderName: string;
  requester: string;
  reason: string;
  extraName: string;
  value: number;
  status: RequestStatus;
  urgency: boolean;
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
