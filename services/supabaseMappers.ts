// ============================================
// MAPPERS - Conversão entre Supabase e Types
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================

import { 
  ExtraRequest, 
  Sector, 
  RequesterItem, 
  ReasonItem, 
  ExtraPerson,
  ExtraSaldoRecord,
  ExtraSaldoSettings,
  WorkDay,
  TimeRecord
} from '../types';

// Converter Sector do Supabase para Type
export const mapSector = (dbSector: any, roles?: any[]): Sector => {
  const sectorRoles = Array.isArray(roles) 
    ? roles.map((r: any) => typeof r === 'string' ? r : r.role_name).filter(Boolean)
    : [];
  
  return {
    id: dbSector.id,
    name: dbSector.name,
    roles: sectorRoles,
  };
};

// Converter RequesterItem do Supabase
export const mapRequester = (dbRequester: any): RequesterItem => ({
  id: dbRequester.id,
  name: dbRequester.name,
});

// Converter ReasonItem do Supabase
export const mapReason = (dbReason: any): ReasonItem => ({
  id: dbReason.id,
  name: dbReason.name,
});

// Converter ExtraPerson do Supabase
export const mapExtraPerson = (dbExtra: any): ExtraPerson => ({
  id: dbExtra.id,
  fullName: dbExtra.full_name,
  birthDate: dbExtra.birth_date,
  cpf: dbExtra.cpf,
  contact: dbExtra.contact,
  address: dbExtra.address,
  emergencyContact: dbExtra.emergency_contact,
  sector: dbExtra.sectors?.name || '',
  createdAt: dbExtra.created_at,
});

// Converter ExtraRequest do Supabase (com work_days e time_records)
export const mapExtraRequest = (dbRequest: any, workDays?: any[]): ExtraRequest => {
  const mappedWorkDays: WorkDay[] = (workDays || []).map((wd: any) => {
    const timeRecord = Array.isArray(wd.time_records) && wd.time_records.length > 0 
      ? wd.time_records[0] 
      : wd.time_records;
    
    return {
      date: wd.work_date,
      shift: wd.shift,
      timeRecord: timeRecord ? {
        arrival: timeRecord.arrival,
        breakStart: timeRecord.break_start,
        breakEnd: timeRecord.break_end,
        departure: timeRecord.departure,
        photoUrl: timeRecord.photo_url,
        registeredBy: timeRecord.registered_by,
        registeredAt: timeRecord.registered_at,
      } : undefined,
    };
  });

  return {
    id: dbRequest.id,
    code: dbRequest.code,
    sector: dbRequest.sectors?.name || dbRequest.sector || '',
    role: dbRequest.role_name,
    workDays: mappedWorkDays.length > 0 ? mappedWorkDays : [{
      date: new Date().toISOString().split('T')[0],
      shift: 'Manhã' as const,
    }],
    leaderId: dbRequest.leader_id,
    leaderName: dbRequest.leader_name,
    requester: dbRequest.requester_name,
    reason: dbRequest.reason_name,
    extraName: dbRequest.extra_name,
    value: parseFloat(dbRequest.value) || 0,
    status: dbRequest.status,
    needsManagerApproval: dbRequest.needs_manager_approval || false,
    urgency: dbRequest.urgency || false,
    observations: dbRequest.observations,
    contact: dbRequest.contact,
    rejectionReason: dbRequest.rejection_reason,
    cancellationReason: dbRequest.cancellation_reason,
    createdAt: dbRequest.created_at,
    updatedAt: dbRequest.updated_at,
    approvedBy: dbRequest.approved_by,
    approvedAt: dbRequest.approved_at,
  };
};

// Converter ExtraSaldoRecord do Supabase
export const mapExtraSaldoRecord = (dbRecord: any): ExtraSaldoRecord => ({
  id: dbRecord.id,
  setor: dbRecord.sectors?.name || '',
  periodoInicio: dbRecord.periodo_inicio,
  periodoFim: dbRecord.periodo_fim,
  quadroAprovado: dbRecord.quadro_aprovado,
  quadroEfetivo: dbRecord.quadro_efetivo,
  folgas: dbRecord.folgas,
  domingos: dbRecord.domingos,
  demanda: dbRecord.demanda,
  atestado: dbRecord.atestado,
  extrasSolicitados: dbRecord.extras_solicitados,
  valorDiariaSnapshot: parseFloat(dbRecord.valor_diaria_snapshot) || 0,
  createdAt: dbRecord.created_at,
  updatedAt: dbRecord.updated_at,
});

// Converter ExtraSaldoSettings do Supabase
export const mapExtraSaldoSettings = (dbSettings: any): ExtraSaldoSettings => ({
  valorDiaria: parseFloat(dbSettings.valor_diaria) || 130,
});

// Preparar dados para inserção no Supabase
export const prepareRequestForInsert = (request: Omit<ExtraRequest, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>) => {
  return {
    sector_id: request.sector, // Será convertido para UUID
    role_name: request.role,
    leader_id: request.leaderId,
    leader_name: request.leaderName,
    requester_name: request.requester,
    reason_name: request.reason,
    extra_name: request.extraName,
    value: request.value,
    urgency: request.urgency || false,
    observations: request.observations,
    contact: request.contact,
    needs_manager_approval: request.needsManagerApproval || false,
  };
};
