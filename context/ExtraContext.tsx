
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExtraRequest, Sector, RequestStatus, RequesterItem, ReasonItem, ExtraPerson, ExtraSaldoRecord, ExtraSaldoSettings, TimeRecord } from '../types';
import { INITIAL_SECTORS, INITIAL_REQUESTERS, INITIAL_REASONS } from '../constants';
import { calculateExtraSaldo } from '../services/extraSaldoService';

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

  // Load from LocalStorage
  useEffect(() => {
    const savedRequests = localStorage.getItem('vivaz_requests');
    const savedSectors = localStorage.getItem('vivaz_sectors');
    const savedRequesters = localStorage.getItem('vivaz_requesters');
    const savedReasons = localStorage.getItem('vivaz_reasons');
    const savedExtras = localStorage.getItem('vivaz_extras');
    const savedExtraSaldoRecords = localStorage.getItem('vivaz_extra_saldo_records');
    const savedExtraSaldoSettings = localStorage.getItem('vivaz_extra_saldo_settings');
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
    if (savedSectors) setSectors(JSON.parse(savedSectors));
    if (savedRequesters) setRequesters(JSON.parse(savedRequesters));
    if (savedReasons) setReasons(JSON.parse(savedReasons));
    if (savedExtras) setExtras(JSON.parse(savedExtras));
    if (savedExtraSaldoRecords) setExtraSaldoRecords(JSON.parse(savedExtraSaldoRecords));
    if (savedExtraSaldoSettings) setExtraSaldoSettings(JSON.parse(savedExtraSaldoSettings));
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('vivaz_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('vivaz_sectors', JSON.stringify(sectors));
  }, [sectors]);

  useEffect(() => {
    localStorage.setItem('vivaz_requesters', JSON.stringify(requesters));
  }, [requesters]);

  useEffect(() => {
    localStorage.setItem('vivaz_reasons', JSON.stringify(reasons));
  }, [reasons]);

  useEffect(() => {
    localStorage.setItem('vivaz_extras', JSON.stringify(extras));
  }, [extras]);

  useEffect(() => {
    localStorage.setItem('vivaz_extra_saldo_records', JSON.stringify(extraSaldoRecords));
  }, [extraSaldoRecords]);

  useEffect(() => {
    localStorage.setItem('vivaz_extra_saldo_settings', JSON.stringify(extraSaldoSettings));
  }, [extraSaldoSettings]);

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

  const addRequest = (data: any) => {
    const firstDay = data.workDays?.[0]?.date || new Date().toISOString().split('T')[0];
    const { start: weekStart, end: weekEnd } = getWeekRange(firstDay);
    const requestedDiarias = countWorkDaysInWeek(data.workDays || [], weekStart, weekEnd);
    const remainingSaldo = getRemainingSaldoForWeek(data.sector, weekStart, weekEnd);
    const canAutoApprove = remainingSaldo > 0 && remainingSaldo >= requestedDiarias;

    const newRequest: ExtraRequest = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      code: `EXT-${new Date().getFullYear()}-${String(requests.length + 1).padStart(4, '0')}`,
      status: canAutoApprove ? 'APROVADO' : 'SOLICITADO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: canAutoApprove ? new Date().toISOString() : undefined,
      approvedBy: canAutoApprove ? 'SISTEMA (SALDO)' : undefined,
      needsManagerApproval: !canAutoApprove
    };
    setRequests(prev => [newRequest, ...prev]);
  };

  const updateStatus = (id: string, status: RequestStatus, reason?: string, approvedBy?: string) => {
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
  };

  const deleteRequest = (id: string) => {
    setRequests(prev => prev.filter(req => req.id !== id));
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

  const updateTimeRecord = (requestId: string, workDate: string, timeRecord: TimeRecord, registeredBy: string) => {
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
