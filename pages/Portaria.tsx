
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Clock, 
  Filter, 
  CheckCircle, 
  Calendar,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  Coffee,
  Camera,
  X,
  Check,
  Search,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { ExtraRequest } from '../types';
import { supabase } from '../services/supabase';

const Portaria: React.FC = () => {
  const { requests, sectors, updateTimeRecord, appendRequestObservation } = useExtras();
  const { user } = useAuth();
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'recent'>('alphabetical');

  const todayStr = new Date().toISOString().split('T')[0];

  // Atualizar horário atual a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtrar solicitações aprovadas por período
  const periodExtras = useMemo(() => {
    const startDate = dateStart || todayStr;
    const endDate = dateEnd || todayStr;
    
    return requests.filter(req => {
      if (req.status !== 'APROVADO') return false;
      
      // Verificar se algum dia de trabalho está no período
      return req.workDays.some(day => {
        const dayDate = day.date;
        return dayDate >= startDate && dayDate <= endDate;
      });
    });
  }, [requests, dateStart, dateEnd, todayStr]);

  // Aplicar todos os filtros (setor, pesquisa, período) e ordenação
  const filteredExtras = useMemo(() => {
    let filtered = periodExtras;

    // Filtro por setor
    if (selectedSector !== 'TODOS') {
      filtered = filtered.filter(req => req.sector === selectedSector);
    }

    // Filtro por pesquisa (nome do extra)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        req.extraName.toLowerCase().includes(searchLower) ||
        req.sector.toLowerCase().includes(searchLower) ||
        req.role.toLowerCase().includes(searchLower)
      );
    }

    // Ordenação
    const sorted = [...filtered];
    if (sortOrder === 'alphabetical') {
      sorted.sort((a, b) => a.extraName.localeCompare(b.extraName));
    } else {
      // Mais recentes primeiro (por data de criação)
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    }

    return sorted;
  }, [periodExtras, selectedSector, searchTerm, sortOrder]);

  // Função para calcular horas trabalhadas
  const calculateWorkHours = (timeRecord: { arrival?: string; departure?: string; breakStart?: string; breakEnd?: string }) => {
    if (!timeRecord.arrival || !timeRecord.departure) return null;
    
    const arrival = new Date(`2000-01-01T${timeRecord.arrival}:00`);
    const departure = new Date(`2000-01-01T${timeRecord.departure}:00`);
    
    let totalMinutes = (departure.getTime() - arrival.getTime()) / (1000 * 60);
    
    if (timeRecord.breakStart && timeRecord.breakEnd) {
      const breakStart = new Date(`2000-01-01T${timeRecord.breakStart}:00`);
      const breakEnd = new Date(`2000-01-01T${timeRecord.breakEnd}:00`);
      const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }
    
    return (totalMinutes / 60).toFixed(2);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const buildNotInformedNote = (fieldLabel: string, workDate: string) => {
    const formattedDate = new Date(`${workDate}T00:00:00`).toLocaleDateString('pt-BR');
    return `PORTARIA - Horário não informado: ${fieldLabel} (${formattedDate})`;
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

  const handleRegisterTime = (
    requestId: string,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure'
  ) => {
    const currentTimeValue = getCurrentTime();
    handleTimeChange(requestId, workDate, field, currentTimeValue);
  };

  const handleNotInformed = async (
    requestId: string,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure',
    fieldLabel: string
  ) => {
    handleTimeChange(requestId, workDate, field, '');
    await appendRequestObservation(requestId, buildNotInformedNote(fieldLabel, workDate));
  };

  const getTimeRecord = (request: ExtraRequest, date: string) => {
    const workDay = request.workDays.find(d => d.date === date);
    return workDay?.timeRecord || {};
  };

  const isComplete = (request: ExtraRequest, date: string) => {
    const timeRecord = getTimeRecord(request, date);
    return !!(timeRecord.arrival && timeRecord.departure && timeRecord.photoUrl);
  };

  const hasAllTimes = (request: ExtraRequest, date: string) => {
    const timeRecord = getTimeRecord(request, date);
    return !!(timeRecord.arrival && timeRecord.breakStart && timeRecord.breakEnd && timeRecord.departure);
  };

  const [capturingPhoto, setCapturingPhoto] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (requestId: string, workDate: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      setCapturingPhoto(`${requestId}-${workDate}`);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Erro ao acessar a câmera. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturingPhoto(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoPreview(photoDataUrl);
    stopCamera();
  };

  const uploadPhoto = async (requestId: string, workDate: string) => {
    if (!photoPreview) return;

    try {
      // Converter base64 para blob
      const response = await fetch(photoPreview);
      const blob = await response.blob();

      // Criar nome único para o arquivo
      const fileName = `time-record-${requestId}-${workDate}-${Date.now()}.jpg`;
      const filePath = `time-records/${fileName}`;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('time-records')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro ao fazer upload da foto:', uploadError);
        // Se o bucket não existir, criar e tentar novamente
        if (uploadError.message.includes('Bucket not found')) {
          alert('Bucket de storage não configurado. A foto será salva apenas localmente.');
          // Salvar como base64 no banco (temporário)
          const timeRecord = getTimeRecord(
            requests.find(r => r.id === requestId)!, 
            workDate
          );
          const updatedTimeRecord = {
            ...timeRecord,
            photoUrl: photoPreview, // Base64 temporário
          };
          await updateTimeRecord(requestId, workDate, updatedTimeRecord, user?.name || 'Portaria');
          setPhotoPreview(null);
          return;
        }
        throw uploadError;
      }

      // Obter URL pública da foto
      const { data: urlData } = supabase.storage
        .from('time-records')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // Atualizar time_record com a URL da foto
      const timeRecord = getTimeRecord(
        requests.find(r => r.id === requestId)!, 
        workDate
      );
      const updatedTimeRecord = {
        ...timeRecord,
        photoUrl,
      };

      await updateTimeRecord(requestId, workDate, updatedTimeRecord, user?.name || 'Portaria');
      
      setPhotoPreview(null);
      setCapturedPhoto(`${requestId}-${workDate}`);
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
      alert('Erro ao salvar foto. Tente novamente.');
    }
  };

  const cancelPhoto = () => {
    stopCamera();
    setPhotoPreview(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-gray-900 space-y-6 p-6">
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        {/* Primeira linha: Pesquisa e Ordenação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome, setor ou função..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Ordenar:</span>
            <button
              onClick={() => setSortOrder('alphabetical')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                sortOrder === 'alphabetical'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ArrowUpAZ size={16} />
              Alfabética
            </button>
            <button
              onClick={() => setSortOrder('recent')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                sortOrder === 'recent'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ArrowDownAZ size={16} />
              Mais Recentes
            </button>
          </div>
        </div>

        {/* Segunda linha: Período */}
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Período:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              placeholder="Data início"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              placeholder="Data fim"
            />
            {(dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setDateStart('');
                  setDateEnd('');
                }}
                className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Terceira linha: Filtro por Setor */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <Filter size={20} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Setor:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSector('TODOS')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedSector === 'TODOS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({periodExtras.length})
            </button>
            {sectors.map(sector => {
              const count = periodExtras.filter(r => r.sector === sector.name).length;
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
              {searchTerm || dateStart || dateEnd || selectedSector !== 'TODOS'
                ? 'Nenhum resultado encontrado com os filtros aplicados'
                : 'Nenhum funcionário extra aprovado para hoje'}
              {selectedSector !== 'TODOS' && ` no setor ${selectedSector}`}
            </p>
          </div>
        ) : (
          filteredExtras.map(request => {
            const isExpanded = expandedRequest === request.id;
            // Determinar qual data usar: se há filtro de período, usar o primeiro workDay no período, senão usar todayStr
            const workDayDate = (dateStart || dateEnd) 
              ? request.workDays.find(day => {
                  const startDate = dateStart || todayStr;
                  const endDate = dateEnd || todayStr;
                  return day.date >= startDate && day.date <= endDate;
                })?.date || todayStr
              : todayStr;
            const timeRecord = getTimeRecord(request, workDayDate);
            const completed = isComplete(request, workDayDate);
            const allTimesFilled = hasAllTimes(request, workDayDate);
            const photoKey = `${request.id}-${workDayDate}`;
            const isCapturing = capturingPhoto === photoKey;
            const hasPhoto = timeRecord.photoUrl || capturedPhoto === photoKey;
            const workHours = calculateWorkHours(timeRecord);

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
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-lg">
                      {request.extraName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{request.extraName}</h3>
                      <p className="text-sm text-gray-500">
                        <span className="font-bold">{request.sector}</span> • {request.role}
                      </p>
                      {/* Horários em tempo real */}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {timeRecord.arrival ? (
                          <div className="flex items-center gap-1">
                            <LogIn size={12} className="text-emerald-600" />
                            <span className="text-gray-700">{timeRecord.arrival}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <LogIn size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {timeRecord.breakStart ? (
                          <div className="flex items-center gap-1">
                            <Coffee size={12} className="text-amber-600" />
                            <span className="text-gray-700">{timeRecord.breakStart}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Coffee size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {timeRecord.breakEnd ? (
                          <div className="flex items-center gap-1">
                            <Coffee size={12} className="text-emerald-600" />
                            <span className="text-gray-700">{timeRecord.breakEnd}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Coffee size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {timeRecord.departure ? (
                          <div className="flex items-center gap-1">
                            <LogOut size={12} className="text-red-600" />
                            <span className="text-gray-700">{timeRecord.departure}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <LogOut size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {workHours && (
                          <div className="ml-2 px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">
                            {workHours}h
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Valor Combinado */}
                    <div className="text-right text-emerald-600">
                      <div className="text-xs font-bold uppercase mb-1">Valor</div>
                      <div className="text-lg font-black">
                        R$ {request.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
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
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'arrival', value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'arrival', value);
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border bg-white border-gray-200 text-gray-900 font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          />
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRegisterTime(request.id, workDayDate, 'arrival')}
                              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold uppercase hover:bg-emerald-700 transition-colors"
                            >
                              Registrar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNotInformed(request.id, workDayDate, 'arrival', 'Chegada')}
                              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold uppercase hover:bg-gray-200 transition-colors"
                            >
                              Não informado
                            </button>
                          </div>
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
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'breakStart', value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'breakStart', value);
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border bg-white border-gray-200 text-gray-900 font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                          />
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRegisterTime(request.id, workDayDate, 'breakStart')}
                              className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold uppercase hover:bg-amber-700 transition-colors"
                            >
                              Registrar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNotInformed(request.id, workDayDate, 'breakStart', 'Saída p/ Intervalo')}
                              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold uppercase hover:bg-gray-200 transition-colors"
                            >
                              Não informado
                            </button>
                          </div>
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
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'breakEnd', value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'breakEnd', value);
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border bg-white border-gray-200 text-gray-900 font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          />
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRegisterTime(request.id, workDayDate, 'breakEnd')}
                              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold uppercase hover:bg-emerald-700 transition-colors"
                            >
                              Registrar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNotInformed(request.id, workDayDate, 'breakEnd', 'Volta do Intervalo')}
                              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold uppercase hover:bg-gray-200 transition-colors"
                            >
                              Não informado
                            </button>
                          </div>
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
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'departure', value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleTimeChange(request.id, workDayDate, 'departure', value);
                              }
                            }}
                            className="w-full px-4 py-3 rounded-lg border bg-white border-gray-200 text-gray-900 font-bold text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                          />
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRegisterTime(request.id, workDayDate, 'departure')}
                              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700 transition-colors"
                            >
                              Registrar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNotInformed(request.id, workDayDate, 'departure', 'Saída Final')}
                              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold uppercase hover:bg-gray-200 transition-colors"
                            >
                              Não informado
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Captura de Foto - Aparece quando os 4 campos estão preenchidos */}
                      {allTimesFilled && !hasPhoto && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Camera className="text-emerald-600" size={24} />
                              <div>
                                <h3 className="font-bold text-emerald-900">Assinatura com Foto</h3>
                                <p className="text-sm text-emerald-700">
                                  Tire uma foto do funcionário como comprovação de presença
                                </p>
                              </div>
                            </div>

                            {!isCapturing && !photoPreview && (
                              <button
                                onClick={() => startCamera(request.id, workDayDate)}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                              >
                                <Camera size={20} />
                                Tirar Foto
                              </button>
                            )}

                            {/* Preview da Câmera */}
                            {isCapturing && (
                              <div className="space-y-4">
                                <div className="relative bg-black rounded-xl overflow-hidden">
                                  <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-auto max-h-96"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={capturePhoto}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                  >
                                    <Camera size={20} />
                                    Capturar
                                  </button>
                                  <button
                                    onClick={stopCamera}
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                                <canvas ref={canvasRef} className="hidden" />
                              </div>
                            )}

                            {/* Preview da Foto Capturada */}
                            {photoPreview && (
                              <div className="space-y-4">
                                <div className="relative bg-gray-900 rounded-xl overflow-hidden">
                                  <img
                                    src={photoPreview}
                                    alt="Preview"
                                    className="w-full h-auto max-h-96 object-contain"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => uploadPhoto(request.id, workDayDate)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                  >
                                    <Check size={20} />
                                    Confirmar Foto
                                  </button>
                                  <button
                                    onClick={cancelPhoto}
                                    className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl flex items-center gap-2"
                                  >
                                    <X size={20} />
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Foto Confirmada */}
                      {hasPhoto && timeRecord.photoUrl && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <CheckCircle className="text-emerald-600" size={20} />
                              <span className="font-bold text-emerald-900">Foto Confirmada</span>
                            </div>
                            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                              <img
                                src={timeRecord.photoUrl}
                                alt="Foto do extra"
                                className="w-full h-auto max-h-64 object-contain"
                                onError={(e) => {
                                  // Se a URL falhar, pode ser base64
                                  const target = e.target as HTMLImageElement;
                                  if (timeRecord.photoUrl?.startsWith('data:')) {
                                    target.src = timeRecord.photoUrl;
                                  }
                                }}
                              />
                            </div>
                            <p className="text-xs text-emerald-700 mt-2">
                              Foto registrada como comprovação de presença
                            </p>
                          </div>
                        </div>
                      )}

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
    </div>
  );
};

export default Portaria;
