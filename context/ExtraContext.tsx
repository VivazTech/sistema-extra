
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExtraRequest, Sector, RequestStatus, RequesterItem, ReasonItem } from '../types';
import { INITIAL_SECTORS, INITIAL_REQUESTERS, INITIAL_REASONS } from '../constants';

interface ExtraContextType {
  requests: ExtraRequest[];
  sectors: Sector[];
  requesters: RequesterItem[];
  reasons: ReasonItem[];
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
}

const ExtraContext = createContext<ExtraContextType | undefined>(undefined);

export const ExtraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<ExtraRequest[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);
  const [requesters, setRequesters] = useState<RequesterItem[]>(INITIAL_REQUESTERS);
  const [reasons, setReasons] = useState<ReasonItem[]>(INITIAL_REASONS);

  // Load from LocalStorage
  useEffect(() => {
    const savedRequests = localStorage.getItem('vivaz_requests');
    const savedSectors = localStorage.getItem('vivaz_sectors');
    const savedRequesters = localStorage.getItem('vivaz_requesters');
    const savedReasons = localStorage.getItem('vivaz_reasons');
    if (savedRequests) {
      const parsed = JSON.parse(savedRequests);
      const normalized = parsed.map((req: any) => ({
        ...req,
        workDays: req.workDays && req.workDays.length
          ? req.workDays
          : [{ date: req.workDate || new Date().toISOString().split('T')[0], shift: req.shift || 'Manhã' }],
      }));
      setRequests(normalized);
    }
    if (savedSectors) setSectors(JSON.parse(savedSectors));
    if (savedRequesters) setRequesters(JSON.parse(savedRequesters));
    if (savedReasons) setReasons(JSON.parse(savedReasons));
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

  const addRequest = (data: any) => {
    const newRequest: ExtraRequest = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      code: `EXT-${new Date().getFullYear()}-${String(requests.length + 1).padStart(4, '0')}`,
      status: data.urgency ? 'APROVADO' : 'SOLICITADO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: data.urgency ? new Date().toISOString() : undefined,
      approvedBy: data.urgency ? 'SISTEMA (URGÊNCIA)' : undefined,
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

  return (
    <ExtraContext.Provider value={{ 
      requests, sectors, requesters, reasons, addRequest, updateStatus, deleteRequest,
      addSector, updateSector, deleteSector,
      addRequester, updateRequester, deleteRequester,
      addReason, updateReason, deleteReason
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
