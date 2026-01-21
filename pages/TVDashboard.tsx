
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ChevronLeft,
  LayoutDashboard
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { calculateExtraSaldo } from '../services/extraSaldoService';
import { useNavigate } from 'react-router-dom';

const TVDashboard: React.FC = () => {
  const { requests, extraSaldoRecords } = useExtras();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSector, setSelectedSector] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequests = requests.filter(r => 
    r.workDays.some(d => d.date === todayStr) && r.status !== 'REPROVADO' && r.status !== 'CANCELADO'
  );

  const getShiftForDate = (workDays: { date: string; shift: string }[], date: string) => {
    return workDays.find(d => d.date === date)?.shift || workDays[0]?.shift || '';
  };

  // Group by Sector
  const sectors = Array.from(new Set(todayRequests.map(r => r.sector))).sort();

  useEffect(() => {
    if (!selectedSector && sectors.length > 0) {
      setSelectedSector(sectors[0]);
    }
  }, [sectors, selectedSector]);

  const getCurrentShift = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    if (hour >= 18 && hour < 24) return 'Noite';
    return 'Madrugada';
  };

  const getWeekRange = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = (date.getDay() + 6) % 7;
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

  const getSaldoForSectorWeek = (sector: string) => {
    if (!sector) return null;
    const { start, end } = getWeekRange(todayStr);
    const weekStartStr = start.toISOString().split('T')[0];
    const weekEndStr = end.toISOString().split('T')[0];
    const record = extraSaldoRecords.find(r =>
      r.setor === sector &&
      r.periodoInicio <= weekStartStr &&
      r.periodoFim >= weekEndStr
    );
    if (!record) return null;
    const result = calculateExtraSaldo(record, record.valorDiariaSnapshot);
    const usedDiarias = requests
      .filter(r => r.sector === sector && r.status === 'APROVADO')
      .reduce((acc, r) => acc + countWorkDaysInWeek(r.workDays, start, end), 0);
    const saldo = result.saldo - usedDiarias;
    const saldoEmReais = Number((saldo * record.valorDiariaSnapshot * -1).toFixed(2));
    return { saldo, saldoEmReais };
  };

  const currentShift = getCurrentShift();
  const saldoInfo = getSaldoForSectorWeek(selectedSector);
  const sectorTodayRequests = todayRequests.filter(r => r.sector === selectedSector);
  const workingNow = sectorTodayRequests.filter(r =>
    r.status === 'APROVADO' && getShiftForDate(r.workDays, todayStr) === currentShift
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors no-print"
          >
            <ChevronLeft size={32} />
          </button>
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-lg shadow-emerald-900/40">V</div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Painel de Extras 24h</h1>
            <p className="text-emerald-400 text-xl font-bold tracking-widest uppercase">Vivaz Cataratas Resort</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-black tabular-nums">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          <p className="text-xl text-gray-400 font-bold uppercase mt-1">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Sector selector + balance */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase text-gray-400">Setor selecionado</span>
            <select
              className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-lg font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
            >
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-gray-400">Saldo semanal</p>
            <p className="text-3xl font-black text-emerald-400">
              {saldoInfo ? `${saldoInfo.saldo} diárias` : 'Indisponível'}
            </p>
            {saldoInfo && (
              <p className="text-xs text-gray-400">Saldo R$: {saldoInfo.saldoEmReais.toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Working now */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-emerald-500 uppercase tracking-tighter">
            Extras em serviço agora • {currentShift}
          </h2>
          <span className="text-xs font-bold uppercase text-gray-400">Hoje</span>
        </div>
        {workingNow.length === 0 ? (
          <p className="text-gray-500 text-sm uppercase tracking-widest">Nenhum extra no turno atual</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workingNow.map(req => (
              <div key={req.id} className="border border-gray-800 rounded-2xl p-4">
                <p className="text-xl font-bold text-white">{req.extraName}</p>
                <p className="text-sm text-emerald-400/70 font-bold uppercase">{req.role}</p>
                <p className="text-xs text-gray-500 mt-2 uppercase">Líder: {req.leaderName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Sectors */}
      <div className="flex-1 overflow-y-auto">
        {todayRequests.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-6">
            <LayoutDashboard size={120} />
            <p className="text-4xl font-bold uppercase tracking-widest">Nenhuma solicitação para hoje</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map(sectorName => {
              const sectorReqs = todayRequests.filter(r => r.sector === sectorName);
              return (
                <div key={sectorName} className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 backdrop-blur-md">
                  <h2 className="text-3xl font-black text-emerald-500 mb-6 uppercase tracking-tighter border-b border-gray-800 pb-4">{sectorName}</h2>
                  <div className="space-y-6">
                    {sectorReqs.map(req => (
                      <div key={req.id} className="flex flex-col gap-1 border-b border-gray-800/50 pb-4 last:border-0">
                        <div className="flex justify-between items-start">
                          <p className="text-2xl font-bold leading-tight">{req.extraName}</p>
                          <span className={`
                            px-3 py-1 rounded-lg text-sm font-black uppercase
                            ${req.status === 'APROVADO' ? 'bg-emerald-500 text-emerald-950' : 'bg-amber-500 text-amber-950'}
                          `}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                           <p className="text-emerald-400/70 text-lg font-bold uppercase">{req.role}</p>
                           <p className="text-gray-400 text-lg flex items-center gap-2">
                             <Clock size={18} /> {getShiftForDate(req.workDays, todayStr)}
                           </p>
                        </div>
                        <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-tighter">Líder: {req.leaderName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-8 pt-8 border-t border-gray-800 flex justify-between items-center text-gray-600 font-bold uppercase text-xs tracking-[0.2em]">
        <p>Sistema de Gestão Vivaz v1.0 • Atualização Automática Ativada</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Conectado</span>
          </div>
          <p>Total de Extras Hoje: {todayRequests.length}</p>
        </div>
      </footer>
    </div>
  );
};

export default TVDashboard;
