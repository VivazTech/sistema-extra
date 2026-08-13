
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft,
  LayoutDashboard,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Coffee
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { calculateExtraSaldo } from '../services/extraSaldoService';
import { formatDateBR } from '../utils/date';
import { useNavigate } from 'react-router-dom';
import { LoadingLottie } from '../components/LoadingLottie';

const TVDashboard: React.FC = () => {
  const { requests, extraSaldoRecords, dataLoading } = useExtras();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSector, setSelectedSector] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar preferência de tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('tv-dashboard-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Salvar preferência de tema
  useEffect(() => {
    localStorage.setItem('tv-dashboard-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequestsRaw = useMemo(() =>
    requests.filter(r =>
      r.workDays.some(d => d.date === todayStr) && r.status !== 'REPROVADO' && r.status !== 'CANCELADO'
    ),
    [requests, todayStr]
  );
  // Apenas setores cadastrados ao usuário: se tiver sectors, filtra; senão (ex.: ADMIN) mostra todos
  const todayRequests = useMemo(() => {
    const userSectors = user?.sectors;
    if (!userSectors?.length) return todayRequestsRaw;
    return todayRequestsRaw.filter(r => userSectors.includes(r.sector));
  }, [todayRequestsRaw, user?.sectors]);

  const getShiftForDate = (workDays: { date: string; shift: string }[], date: string) => {
    return workDays.find(d => d.date === date)?.shift || workDays[0]?.shift || '';
  };

  // Função para obter timeRecord de um request
  const getTimeRecord = (request: any, date: string) => {
    const workDay = request.workDays.find((d: any) => d.date === date);
    return workDay?.timeRecord || {};
  };

  // Group by Sector
  const sectors = Array.from(new Set(todayRequests.map(r => r.sector))).sort();

  // Filtrar requests por setor selecionado
  const filteredRequests = useMemo(() => {
    if (!selectedSector) return todayRequests;
    return todayRequests.filter(r => r.sector === selectedSector);
  }, [todayRequests, selectedSector]);

  const initializedSector = useRef(false);
  useEffect(() => {
    if (!initializedSector.current && sectors.length > 0) {
      setSelectedSector(sectors[0]);
      initializedSector.current = true;
    }
  }, [sectors]);

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

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getSaldoForSectorWeek = (sector: string) => {
    if (!sector) return { type: 'none' as const };
    if (sector.trim().toUpperCase() === 'AQUAMANIA') return { type: 'unlimited' as const };
    const { start, end } = getWeekRange(todayStr);
    const weekStartStr = toLocalDateStr(start);
    const weekEndStr = toLocalDateStr(end);
    const sectorNorm = sector.trim().toUpperCase();
    const record = extraSaldoRecords.find(r =>
      (r.setor || '').trim().toUpperCase() === sectorNorm &&
      r.periodoInicio <= weekStartStr &&
      r.periodoFim >= weekEndStr
    );
    if (!record) return { type: 'no-record' as const };
    const result = calculateExtraSaldo(record, record.valorDiariaSnapshot);
    const usedDiarias = requests
      .filter(r => r.sector === sector && r.status === 'APROVADO' && r.reason !== 'EVENTO')
      .reduce((acc, r) => acc + countWorkDaysInWeek(r.workDays, start, end), 0);
    const saldo = result.saldo - usedDiarias;
    const saldoEmReais = Number(Math.abs(saldo * record.valorDiariaSnapshot).toFixed(2));
    return { type: 'ok' as const, saldo, saldoEmReais };
  };

  const currentShift = getCurrentShift();
  const saldoInfo = getSaldoForSectorWeek(selectedSector);
  const workingNow = filteredRequests.filter(r =>
    r.status === 'APROVADO' && getShiftForDate(r.workDays, todayStr) === currentShift
  );

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
        <LoadingLottie size={96} />
        <p className="mt-4 text-sm font-medium text-gray-300">Carregando dados do painel...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-gray-50'} ${isDarkMode ? 'text-white' : 'text-gray-900'} p-4 md:p-8 flex flex-col font-sans overflow-y-auto md:overflow-hidden transition-colors duration-300`}>
      {/* Cabeçalho mobile */}
      <header className={`md:hidden sticky top-0 z-50 -mx-4 -mt-4 mb-6 px-4 py-3 flex items-center gap-3 border-b ${isDarkMode ? 'bg-[#050505] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`p-2.5 rounded-full transition-colors no-print shrink-0 ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-200 hover:bg-gray-300'}`}
          title="Voltar"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-black tracking-tight uppercase truncate">Painel 24h</h1>
          <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Vivaz Cataratas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2.5 rounded-xl transition-all shrink-0 ${
            isDarkMode
              ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Header desktop */}
      <header className={`hidden md:flex justify-between items-center mb-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} pb-4`}>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')} 
            className={`p-3 ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-200 hover:bg-gray-300'} rounded-full transition-colors no-print`}
          >
            <ChevronLeft size={32} />
          </button>
          <div>
            <h1 className={`text-xl font-black tracking-tighter uppercase leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Painel de Extras 24h</h1>
          </div>
        </div>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-3 rounded-xl transition-all ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <div className="flex items-baseline gap-3 mb-6">
        <p className={`text-lg font-mono font-bold tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className={`text-sm font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {formatDateBR(currentTime)}
        </p>
      </div>

      {/* Sector selector + balance */}
      <div className={`${isDarkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl p-6 mb-8`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0 w-full lg:max-w-md">
            <label htmlFor="tv-setor" className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Filtrar por Setor</label>
            <select
              id="tv-setor"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-sm font-bold border ${
                isDarkMode
                  ? 'bg-gray-800 text-white border-gray-700'
                  : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}
            >
              <option value="">Todos ({todayRequests.length})</option>
              {sectors.map(sector => {
                const count = todayRequests.filter(r => r.sector === sector).length;
                return (
                  <option key={sector} value={sector}>
                    {sector} ({count})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-xs font-bold uppercase text-gray-400">Saldo semanal</p>
            <p className={`text-3xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {saldoInfo.type === 'none' && 'Selecione um setor'}
              {saldoInfo.type === 'unlimited' && 'Sem limite'}
              {saldoInfo.type === 'no-record' && 'Sem registro'}
              {saldoInfo.type === 'ok' && `${saldoInfo.saldo} diárias`}
            </p>
            {saldoInfo.type === 'ok' && (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Saldo R$: {saldoInfo.saldoEmReais.toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Working now */}
      <div className={`${isDarkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl p-8 mb-8`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-black ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'} uppercase tracking-tighter`}>
            Extras em serviço agora • {currentShift}
          </h2>
          <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Hoje</span>
        </div>
        {workingNow.length === 0 ? (
          <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-sm uppercase tracking-widest`}>Nenhum extra no turno atual</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workingNow.map(req => {
              const timeRecord = getTimeRecord(req, todayStr);
              return (
                <div key={req.id} className={`border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} rounded-2xl p-4 overflow-hidden min-w-0`}>
                  <p className={`text-xl font-bold break-words ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{req.extraName}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'} font-bold uppercase`}>{req.role}</p>
                  {/* Horários em tempo real */}
                  {timeRecord.arrival || timeRecord.departure ? (
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      {timeRecord.arrival && (
                        <div className="flex items-center gap-1">
                          <LogIn size={12} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.arrival}</span>
                        </div>
                      )}
                      {timeRecord.breakStart && (
                        <div className="flex items-center gap-1">
                          <Coffee size={12} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.breakStart}</span>
                        </div>
                      )}
                      {timeRecord.breakEnd && (
                        <div className="flex items-center gap-1">
                          <Coffee size={12} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.breakEnd}</span>
                        </div>
                      )}
                      {timeRecord.departure && (
                        <div className="flex items-center gap-1">
                          <LogOut size={12} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.departure}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} uppercase`}>Líder: {req.leaderName}</p>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      R$ {(req.value * (req.workDays?.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid of Sectors */}
      <div className="flex-1 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-6">
            <LayoutDashboard size={120} />
            <p className="text-4xl font-bold uppercase tracking-widest">
              {selectedSector ? `Nenhuma solicitação para ${selectedSector} hoje` : 'Nenhuma solicitação para hoje'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {(selectedSector ? [selectedSector] : sectors).map(sectorName => {
              const sectorReqs = filteredRequests.filter(r => r.sector === sectorName);
              if (sectorReqs.length === 0) return null;
              return (
                <div key={sectorName} className={`${isDarkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl p-8 backdrop-blur-md`}>
                  <h2 className={`text-3xl font-black ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'} mb-6 uppercase tracking-tighter border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} pb-4`}>{sectorName}</h2>
                  <div className="space-y-3">
                    {sectorReqs.map(req => {
                      const timeRecord = getTimeRecord(req, todayStr);
                      return (
                        <div key={req.id} className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4 px-4 rounded-xl overflow-hidden min-w-0 ${isDarkMode ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-100'} border`}>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0 w-full">
                            <p className={`text-xl font-bold leading-tight min-w-0 max-w-full break-words ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{req.extraName}</p>
                            <span className={`text-sm font-bold shrink-0 ${isDarkMode ? 'text-emerald-400/90' : 'text-emerald-600'}`}>{req.role}</span>
                            <span className={`flex items-center gap-1.5 shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Clock size={16} /> {getShiftForDate(req.workDays, todayStr)}
                            </span>
                            {(timeRecord.arrival || timeRecord.departure) && (
                              <span className="flex items-center gap-3 shrink-0 text-sm">
                                {timeRecord.arrival && (
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <LogIn size={14} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                    {timeRecord.arrival}
                                  </span>
                                )}
                                {timeRecord.breakStart && (
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <Coffee size={14} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                                    {timeRecord.breakStart}
                                  </span>
                                )}
                                {timeRecord.breakEnd && (
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <Coffee size={14} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                    {timeRecord.breakEnd}
                                  </span>
                                )}
                                {timeRecord.departure && (
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <LogOut size={14} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                                    {timeRecord.departure}
                                  </span>
                                )}
                              </span>
                            )}
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} w-full lg:w-auto`}>
                              Líder: {req.leaderName}
                            </p>
                          </div>
                          <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
                            <span className={`
                              px-3 py-1.5 rounded-lg text-sm font-black uppercase
                              ${req.status === 'APROVADO' ? 'bg-emerald-500 text-emerald-950' : 'bg-amber-500 text-amber-950'}
                            `}>
                              {req.status}
                            </span>
                            <p className={`text-lg font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              R$ {(req.value * (req.workDays?.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className={`mt-8 pt-8 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} flex flex-col gap-2 items-start md:flex-row md:justify-between md:items-center ${isDarkMode ? 'text-gray-600' : 'text-gray-500'} font-bold uppercase text-xs tracking-[0.2em]`}>
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
          <p className="whitespace-nowrap">Sistema de Gestão Vivaz v1.0</p>
          <span className="hidden md:inline">•</span>
          <p className="whitespace-nowrap">Atualização Automática Ativada</p>
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Conectado</span>
          </div>
          <p className="whitespace-nowrap">Total de Extras Hoje: {todayRequests.length}</p>
        </div>
      </footer>
    </div>
  );
};

export default TVDashboard;
