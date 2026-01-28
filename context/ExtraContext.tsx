
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ExtraRequest, Sector, RequestStatus, RequesterItem, ReasonItem, ExtraPerson, ExtraSaldoInput, ExtraSaldoRecord, ExtraSaldoSettings, TimeRecord, User } from '../types';
// Removido: INITIAL_SECTORS, INITIAL_REQUESTERS, INITIAL_REASONS - dados agora vêm apenas do banco
import { calculateExtraSaldo } from '../services/extraSaldoService';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
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
  users: User[];
  addRequest: (request: Omit<ExtraRequest, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateStatus: (id: string, status: RequestStatus, reason?: string, approvedBy?: string) => void;
  deleteRequest: (id: string) => void;
  addSector: (sector: Sector) => void;
  updateSector: (id: string, sector: Sector) => void;
  deleteSector: (id: string) => void;
  addRequester: (requester: RequesterItem) => Promise<RequesterItem | null>;
  updateRequester: (id: string, requester: RequesterItem) => Promise<void>;
  deleteRequester: (id: string) => Promise<void>;
  addReason: (reason: ReasonItem) => Promise<ReasonItem | null>;
  updateReason: (id: string, reason: ReasonItem) => Promise<void>;
  deleteReason: (id: string) => Promise<void>;
  addExtra: (extra: ExtraPerson) => void;
  deleteExtra: (id: string) => void;
  addExtraSaldoRecord: (input: ExtraSaldoInput, valorDiariaSnapshot: number) => Promise<void>;
  updateExtraSaldoRecord: (id: string, input: ExtraSaldoInput, valorDiariaSnapshot: number) => Promise<void>;
  deleteExtraSaldoRecord: (id: string) => Promise<void>;
  updateExtraSaldoSettings: (settings: ExtraSaldoSettings) => void;
  updateTimeRecord: (requestId: string, workDate: string, timeRecord: TimeRecord, registeredBy: string) => void;
  appendRequestObservation: (requestId: string, note: string) => Promise<void>;
  removeWorkDay: (requestId: string, workDate: string, registeredBy: string) => Promise<void>;
  getSaldoForWeek: (sector: string, dateStr: string) => number | null | 'no-record';
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const ExtraContext = createContext<ExtraContextType | undefined>(undefined);

export const ExtraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExtraRequest[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]); // Carregado apenas do banco
  const [requesters, setRequesters] = useState<RequesterItem[]>([]); // Carregado apenas do banco
  const [reasons, setReasons] = useState<ReasonItem[]>([]); // Carregado apenas do banco
  const [extras, setExtras] = useState<ExtraPerson[]>([]);
  const [extraSaldoRecords, setExtraSaldoRecords] = useState<ExtraSaldoRecord[]>([]);
  const [extraSaldoSettings, setExtraSaldoSettings] = useState<ExtraSaldoSettings>({ valorDiaria: 130 });
  const [users, setUsers] = useState<User[]>([]);

  const managerSectorSet = useMemo(() => {
    if (user?.role !== 'MANAGER') return null;
    const sectorsList = user.sectors || [];
    return new Set(sectorsList);
  }, [user?.role, user?.sectors]);

  const filterByManagerSector = useMemo(() => {
    return <T,>(items: T[], sectorSelector: (item: T) => string) => {
      if (!managerSectorSet) return items;
      if (managerSectorSet.size === 0) return [];
      return items.filter(item => managerSectorSet.has(sectorSelector(item)));
    };
  }, [managerSectorSet]);

  const visibleSectors = useMemo(
    () => filterByManagerSector(sectors, sector => sector.name),
    [filterByManagerSector, sectors]
  );

  const visibleRequests = useMemo(
    () => filterByManagerSector(requests, request => request.sector),
    [filterByManagerSector, requests]
  );

  const visibleExtras = useMemo(
    () => filterByManagerSector(extras, extra => extra.sector),
    [filterByManagerSector, extras]
  );

  const visibleExtraSaldoRecords = useMemo(
    () => filterByManagerSector(extraSaldoRecords, record => record.setor),
    [filterByManagerSector, extraSaldoRecords]
  );

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

        // Carregar Usuários
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(`
            *,
            user_sectors(
              sectors(name)
            )
          `)
          .eq('active', true)
          .order('name');

        if (!usersError && usersData) {
          const mappedUsers = usersData.map((u: any) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            role: u.role,
            email: u.email,
            ramal: u.ramal,
            whatsapp: u.whatsapp,
            isRequester: u.is_requester || false,
            sectors: u.user_sectors?.map((us: any) => us.sectors?.name).filter(Boolean) || [],
          }));
          setUsers(mappedUsers);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do Supabase:', error);
        // Nota: Não usar localStorage como fallback - dados devem vir apenas do banco
        // Se houver erro, o sistema deve mostrar mensagem de erro ao usuário
        // e tentar recarregar os dados
      }
    };

    loadData();
  }, []);

  // Sincronização com Supabase é feita nas funções individuais
  // Todos os dados vêm exclusivamente do banco de dados

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

  const addRequester = async (requester: RequesterItem): Promise<RequesterItem | null> => {
    try {
      // Criar no Supabase
      const { data: newRequester, error } = await supabase
        .from('requesters')
        .insert({
          name: requester.name,
          active: true,
        })
        .select()
        .single();

      if (error || !newRequester) {
        console.error('Erro ao criar demandante:', error);
        return null;
      }

      // Atualizar estado local
      const mappedRequester = mapRequester(newRequester);
      setRequesters(prev => [...prev, mappedRequester]);
      return mappedRequester;
    } catch (error) {
      console.error('Erro ao adicionar demandante:', error);
      return null;
    }
  };

  const updateRequester = async (id: string, requester: RequesterItem) => {
    try {
      // Buscar ID no banco (pode ser UUID ou ID local)
      let requesterId = id;
      
      const { data: existingRequester } = await supabase
        .from('requesters')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingRequester) {
        // Tentar buscar pelo nome do requester atual
        const currentRequester = requesters.find(r => r.id === id);
        if (currentRequester) {
          const { data: byName } = await supabase
            .from('requesters')
            .select('id')
            .eq('name', currentRequester.name)
            .single();
          
          if (byName) {
            requesterId = byName.id;
          } else {
            console.error('Demandante não encontrado no banco');
            return;
          }
        } else {
          console.error('Demandante não encontrado no estado local');
          return;
        }
      } else {
        requesterId = existingRequester.id;
      }

      // Atualizar no Supabase
      const { error } = await supabase
        .from('requesters')
        .update({ name: requester.name })
        .eq('id', requesterId);

      if (error) {
        console.error('Erro ao atualizar demandante:', error);
        return;
      }

      // Atualizar estado local
      setRequesters(prev => prev.map(r => r.id === id ? { ...requester, id: requesterId } : r));
    } catch (error) {
      console.error('Erro ao atualizar demandante:', error);
    }
  };

  const deleteRequester = async (id: string) => {
    try {
      // Buscar no banco
      const { data: existingRequester } = await supabase
        .from('requesters')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingRequester) {
        // Tentar por nome
        const currentRequester = requesters.find(r => r.id === id);
        if (currentRequester) {
          const { data: byName } = await supabase
            .from('requesters')
            .select('id')
            .eq('name', currentRequester.name)
            .single();

          if (byName) {
            const { error } = await supabase
              .from('requesters')
              .update({ active: false })
              .eq('id', byName.id);

            if (error) {
              console.error('Erro ao deletar demandante:', error);
              return;
            }

            setRequesters(prev => prev.filter(r => r.id !== id));
            return;
          }
        }
        console.error('Demandante não encontrado');
        return;
      }

      // Soft delete (marcar como inativo)
      const { error } = await supabase
        .from('requesters')
        .update({ active: false })
        .eq('id', existingRequester.id);

      if (error) {
        console.error('Erro ao deletar demandante:', error);
        return;
      }

      setRequesters(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao deletar demandante:', error);
    }
  };

  const addReason = async (reason: ReasonItem): Promise<ReasonItem | null> => {
    try {
      // Criar no Supabase
      const { data: newReason, error } = await supabase
        .from('reasons')
        .insert({
          name: reason.name,
          active: true,
        })
        .select()
        .single();

      if (error || !newReason) {
        console.error('Erro ao criar motivo:', error);
        return null;
      }

      // Atualizar estado local
      const mappedReason = mapReason(newReason);
      setReasons(prev => [...prev, mappedReason]);
      return mappedReason;
    } catch (error) {
      console.error('Erro ao adicionar motivo:', error);
      return null;
    }
  };

  const updateReason = async (id: string, reason: ReasonItem) => {
    try {
      // Buscar ID no banco (pode ser UUID ou ID local)
      let reasonId = id;
      
      const { data: existingReason } = await supabase
        .from('reasons')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingReason) {
        // Tentar buscar pelo nome do reason atual
        const currentReason = reasons.find(r => r.id === id);
        if (currentReason) {
          const { data: byName } = await supabase
            .from('reasons')
            .select('id')
            .eq('name', currentReason.name)
            .single();
          
          if (byName) {
            reasonId = byName.id;
          } else {
            console.error('Motivo não encontrado no banco');
            return;
          }
        } else {
          console.error('Motivo não encontrado no estado local');
          return;
        }
      } else {
        reasonId = existingReason.id;
      }

      // Atualizar no Supabase
      const { error } = await supabase
        .from('reasons')
        .update({ name: reason.name })
        .eq('id', reasonId);

      if (error) {
        console.error('Erro ao atualizar motivo:', error);
        return;
      }

      // Atualizar estado local
      setReasons(prev => prev.map(r => r.id === id ? { ...reason, id: reasonId } : r));
    } catch (error) {
      console.error('Erro ao atualizar motivo:', error);
    }
  };

  const deleteReason = async (id: string) => {
    try {
      // Buscar no banco
      const { data: existingReason } = await supabase
        .from('reasons')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingReason) {
        // Tentar por nome
        const currentReason = reasons.find(r => r.id === id);
        if (currentReason) {
          const { data: byName } = await supabase
            .from('reasons')
            .select('id')
            .eq('name', currentReason.name)
            .single();

          if (byName) {
            const { error } = await supabase
              .from('reasons')
              .update({ active: false })
              .eq('id', byName.id);

            if (error) {
              console.error('Erro ao deletar motivo:', error);
              return;
            }

            setReasons(prev => prev.filter(r => r.id !== id));
            return;
          }
        }
        console.error('Motivo não encontrado');
        return;
      }

      // Soft delete (marcar como inativo)
      const { error } = await supabase
        .from('reasons')
        .update({ active: false })
        .eq('id', existingReason.id);

      if (error) {
        console.error('Erro ao deletar motivo:', error);
        return;
      }

      setReasons(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao deletar motivo:', error);
    }
  };

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

  const getSectorIdByName = async (sectorName: string): Promise<string> => {
    const local = sectors.find(s => s.name === sectorName);
    if (local?.id) return local.id;
    const { data, error } = await supabase
      .from('sectors')
      .select('id')
      .eq('name', sectorName)
      .single();
    if (error || !data?.id) throw error || new Error('Setor não encontrado');
    return data.id;
  };

  const addExtraSaldoRecord = async (input: ExtraSaldoInput, valorDiariaSnapshot: number) => {
    try {
      const sectorId = await getSectorIdByName(input.setor);
      const { data, error } = await supabase
        .from('extra_saldo_records')
        .insert({
          sector_id: sectorId,
          periodo_inicio: input.periodoInicio,
          periodo_fim: input.periodoFim,
          quadro_aprovado: input.quadroAprovado,
          quadro_efetivo: input.quadroEfetivo,
          folgas: input.folgas,
          domingos: input.domingos,
          demanda: input.demanda,
          atestado: input.atestado,
          extras_solicitados: input.extrasSolicitados || 0,
          valor_diaria_snapshot: valorDiariaSnapshot,
          created_by: user?.id || null,
        })
        .select('*, sectors(name)')
        .single();

      if (error || !data) throw error || new Error('Erro ao salvar registro de saldo');
      const mapped = mapExtraSaldoRecord(data);
      setExtraSaldoRecords(prev => [mapped, ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar registro de saldo:', error);
      throw error;
    }
  };

  const updateExtraSaldoRecord = async (id: string, input: ExtraSaldoInput, valorDiariaSnapshot: number) => {
    try {
      const sectorId = await getSectorIdByName(input.setor);
      const { data, error } = await supabase
        .from('extra_saldo_records')
        .update({
          sector_id: sectorId,
          periodo_inicio: input.periodoInicio,
          periodo_fim: input.periodoFim,
          quadro_aprovado: input.quadroAprovado,
          quadro_efetivo: input.quadroEfetivo,
          folgas: input.folgas,
          domingos: input.domingos,
          demanda: input.demanda,
          atestado: input.atestado,
          extras_solicitados: input.extrasSolicitados || 0,
          valor_diaria_snapshot: valorDiariaSnapshot,
        })
        .eq('id', id)
        .select('*, sectors(name)')
        .single();

      if (error || !data) throw error || new Error('Erro ao atualizar registro de saldo');
      const mapped = mapExtraSaldoRecord(data);
      setExtraSaldoRecords(prev => prev.map(r => (r.id === id ? mapped : r)));
    } catch (error) {
      console.error('Erro ao atualizar registro de saldo:', error);
      throw error;
    }
  };

  const deleteExtraSaldoRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('extra_saldo_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setExtraSaldoRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao deletar registro de saldo:', error);
      throw error;
    }
  };

  const updateExtraSaldoSettings = (settings: ExtraSaldoSettings) => {
    setExtraSaldoSettings(settings);
    // Persistir no banco sem travar UI (salvar a última configuração)
    void supabase
      .from('extra_saldo_settings')
      .insert({
        valor_diaria: settings.valorDiaria,
        updated_by: user?.id || null,
      })
      .then(({ error }) => {
        if (error) console.error('Erro ao salvar configurações de saldo:', error);
      });
  };

  const appendRequestObservation = async (requestId: string, note: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request || !note.trim()) return;

    const existing = request.observations?.trim() || '';
    if (existing.includes(note)) return;

    const updatedObservations = existing ? `${existing}\n${note}` : note;
    const updatedAt = new Date().toISOString();

    // Atualizar estado local imediatamente
    setRequests(prev => prev.map(req =>
      req.id === requestId
        ? { ...req, observations: updatedObservations, updatedAt }
        : req
    ));

    try {
      const { error } = await supabase
        .from('extra_requests')
        .update({
          observations: updatedObservations,
          updated_at: updatedAt,
        })
        .eq('id', requestId);

      if (error) {
        console.error('Erro ao atualizar observações:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar observações:', error);
    }
  };

  const removeWorkDay = async (requestId: string, workDate: string, registeredBy: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    const workDay = request.workDays.find(d => d.date === workDate);
    if (!workDay) return;

    const formattedDate = new Date(`${workDate}T00:00:00`).toLocaleDateString('pt-BR');
    const note = `PORTARIA - Extra faltou: ${request.extraName} não compareceu no dia ${formattedDate}. Registrado por ${registeredBy}.`;

    // Atualizar estado local imediatamente (remover workDay)
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      
      const updatedWorkDays = req.workDays.filter(d => d.date !== workDate);
      
      // Remover workDay mesmo que seja o último - se faltou, não deve aparecer na lista
      return {
        ...req,
        workDays: updatedWorkDays,
        observations: req.observations ? `${req.observations}\n${note}` : note,
        updatedAt: new Date().toISOString()
      };
    }));

    try {
      // Buscar work_day_id
      const { data: workDayData } = await supabase
        .from('work_days')
        .select('id')
        .eq('request_id', requestId)
        .eq('work_date', workDate)
        .single();

      if (workDayData) {
        // Deletar time_records relacionados (se existir)
        await supabase
          .from('time_records')
          .delete()
          .eq('work_day_id', workDayData.id);

        // Deletar work_day
        const { error: deleteError } = await supabase
          .from('work_days')
          .delete()
          .eq('id', workDayData.id);

        if (deleteError) {
          console.error('Erro ao deletar dia de trabalho:', deleteError);
          throw deleteError;
        }
      }

      // Adicionar observação
      const existing = request.observations?.trim() || '';
      const updatedObservations = existing ? `${existing}\n${note}` : note;
      
      const { error: obsError } = await supabase
        .from('extra_requests')
        .update({
          observations: updatedObservations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (obsError) {
        console.error('Erro ao atualizar observações:', obsError);
      }

      // Recarregar dados do banco para garantir sincronização
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
        .eq('id', requestId)
        .single();

      if (updatedRequest) {
        const mappedRequest = mapExtraRequest(updatedRequest, updatedRequest.work_days);
        setRequests(prev => prev.map(req => 
          req.id === requestId ? mappedRequest : req
        ));
      }
    } catch (error) {
      console.error('Erro ao remover dia de trabalho:', error);
      // Reverter estado local em caso de erro
      setRequests(prev => prev.map(req => {
        if (req.id !== requestId) return req;
        return request; // Restaurar request original
      }));
    }
  };

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

  const addUser = async (userData: Partial<User>) => {
    try {
      if (!userData.name || !userData.username) {
        throw new Error('Nome e usuário são obrigatórios');
      }

      if (!userData.email) {
        throw new Error('Email é obrigatório para criar usuário');
      }

      if (!userData.password) {
        throw new Error('Senha é obrigatória para criar usuário');
      }

      // Criar usuário no Supabase Auth primeiro
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username.toLowerCase(),
          },
        },
      });

      if (authError) {
        console.error('Erro ao criar usuário no Auth:', authError);
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário no sistema de autenticação');
      }

      // Criar usuário na tabela users com o ID do Auth
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Usar o ID do Auth
          name: userData.name,
          username: userData.username.toLowerCase(),
          email: userData.email,
          ramal: userData.ramal || null,
          whatsapp: userData.whatsapp || null,
          role: userData.role || 'VIEWER',
          is_requester: userData.isRequester || false,
        })
        .select()
        .single();

      if (userError || !newUser) {
        console.error('Erro ao criar usuário na tabela:', userError);
        // Se falhar, tentar remover o usuário do Auth (opcional)
        throw userError;
      }

      // Se o usuário é demandante, criar também na tabela requesters
      if (userData.isRequester) {
        const { error: requesterError } = await supabase
          .from('requesters')
          .insert({
            name: userData.name,
            active: true,
          })
          .select()
          .single();

        if (requesterError) {
          console.error('Erro ao criar demandante:', requesterError);
        } else {
          // Recarregar requesters
          const { data: requestersData } = await supabase
            .from('requesters')
            .select('*')
            .eq('active', true)
            .order('name');
          if (requestersData) {
            setRequesters(requestersData.map(mapRequester));
          }
        }
      }

      // Adicionar setor se fornecido
      if (userData.sectors && userData.sectors.length > 0) {
        const sector = sectors.find(s => s.name === userData.sectors![0]);
        if (sector) {
          await supabase
            .from('user_sectors')
            .insert({
              user_id: newUser.id,
              sector_id: sector.id,
            });
        }
      }

      // Recarregar usuários
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          *,
          user_sectors(
            sectors(name)
          )
        `)
        .eq('active', true)
        .order('name');

      if (usersData) {
        const mappedUsers = usersData.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          email: u.email,
          ramal: u.ramal,
          whatsapp: u.whatsapp,
          isRequester: u.is_requester || false,
          sectors: u.user_sectors?.map((us: any) => us.sectors?.name).filter(Boolean) || [],
        }));
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      // Buscar usuário existente para obter email do Auth
      const existingUser = users.find(u => u.id === id);
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Atualizar usuário na tabela users
      const updateData: any = {
        name: userData.name,
        username: userData.username?.toLowerCase(),
        email: userData.email || null,
        ramal: userData.ramal || null,
        whatsapp: userData.whatsapp || null,
        role: userData.role,
        is_requester: userData.isRequester || false,
      };

      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id);

      if (userError) {
        console.error('Erro ao atualizar usuário:', userError);
        throw userError;
      }

      // Se a senha foi fornecida, atualizar no Supabase Auth
      if (userData.password && existingUser.email) {
        // Para atualizar senha, precisamos usar resetPasswordForEmail ou Admin API
        // Por enquanto, vamos apenas atualizar o email se mudou
        if (userData.email && userData.email !== existingUser.email) {
          // Atualizar email no Auth (requer Admin API ou Edge Function)
          // Por enquanto, apenas logamos o aviso
          console.warn('Atualização de email requer ação manual no Supabase Dashboard');
        }
      }

      // Gerenciar demandante
      if (userData.isRequester && !existingUser?.isRequester) {
        // Criar como demandante
        await supabase
          .from('requesters')
          .insert({
            name: userData.name!,
            active: true,
          });
      } else if (!userData.isRequester && existingUser?.isRequester) {
        // Remover como demandante (soft delete)
        await supabase
          .from('requesters')
          .update({ active: false })
          .eq('name', existingUser.name);
      } else if (userData.isRequester && existingUser?.isRequester && userData.name !== existingUser.name) {
        // Atualizar nome do demandante
        await supabase
          .from('requesters')
          .update({ name: userData.name })
          .eq('name', existingUser.name);
      }

      // Atualizar setores
      if (userData.sectors !== undefined) {
        // Remover setores antigos
        await supabase
          .from('user_sectors')
          .delete()
          .eq('user_id', id);

        // Adicionar novo setor
        if (userData.sectors.length > 0) {
          const sector = sectors.find(s => s.name === userData.sectors![0]);
          if (sector) {
            await supabase
              .from('user_sectors')
              .insert({
                user_id: id,
                sector_id: sector.id,
              });
          }
        }
      }

      // Recarregar usuários e requesters
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          *,
          user_sectors(
            sectors(name)
          )
        `)
        .eq('active', true)
        .order('name');

      if (usersData) {
        const mappedUsers = usersData.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          email: u.email,
          ramal: u.ramal,
          whatsapp: u.whatsapp,
          isRequester: u.is_requester || false,
          sectors: u.user_sectors?.map((us: any) => us.sectors?.name).filter(Boolean) || [],
        }));
        setUsers(mappedUsers);
      }

      // Recarregar requesters se necessário
      if (userData.isRequester !== undefined) {
        const { data: requestersData } = await supabase
          .from('requesters')
          .select('*')
          .eq('active', true)
          .order('name');
        if (requestersData) {
          setRequesters(requestersData.map(mapRequester));
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const user = users.find(u => u.id === id);
      if (!user) return;

      // Soft delete do usuário
      const { error } = await supabase
        .from('users')
        .update({ active: false })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar usuário:', error);
        throw error;
      }

      // Se for demandante, fazer soft delete também
      if (user.isRequester) {
        await supabase
          .from('requesters')
          .update({ active: false })
          .eq('name', user.name);
      }

      // Remover setores
      await supabase
        .from('user_sectors')
        .delete()
        .eq('user_id', id);

      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  };

  return (
    <ExtraContext.Provider value={{ 
      requests: visibleRequests,
      sectors: visibleSectors,
      requesters,
      reasons,
      extras: visibleExtras,
      extraSaldoRecords: visibleExtraSaldoRecords,
      extraSaldoSettings,
      users,
      addRequest, updateStatus, deleteRequest,
      addSector, updateSector, deleteSector,
      addRequester, updateRequester, deleteRequester,
      addReason, updateReason, deleteReason,
      addExtra, deleteExtra,
      addExtraSaldoRecord, updateExtraSaldoRecord, deleteExtraSaldoRecord,
      updateExtraSaldoSettings,
      updateTimeRecord,
      appendRequestObservation,
      removeWorkDay,
      getSaldoForWeek,
      addUser, updateUser, deleteUser
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
