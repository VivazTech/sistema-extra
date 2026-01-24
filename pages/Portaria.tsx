
import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Filter, 
  CheckCircle, 
  Calendar,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  Coffee
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { ExtraRequest } from '../types';

const Portaria: React.FC = () => {
  const { requests, sectors, updateTimeRecord } = useExtras();
  const { user } = useAuth();
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtrar solicitações aprovadas do dia
  const todayExtras = useMemo(() => {
    return requests.filter(req => 
      req.status === 'APROVADO' && 
      req.workDays.some(day => day.date === todayStr)
    );
  }, [requests, todayStr]);

  // Aplicar filtro por setor
  const filteredExtras = useMemo(() => {
    if (selectedSector === 'TODOS') return todayExtras;
    return todayExtras.filter(req => req.sector === selectedSector);
  }, [todayExtras, selectedSector]);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const handleTimeChange = (
    requestId: string, 
    workDate: string, 
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure',
    value: string
  ) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    const workDay = request.workDays.find(d => d.date === workDate);
    if (!workDay) return;

    const currentTimeRecord = workDay.timeRecord || {};
    
    const updatedTimeRecord = {
      ...currentTimeRecord,
      [field]: value
    };

    updateTimeRecord(requestId, workDate, updatedTimeRecord, user?.name || 'Portaria');
  };

  const getTimeRecord = (request: ExtraRequest, date: string) => {
    const workDay = request.workDays.find(d => d.date === date);
    return workDay?.timeRecord || {};
  };

  const isComplete = (request: ExtraRequest, date: string) => {
    const timeRecord = getTimeRecord(request, date);
    return !!(timeRecord.arrival && timeRecord.departure);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="text-emerald-600" size={28} />
            Portaria - Registro de Ponto
          </h1>
          <p className="text-gray-500 mt-1">
            Controle de entrada e saída dos funcionários extras do dia
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-emerald-600">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </div>
          <div className="text-xs text-gray-500 uppercase font-bold">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSector('TODOS')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedSector === 'TODOS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({todayExtras.length})
            </button>
            {sectors.map(sector => {
              const count = todayExtras.filter(r => r.sector === sector.name).length;
              if (count === 0) return null;
              return (
                <button
                  key={sector.id}
                  onClick={() => setSelectedSector(sector.name)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedSector === sector.name
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sector.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Extras */}
      <div className="space-y-3">
        {filteredExtras.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400 font-medium">
              Nenhum funcionário extra aprovado para hoje
              {selectedSector !== 'TODOS' && ` no setor ${selectedSector}`}
            </p>
          </div>
        ) : (
          filteredExtras.map(request => {
            const isExpanded = expandedRequest === request.id;
            const timeRecord = getTimeRecord(request, todayStr);
            const completed = isComplete(request, todayStr);

            return (
              <div 
                key={request.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Header - Clicável */}
                <button
                  onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-lg">
                      {request.extraName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 text-lg">{request.extraName}</h3>
                      <p className="text-sm text-gray-500">
                        <span className="font-bold">{request.sector}</span> • {request.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {completed ? (
                      <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                        <CheckCircle size={16} />
                        <span className="text-xs font-bold uppercase">Completo</span>
                      </div>
                    ) : timeRecord.arrival ? (
                      <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">Em andamento</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">Pendente</span>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>

                {/* Detalhes - Expansível */}
                {isExpanded && (
                  <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="space-y-4">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
                        Registro de Horários
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Chegada */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <LogIn size={16} className="text-emerald-600" />
                            Chegada
                          </label>
                          <input
                            type="time"
                            value={timeRecord.arrival || ''}
                            onChange={(e) => handleTimeChange(request.id, todayStr, 'arrival', e.target.value)}
                            onFocus={(e) => {
                              if (!e.target.value) {
                                e.target.value = getCurrentTime();
                                handleTimeChange(request.id, todayStr, 'arrival', getCurrentTime());
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          />
                        </div>

                        {/* Saída para Intervalo */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <Coffee size={16} className="text-amber-600" />
                            Saída p/ Intervalo
                          </label>
                          <input
                            type="time"
                            value={timeRecord.breakStart || ''}
                            onChange={(e) => handleTimeChange(request.id, todayStr, 'breakStart', e.target.value)}
                            onFocus={(e) => {
                              if (!e.target.value) {
                                e.target.value = getCurrentTime();
                                handleTimeChange(request.id, todayStr, 'breakStart', getCurrentTime());
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                          />
                        </div>

                        {/* Volta do Intervalo */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <Coffee size={16} className="text-emerald-600" />
                            Volta do Intervalo
                          </label>
                          <input
                            type="time"
                            value={timeRecord.breakEnd || ''}
                            onChange={(e) => handleTimeChange(request.id, todayStr, 'breakEnd', e.target.value)}
                            onFocus={(e) => {
                              if (!e.target.value) {
                                e.target.value = getCurrentTime();
                                handleTimeChange(request.id, todayStr, 'breakEnd', getCurrentTime());
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          />
                        </div>

                        {/* Saída Final */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <LogOut size={16} className="text-red-600" />
                            Saída Final
                          </label>
                          <input
                            type="time"
                            value={timeRecord.departure || ''}
                            onChange={(e) => handleTimeChange(request.id, todayStr, 'departure', e.target.value)}
                            onFocus={(e) => {
                              if (!e.target.value) {
                                e.target.value = getCurrentTime();
                                handleTimeChange(request.id, todayStr, 'departure', getCurrentTime());
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Informações adicionais */}
                      {timeRecord.registeredBy && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            <span className="font-bold">Registrado por:</span> {timeRecord.registeredBy}
                            {timeRecord.registeredAt && (
                              <> • {new Date(timeRecord.registeredAt).toLocaleString('pt-BR')}</>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Informações da solicitação */}
                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500 font-bold block mb-1">Código</span>
                          <span className="text-gray-900 font-mono">{request.code}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-bold block mb-1">Turno</span>
                          <span className="text-gray-900">
                            {request.workDays.find(d => d.date === todayStr)?.shift || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-bold block mb-1">Líder</span>
                          <span className="text-gray-900">{request.leaderName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-bold block mb-1">Contato</span>
                          <span className="text-gray-900">{request.contact || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Portaria;
