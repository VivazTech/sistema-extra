
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
        })
        .select()
        .single();

      if (requestError || !newRequest) {
        console.error('Erro ao criar solicitação:', requestError);
        return;
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
      }
    } catch (error) {
      console.error('Erro ao adicionar solicitação:', error);
    }
  };

  const updateStatus = async (id: string, status: RequestStatus, reason?: string, approvedBy?: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'APROVADO') {
        updateData.approved_by = approvedBy;
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
        return;
      }

      // Atualizar estado local
      setRequests(prev => prev.map(req => 
        req.id === id 
          ? { 
              ...req, 
              status, 
              updatedAt: new Date().toISOString(),
              rejectionReason: status === 'REPROVADO' ? reason : req.rejectionReason,
              cancellationReason: status === 'CANCELADO' ? reason : req.cancellationReason,
              approvedBy: status === 'APROVADO' ? approvedBy : req.approvedBy,
              approvedAt: status === 'APROVADO' ? new Date().toISOString() : req.approvedAt
            } 
          : req
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
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

  const addSector = (sector: Sector) => setSectors(prev => [...prev, sector]);
  const updateSector = (id: string, sector: Sector) => 
    setSectors(prev => prev.map(s => s.id === id ? sector : s));
  const deleteSector = (id: string) => setSectors(prev => prev.filter(s => s.id !== id));

  const addRequester = (requester: RequesterItem) => setRequesters(prev => [...prev, requester]);
  const updateRequester = (id: string, requester: RequesterItem) =>
    setRequesters(prev => prev.map(r => r.id === id ? requester : r));
  const deleteRequester = (id: string) => setRequesters(prev => prev.filter(r => r.id !== id));

  const addReason = (reason: ReasonItem) => setReasons(prev => [...prev, reason]);
  const updateReason = (id: string, reason: ReasonItem) =>
    setReasons(prev => prev.map(r => r.id === id ? reason : r));
  const deleteReason = (id: string) => setReasons(prev => prev.filter(r => r.id !== id));

  const addExtra = (extra: ExtraPerson) => setExtras(prev => [extra, ...prev]);
  const deleteExtra = (id: string) => setExtras(prev => prev.filter(e => e.id !== id));

  const addExtraSaldoRecord = (record: ExtraSaldoRecord) => setExtraSaldoRecords(prev => [record, ...prev]);
  const updateExtraSaldoRecord = (id: string, record: ExtraSaldoRecord) =>
    setExtraSaldoRecords(prev => prev.map(r => r.id === id ? record : r));
  const deleteExtraSaldoRecord = (id: string) => setExtraSaldoRecords(prev => prev.filter(r => r.id !== id));
  const updateExtraSaldoSettings = (settings: ExtraSaldoSettings) => setExtraSaldoSettings(settings);

  const updateTimeRecord = async (requestId: string, workDate: string, timeRecord: TimeRecord, registeredBy: string) => {
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
          return;
        }
      } else {
        // Criar novo
        const { error } = await supabase
          .from('time_records')
          .insert(timeRecordData);

        if (error) {
          console.error('Erro ao criar registro de ponto:', error);
          return;
        }
      }

      // Atualizar estado local
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
    }
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
      updateTimeRecord
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
