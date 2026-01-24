
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExtraRequest, Sector, RequestStatus, RequesterItem, ReasonItem, ExtraPerson, ExtraSaldoRecord, ExtraSaldoSettings, TimeRecord } from '../types';
import { INITIAL_SECTORS, INITIAL_REQUESTERS, INITIAL_REASONS } from '../constants';
import { calculateExtraSaldo } from '../services/extraSaldoService';
import { supabase } from '../services/supabase';
import { 
  mapSector, 
  mapRequester, 
  mapReason, 
  mapExtraPerson, 
  mapExtraRequest, 
  mapExtraSaldoRecord, 
  mapExtraSaldoSettings 
} from '../services/supabaseMappers';

interface ExtraContextType {
  requests: ExtraRequest[];
  sectors: Sector[];
  requesters: RequesterItem[];
  reasons: ReasonItem[];
  extras: ExtraPerson[];
  extraSaldoRecords: ExtraSaldoRecord[];
  extraSaldoSettings: ExtraSaldoSettings;
  addRequest: (request: Omit<ExtraRequest, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateStatus: (id: string, status: RequestStatus, reason?: string, approvedBy?: string) => void;
  deleteRequest: (id: string) => void;
  addSector: (sector: Sector) => void;
  updateSector: (id: string, sector: Sector) => void;
  deleteSector: (id: string) => void;
  addRequester: (requester: RequesterItem) => void;
  updateRequester: (id: string, requester: RequesterItem) => void;
  deleteRequester: (id: string) => void;
  addReason: (reason: ReasonItem) => void;
  updateReason: (id: string, reason: ReasonItem) => void;
  deleteReason: (id: string) => void;
  addExtra: (extra: ExtraPerson) => void;
  deleteExtra: (id: string) => void;
  addExtraSaldoRecord: (record: ExtraSaldoRecord) => void;
  updateExtraSaldoRecord: (id: string, record: ExtraSaldoRecord) => void;
  deleteExtraSaldoRecord: (id: string) => void;
  updateExtraSaldoSettings: (settings: ExtraSaldoSettings) => void;
  updateTimeRecord: (requestId: string, workDate: string, timeRecord: TimeRecord, registeredBy: string) => void;
  getSaldoForWeek: (sector: string, dateStr: string) => number | null | 'no-record';
}

const ExtraContext = createContext<ExtraContextType | undefined>(undefined);

export const ExtraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<ExtraRequest[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);
  const [requesters, setRequesters] = useState<RequesterItem[]>(INITIAL_REQUESTERS);
  const [reasons, setReasons] = useState<ReasonItem[]>(INITIAL_REASONS);
  const [extras, setExtras] = useState<ExtraPerson[]>([]);
  const [extraSaldoRecords, setExtraSaldoRecords] = useState<ExtraSaldoRecord[]>([]);
  const [extraSaldoSettings, setExtraSaldoSettings] = useState<ExtraSaldoSettings>({ valorDiaria: 130 });

  // Load from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar Setores
        const { data: sectorsData, error: sectorsError } = await supabase
          .from('sectors')
          .select('*, sector_roles(*)')
          .eq('active', true)
          .order('name');

        if (!sectorsError && sectorsData) {
          const mappedSectors = sectorsData.map(s => mapSector(s, s.sector_roles));
          setSectors(mappedSectors);
        }

        // Carregar Solicitantes
        const { data: requestersData, error: requestersError } = await supabase
          .from('requesters')
          .select('*')
          .eq('active', true)
          .order('name');

        if (!requestersError && requestersData) {
          setRequesters(requestersData.map(mapRequester));
        }

        // Carregar Motivos
        const { data: reasonsData, error: reasonsError } = await supabase
          .from('reasons')
          .select('*')
          .eq('active', true)
          .order('name');

        if (!reasonsError && reasonsData) {
          setReasons(reasonsData.map(mapReason));
        }

        // Carregar Solicitações com work_days e time_records
        const { data: requestsData, error: requestsError } = await supabase
          .from('extra_requests')
          .select(`
            *,
            sectors(name),
            work_days(
              *,
              time_records(*)
            )
          `)
          .order('created_at', { ascending: false });

        if (!requestsError && requestsData) {
          const mappedRequests = requestsData.map(req => mapExtraRequest(req, req.work_days));
          setRequests(mappedRequests);
        }

        // Carregar Extras
        const { data: extrasData, error: extrasError } = await supabase
          .from('extra_persons')
          .select('*, sectors(name)')
          .eq('active', true)
          .order('full_name');

        if (!extrasError && extrasData) {
          setExtras(extrasData.map(mapExtraPerson));
        }

        // Carregar Saldo Records
        const { data: saldoData, error: saldoError } = await supabase
          .from('extra_saldo_records')
          .select('*, sectors(name)')
          .order('periodo_inicio', { ascending: false });

        if (!saldoError && saldoData) {
          setExtraSaldoRecords(saldoData.map(mapExtraSaldoRecord));
        }

        // Carregar Settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('extra_saldo_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (!settingsError && settingsData) {
          setExtraSaldoSettings(mapExtraSaldoSettings(settingsData));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do Supabase:', error);
        // Fallback para LocalStorage em caso de erro
        const savedRequests = localStorage.getItem('vivaz_requests');
        if (savedRequests) {
          const parsed = JSON.parse(savedRequests);
          const normalized = parsed.map((req: any) => ({
            ...req,
            needsManagerApproval: req.needsManagerApproval ?? false,
            workDays: req.workDays && req.workDays.length
              ? req.workDays
              : [{ date: req.workDate || new Date().toISOString().split('T')[0], shift: req.shift || 'Manhã' }],
          }));
          setRequests(normalized);
        }
      }
    };

    loadData();
  }, []);

  // Sincronização com Supabase é feita nas funções individuais
  // LocalStorage mantido apenas como fallback em caso de erro

  const getWeekRange = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = (date.getDay() + 6) % 7; // Monday = 0
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const isDateInRange = (dateStr: string, start: Date, end: Date) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date >= start && date <= end;
  };

  const countWorkDaysInWeek = (workDays: { date: string }[], start: Date, end: Date) =>
    workDays.filter(d => isDateInRange(d.date, start, end)).length;

  const getRemainingSaldoForWeek = (sector: string, weekStart: Date, weekEnd: Date) => {
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const record = extraSaldoRecords.find(r =>
      r.setor === sector &&
      r.periodoInicio <= weekStartStr &&
      r.periodoFim >= weekEndStr
    );
    if (!record) return 0;
    const result = calculateExtraSaldo(record, record.valorDiariaSnapshot);
    const usedDiarias = requests
      .filter(r => r.sector === sector && r.status === 'APROVADO')
      .reduce((acc, r) => acc + countWorkDaysInWeek(r.workDays, weekStart, weekEnd), 0);
    return result.saldo - usedDiarias;
  };

  const addRequest = async (data: any) => {
    try {
      // Buscar IDs necessários
      const { data: sectorData } = await supabase
        .from('sectors')
        .select('id')
        .eq('name', data.sector)
        .single();

      if (!sectorData) {
        console.error('Setor não encontrado:', data.sector);
        return;
      }

      const firstDay = data.workDays?.[0]?.date || new Date().toISOString().split('T')[0];
      const { start: weekStart, end: weekEnd } = getWeekRange(firstDay);
      const requestedDiarias = countWorkDaysInWeek(data.workDays || [], weekStart, weekEnd);
      const remainingSaldo = getRemainingSaldoForWeek(data.sector, weekStart, weekEnd);
      const canAutoApprove = remainingSaldo > 0 && remainingSaldo >= requestedDiarias;

      // Validar se leaderId é UUID válido
      if (!data.leaderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.leaderId)) {
        console.error('Erro: leaderId não é um UUID válido:', data.leaderId);
        throw new Error('ID do líder inválido. Por favor, faça login novamente.');
      }

      // Criar solicitação no Supabase
      const { data: newRequest, error: requestError } = await supabase
        .from('extra_requests')
        .insert({
          sector_id: sectorData.id,
          role_name: data.role,
          leader_id: data.leaderId,
          leader_name: data.leaderName,
          requester_name: data.requester,
          reason_name: data.reason,
          extra_name: data.extraName,
          value: data.value,
          status: canAutoApprove ? 'APROVADO' : 'SOLICITADO',
          urgency: data.urgency || false,
          observations: data.observations,
          contact: data.contact,
          needs_manager_approval: !canAutoApprove,
          approved_at: canAutoApprove ? new Date().toISOString() : null,
          approved_by: canAutoApprove ? data.leaderId : null,
          created_by: data.leaderId,
        })
        .select()
        .single();

      if (requestError || !newRequest) {
        console.error('Erro ao criar solicitação:', requestError);
        throw requestError || new Error('Erro desconhecido ao criar solicitação');
      }

      // Criar dias de trabalho
      if (data.workDays && data.workDays.length > 0) {
        const workDaysData = data.workDays.map((day: any) => ({
          request_id: newRequest.id,
          work_date: day.date,
          shift: day.shift,
          value: day.value || data.value,
        }));

        const { error: workDaysError } = await supabase
          .from('work_days')
          .insert(workDaysData);

        if (workDaysError) {
          console.error('Erro ao criar dias de trabalho:', workDaysError);
        }
      }

      // Buscar solicitação completa para atualizar estado
      const { data: fullRequest } = await supabase
        .from('extra_requests')
        .select(`
          *,
          sectors(name),
          work_days(
            *,
            time_records(*)
          )
        `)
        .eq('id', newRequest.id)
        .single();

      if (fullRequest) {
        const mappedRequest = mapExtraRequest(fullRequest, fullRequest.work_days);
        setRequests(prev => [mappedRequest, ...prev]);
      } else {
        throw new Error('Solicitação criada mas não foi possível buscar os dados completos');
      }
      return true; // Sucesso
    } catch (error) {
      console.error('Erro ao adicionar solicitação:', error);
      throw error; // Re-throw para que o componente possa tratar
    }
  };

  const updateStatus = async (id: string, status: RequestStatus, reason?: string, approvedBy?: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      let approvedByName = approvedBy;

      if (status === 'APROVADO' && approvedBy) {
        // Validar se approvedBy é UUID válido
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(approvedBy)) {
          console.error('Erro: approvedBy não é um UUID válido:', approvedBy);
          throw new Error('ID do aprovador inválido. Por favor, faça login novamente.');
        }

        // Buscar o nome do usuário pelo UUID
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', approvedBy)
            .single();

          if (userError || !userData) {
            console.error('Erro ao buscar usuário:', userError);
            throw new Error('Usuário não encontrado no banco de dados');
          }

          updateData.approved_by = userData.id;
          approvedByName = userData.name;
        } catch (e: any) {
          console.error('Erro ao buscar nome do usuário:', e);
          throw e;
        }
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'REPROVADO') {
        updateData.rejection_reason = reason;
      } else if (status === 'CANCELADO') {
        updateData.cancellation_reason = reason;
      }

      const { error } = await supabase
        .from('extra_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }

      // Buscar solicitação atualizada para garantir dados corretos
      const { data: updatedRequest } = await supabase
        .from('extra_requests')
        .select(`
          *,
          sectors(name),
          users!extra_requests_approved_by_fkey(name),
          work_days(
            *,
            time_records(*)
          )
        `)
        .eq('id', id)
        .single();

      if (updatedRequest) {
        const mappedRequest = mapExtraRequest(updatedRequest, updatedRequest.work_days);
        // Atualizar estado local com dados do banco
        setRequests(prev => prev.map(req => 
          req.id === id ? mappedRequest : req
        ));
      } else {
        // Fallback: atualizar estado local manualmente
        setRequests(prev => prev.map(req => 
          req.id === id 
            ? { 
                ...req, 
                status, 
                updatedAt: new Date().toISOString(),
                rejectionReason: status === 'REPROVADO' ? reason : req.rejectionReason,
                cancellationReason: status === 'CANCELADO' ? reason : req.cancellationReason,
                approvedBy: status === 'APROVADO' ? approvedByName : req.approvedBy,
                approvedAt: status === 'APROVADO' ? new Date().toISOString() : req.approvedAt
              } 
            : req
        ));
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error; // Re-throw para que o componente possa tratar
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('extra_requests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar solicitação:', error);
        return;
      }

      setRequests(prev => prev.filter(req => req.id !== id));
    } catch (error) {
      console.error('Erro ao deletar solicitação:', error);
    }
  };

  const addSector = async (sector: Sector) => {
    try {
      // Criar setor no Supabase
      const { data: newSector, error: sectorError } = await supabase
        .from('sectors')
        .insert({
          name: sector.name,
          active: true,
        })
        .select()
        .single();

      if (sectorError || !newSector) {
        console.error('Erro ao criar setor:', sectorError);
        return;
      }

      // Criar funções do setor
      if (sector.roles && sector.roles.length > 0) {
        const rolesData = sector.roles.map(roleName => ({
          sector_id: newSector.id,
          role_name: roleName,
          active: true,
        }));

        const { error: rolesError } = await supabase
          .from('sector_roles')
          .insert(rolesData);

        if (rolesError) {
          console.error('Erro ao criar funções:', rolesError);
        }
      }

      // Buscar setor completo para atualizar estado
      const { data: fullSector } = await supabase
        .from('sectors')
        .select('*, sector_roles(*)')
        .eq('id', newSector.id)
        .single();

      if (fullSector) {
        const mappedSector = mapSector(fullSector, fullSector.sector_roles);
        setSectors(prev => [...prev, mappedSector]);
      }
    } catch (error) {
      console.error('Erro ao adicionar setor:', error);
    }
  };

  const updateSector = async (id: string, sector: Sector) => {
    try {
      // O ID pode ser UUID do banco ou ID local, tentar ambos
      let sectorId = id;
      
      // Tentar buscar por ID primeiro
      const { data: existingSector } = await supabase
        .from('sectors')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingSector) {
        // Se não encontrou, buscar pelo nome do setor atual
        const currentSector = sectors.find(s => s.id === id);
        if (currentSector) {
          const { data: byName } = await supabase
            .from('sectors')
            .select('id')
            .eq('name', currentSector.name)
            .single();
          
          if (byName) {
            sectorId = byName.id;
          } else {
            console.error('Setor não encontrado no banco');
            return;
          }
        } else {
          console.error('Setor não encontrado no estado local');
          return;
        }
      } else {
        sectorId = existingSector.id;
      }

      // Atualizar setor
      const { error: updateError } = await supabase
        .from('sectors')
        .update({ name: sector.name })
        .eq('id', sectorId);

      if (updateError) {
        console.error('Erro ao atualizar setor:', updateError);
        return;
      }

      // Deletar funções antigas
      await supabase
        .from('sector_roles')
        .delete()
        .eq('sector_id', sectorId);

      // Criar novas funções
      if (sector.roles && sector.roles.length > 0) {
        const rolesData = sector.roles
          .filter(role => role.trim() !== '') // Remover funções vazias
          .map(roleName => ({
            sector_id: sectorId,
            role_name: roleName.trim(),
            active: true,
          }));

        if (rolesData.length > 0) {
          const { error: rolesError } = await supabase
            .from('sector_roles')
            .insert(rolesData);

          if (rolesError) {
            console.error('Erro ao criar funções:', rolesError);
          }
        }
      }

      // Buscar setor completo para atualizar estado
      const { data: fullSector } = await supabase
        .from('sectors')
        .select('*, sector_roles(*)')
        .eq('id', sectorId)
        .single();

      if (fullSector) {
        const mappedSector = mapSector(fullSector, fullSector.sector_roles);
        setSectors(prev => prev.map(s => s.id === id ? mappedSector : s));
      }
    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
    }
  };

  const deleteSector = async (id: string) => {
    try {
      // Buscar setor no banco
      const { data: existingSector } = await supabase
        .from('sectors')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingSector) {
        // Tentar por nome
        const { data: byName } = await supabase
          .from('sectors')
          .select('id')
          .eq('name', id)
          .single();

        if (!byName) {
          console.error('Setor não encontrado');
          return;
        }

        // Deletar (cascade vai deletar as funções)
        const { error } = await supabase
          .from('sectors')
          .delete()
          .eq('id', byName.id);

        if (error) {
          console.error('Erro ao deletar setor:', error);
          return;
        }

        setSectors(prev => prev.filter(s => s.id !== id && s.name !== id));
      } else {
        const { error } = await supabase
          .from('sectors')
          .delete()
          .eq('id', existingSector.id);

        if (error) {
          console.error('Erro ao deletar setor:', error);
          return;
        }

        setSectors(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Erro ao deletar setor:', error);
    }
  };

  const addRequester = (requester: RequesterItem) => setRequesters(prev => [...prev, requester]);
  const updateRequester = (id: string, requester: RequesterItem) =>
    setRequesters(prev => prev.map(r => r.id === id ? requester : r));
  const deleteRequester = (id: string) => setRequesters(prev => prev.filter(r => r.id !== id));

  const addReason = (reason: ReasonItem) => setReasons(prev => [...prev, reason]);
  const updateReason = (id: string, reason: ReasonItem) =>
    setReasons(prev => prev.map(r => r.id === id ? reason : r));
  const deleteReason = (id: string) => setReasons(prev => prev.filter(r => r.id !== id));

  const addExtra = async (extra: ExtraPerson) => {
    try {
      // Buscar ID do setor
      const { data: sectorData } = await supabase
        .from('sectors')
        .select('id')
        .eq('name', extra.sector)
        .single();

      // Criar extra no Supabase
      const { data: newExtra, error: extraError } = await supabase
        .from('extra_persons')
        .insert({
          full_name: extra.fullName,
          birth_date: extra.birthDate || null,
          cpf: extra.cpf || null,
          contact: extra.contact || null,
          address: extra.address || null,
          emergency_contact: extra.emergencyContact || null,
          sector_id: sectorData?.id || null,
          active: true,
        })
        .select()
        .single();

      if (extraError || !newExtra) {
        console.error('Erro ao criar extra:', extraError);
        return;
      }

      // Buscar extra completo para atualizar estado
      const { data: fullExtra } = await supabase
        .from('extra_persons')
        .select('*, sectors(name)')
        .eq('id', newExtra.id)
        .single();

      if (fullExtra) {
        const mappedExtra = mapExtraPerson(fullExtra);
        setExtras(prev => [mappedExtra, ...prev]);
      }
    } catch (error) {
      console.error('Erro ao adicionar extra:', error);
    }
  };

  const deleteExtra = async (id: string) => {
    try {
      const { error } = await supabase
        .from('extra_persons')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar extra:', error);
        return;
      }

      setExtras(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Erro ao deletar extra:', error);
    }
  };

  const addExtraSaldoRecord = (record: ExtraSaldoRecord) => setExtraSaldoRecords(prev => [record, ...prev]);
  const updateExtraSaldoRecord = (id: string, record: ExtraSaldoRecord) =>
    setExtraSaldoRecords(prev => prev.map(r => r.id === id ? record : r));
  const deleteExtraSaldoRecord = (id: string) => setExtraSaldoRecords(prev => prev.filter(r => r.id !== id));
  const updateExtraSaldoSettings = (settings: ExtraSaldoSettings) => setExtraSaldoSettings(settings);

  const updateTimeRecord = async (requestId: string, workDate: string, timeRecord: TimeRecord, registeredBy: string) => {
    // Atualizar estado local imediatamente (otimistic update)
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      
      return {
        ...req,
        workDays: req.workDays.map(day => 
          day.date === workDate 
            ? { 
                ...day, 
                timeRecord: { 
                  ...day.timeRecord,
                  ...timeRecord,
                  registeredBy: registeredBy || day.timeRecord?.registeredBy, 
                  registeredAt: day.timeRecord?.registeredAt || new Date().toISOString() 
                } 
              }
            : day
        ),
        updatedAt: new Date().toISOString()
      };
    }));

    try {
      // Buscar work_day_id
      const { data: workDay } = await supabase
        .from('work_days')
        .select('id')
        .eq('request_id', requestId)
        .eq('work_date', workDate)
        .single();

      if (!workDay) {
        console.error('Dia de trabalho não encontrado');
        return;
      }

      // Buscar usuário que está registrando
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('name', registeredBy)
        .single();

      // Verificar se já existe registro
      const { data: existingRecord } = await supabase
        .from('time_records')
        .select('id')
        .eq('work_day_id', workDay.id)
        .single();

      const timeRecordData = {
        work_day_id: workDay.id,
        arrival: timeRecord.arrival || null,
        break_start: timeRecord.breakStart || null,
        break_end: timeRecord.breakEnd || null,
        departure: timeRecord.departure || null,
        photo_url: timeRecord.photoUrl || null,
        registered_by: userData?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (existingRecord) {
        // Atualizar
        const { error } = await supabase
          .from('time_records')
          .update(timeRecordData)
          .eq('work_day_id', workDay.id);

        if (error) {
          console.error('Erro ao atualizar registro de ponto:', error);
          // Reverter estado local em caso de erro
          setRequests(prev => prev.map(req => {
            if (req.id !== requestId) return req;
            return {
              ...req,
              workDays: req.workDays.map(day => 
                day.date === workDate 
                  ? { 
                      ...day, 
                      timeRecord: day.timeRecord || {} 
                    }
                  : day
              )
            };
          }));
          return;
        }
      } else {
        // Criar novo
        const { error } = await supabase
          .from('time_records')
          .insert(timeRecordData);

        if (error) {
          console.error('Erro ao criar registro de ponto:', error);
          // Reverter estado local em caso de erro
          setRequests(prev => prev.map(req => {
            if (req.id !== requestId) return req;
            return {
              ...req,
              workDays: req.workDays.map(day => 
                day.date === workDate 
                  ? { 
                      ...day, 
                      timeRecord: day.timeRecord || {} 
                    }
                  : day
              )
            };
          }));
          return;
        }
      }

      // Atualizar estado local novamente com dados confirmados do servidor
      setRequests(prev => prev.map(req => {
        if (req.id !== requestId) return req;
        
        return {
          ...req,
          workDays: req.workDays.map(day => 
            day.date === workDate 
              ? { 
                  ...day, 
                  timeRecord: { 
                    ...timeRecord, 
                    registeredBy, 
                    registeredAt: new Date().toISOString() 
                  } 
                }
              : day
          ),
          updatedAt: new Date().toISOString()
        };
      }));
    } catch (error) {
      console.error('Erro ao atualizar registro de ponto:', error);
      // Reverter estado local em caso de erro
      setRequests(prev => prev.map(req => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          workDays: req.workDays.map(day => 
            day.date === workDate 
              ? { 
                  ...day, 
                  timeRecord: day.timeRecord || {} 
                }
              : day
          )
        };
      }));
    }
  };

  // Função pública para obter saldo disponível para uma semana
  // Retorna: null se não há setor/data, número se há registro, ou 'no-record' se não há registro cadastrado
  const getSaldoForWeek = (sector: string, dateStr: string): number | null | 'no-record' => {
    if (!sector || !dateStr) return null;
    const { start, end } = getWeekRange(dateStr);
    const weekStartStr = start.toISOString().split('T')[0];
    const weekEndStr = end.toISOString().split('T')[0];
    const record = extraSaldoRecords.find(r =>
      r.setor === sector &&
      r.periodoInicio <= weekStartStr &&
      r.periodoFim >= weekEndStr
    );
    if (!record) return 'no-record';
    const saldo = getRemainingSaldoForWeek(sector, start, end);
    return saldo;
  };

  return (
    <ExtraContext.Provider value={{ 
      requests, sectors, requesters, reasons, extras, extraSaldoRecords, extraSaldoSettings,
      addRequest, updateStatus, deleteRequest,
      addSector, updateSector, deleteSector,
      addRequester, updateRequester, deleteRequester,
      addReason, updateReason, deleteReason,
      addExtra, deleteExtra,
      addExtraSaldoRecord, updateExtraSaldoRecord, deleteExtraSaldoRecord,
      updateExtraSaldoSettings,
      updateTimeRecord,
      getSaldoForWeek
    }}>
      {children}
    </ExtraContext.Provider>
  );
};

export const useExtras = () => {
  const context = useContext(ExtraContext);
  if (!context) throw new Error('useExtras must be used within ExtraProvider');
  return context;
};
