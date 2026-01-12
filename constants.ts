
import { Sector, User } from './types';

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
