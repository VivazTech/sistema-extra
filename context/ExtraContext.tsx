
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExtraRequest, Sector, RequestStatus } from '../types';
import { INITIAL_SECTORS } from '../constants';

interface ExtraContextType {
  requests: ExtraRequest[];
  sectors: Sector[];
  addRequest: (request: Omit<ExtraRequest, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateStatus: (id: string, status: RequestStatus, reason?: string, approvedBy?: string) => void;
  deleteRequest: (id: string) => void;
  addSector: (sector: Sector) => void;
  updateSector: (id: string, sector: Sector) => void;
  deleteSector: (id: string) => void;
}

const ExtraContext = createContext<ExtraContextType | undefined>(undefined);

export const ExtraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<ExtraRequest[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);

  // Load from LocalStorage
  useEffect(() => {
    const savedRequests = localStorage.getItem('vivaz_requests');
    const savedSectors = localStorage.getItem('vivaz_sectors');
    if (savedRequests) setRequests(JSON.parse(savedRequests));
    if (savedSectors) setSectors(JSON.parse(savedSectors));
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('vivaz_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('vivaz_sectors', JSON.stringify(sectors));
  }, [sectors]);

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

  return (
    <ExtraContext.Provider value={{ 
      requests, sectors, addRequest, updateStatus, deleteRequest,
      addSector, updateSector, deleteSector
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
