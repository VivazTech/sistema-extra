
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
  Moon,
  Sun
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { ExtraRequest } from '../types';
import { supabase } from '../services/supabase';

const Portaria: React.FC = () => {
  const { requests, sectors, updateTimeRecord } = useExtras();
  const { user } = useAuth();
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const todayStr = new Date().toISOString().split('T')[0];

  // Atualizar horário atual a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar preferência de tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('portaria-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Salvar preferência de tema
  useEffect(() => {
    localStorage.setItem('portaria-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-gray-50'} transition-colors duration-300`}>
      <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'} space-y-6 p-6`}>
        <header className="flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <Clock className="text-emerald-600" size={28} />
              Portaria - Registro de Ponto
            </h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              Controle de entrada e saída dos funcionários extras do dia
            </p>
          </div>
          <div className="flex items-center gap-4">
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
            <div className="text-right">
              <div className={`text-3xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase font-bold`}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
              </div>
            </div>
          </div>
        </header>

      {/* Filtros */}
      <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl p-4 shadow-sm border`}>
        <div className="flex items-center gap-4">
          <Filter size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSector('TODOS')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedSector === 'TODOS'
                  ? 'bg-emerald-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl p-12 text-center border`}>
            <Calendar size={48} className={`mx-auto ${isDarkMode ? 'text-gray-700' : 'text-gray-300'} mb-4`} />
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-400'} style={{fontWeight: 500}}>
              Nenhum funcionário extra aprovado para hoje
              {selectedSector !== 'TODOS' && ` no setor ${selectedSector}`}
            </p>
          </div>
        ) : (
          filteredExtras.map(request => {
            const isExpanded = expandedRequest === request.id;
            const timeRecord = getTimeRecord(request, todayStr);
            const completed = isComplete(request, todayStr);
            const allTimesFilled = hasAllTimes(request, todayStr);
            const photoKey = `${request.id}-${todayStr}`;
            const isCapturing = capturingPhoto === photoKey;
            const hasPhoto = timeRecord.photoUrl || capturedPhoto === photoKey;
            const workHours = calculateWorkHours(timeRecord);

            return (
              <div 
                key={request.id} 
                className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}
              >
                {/* Header - Clicável */}
                <button
                  onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                  className={`w-full p-5 flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-100'} flex items-center justify-center font-black ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'} text-lg`}>
                      {request.extraName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-lg`}>{request.extraName}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="font-bold">{request.sector}</span> • {request.role}
                      </p>
                      {/* Horários em tempo real */}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {timeRecord.arrival ? (
                          <div className="flex items-center gap-1">
                            <LogIn size={12} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.arrival}</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                            <LogIn size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {timeRecord.breakStart ? (
                          <div className="flex items-center gap-1">
                            <Coffee size={12} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.breakStart}</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                            <Coffee size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {timeRecord.breakEnd ? (
                          <div className="flex items-center gap-1">
                            <Coffee size={12} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.breakEnd}</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                            <Coffee size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {timeRecord.departure ? (
                          <div className="flex items-center gap-1">
                            <LogOut size={12} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{timeRecord.departure}</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                            <LogOut size={12} />
                            <span>--:--</span>
                          </div>
                        )}
                        {workHours && (
                          <div className={`ml-2 px-2 py-1 rounded ${isDarkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700'} text-xs font-bold`}>
                            {workHours}h
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Valor Combinado */}
                    <div className={`text-right ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <div className="text-xs font-bold uppercase mb-1">Valor</div>
                      <div className="text-lg font-black">
                        R$ {request.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {completed ? (
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700'} px-3 py-1 rounded-full`}>
                        <CheckCircle size={16} />
                        <span className="text-xs font-bold uppercase">Completo</span>
                      </div>
                    ) : timeRecord.arrival ? (
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-700'} px-3 py-1 rounded-full`}>
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">Em andamento</span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} px-3 py-1 rounded-full`}>
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">Pendente</span>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} size={20} />
                    ) : (
                      <ChevronDown className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} size={20} />
                    )}
                  </div>
                </button>

                {/* Detalhes - Expansível */}
                {isExpanded && (
                  <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="space-y-4">
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold uppercase tracking-wider mb-4`}>
                        Registro de Horários
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Chegada */}
                        <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border`}>
                          <label className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
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
                            className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none`}
                          />
                        </div>

                        {/* Saída para Intervalo */}
                        <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border`}>
                          <label className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
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
                            className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none`}
                          />
                        </div>

                        {/* Volta do Intervalo */}
                        <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border`}>
                          <label className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
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
                            className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none`}
                          />
                        </div>

                        {/* Saída Final */}
                        <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border`}>
                          <label className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
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
                            className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} font-bold text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none`}
                          />
                        </div>
                      </div>

                      {/* Captura de Foto - Aparece quando os 4 campos estão preenchidos */}
                      {allTimesFilled && !hasPhoto && (
                        <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className={`${isDarkMode ? 'bg-emerald-900 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} border-2 rounded-xl p-6`}>
                            <div className="flex items-center gap-3 mb-4">
                              <Camera className="text-emerald-600" size={24} />
                              <div>
                                <h3 className={`font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>Assinatura com Foto</h3>
                                <p className={`text-sm ${isDarkMode ? 'text-emerald-200' : 'text-emerald-700'}`}>
                                  Tire uma foto do funcionário como comprovação de presença
                                </p>
                              </div>
                            </div>

                            {!isCapturing && !photoPreview && (
                              <button
                                onClick={() => startCamera(request.id, todayStr)}
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
                                    className={`px-6 py-3 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-bold rounded-xl`}
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
                                    onClick={() => uploadPhoto(request.id, todayStr)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                  >
                                    <Check size={20} />
                                    Confirmar Foto
                                  </button>
                                  <button
                                    onClick={cancelPhoto}
                                    className={`px-6 py-3 ${isDarkMode ? 'bg-red-900 hover:bg-red-800 text-red-200' : 'bg-red-100 hover:bg-red-200 text-red-700'} font-bold rounded-xl flex items-center gap-2`}
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
                        <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className={`${isDarkMode ? 'bg-emerald-900 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} border-2 rounded-xl p-4`}>
                            <div className="flex items-center gap-3 mb-3">
                              <CheckCircle className="text-emerald-600" size={20} />
                              <span className={`font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>Foto Confirmada</span>
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
                            <p className={`text-xs ${isDarkMode ? 'text-emerald-200' : 'text-emerald-700'} mt-2`}>
                              Foto registrada como comprovação de presença
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Informações adicionais */}
                      {timeRecord.registeredBy && (
                        <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="font-bold">Registrado por:</span> {timeRecord.registeredBy}
                            {timeRecord.registeredAt && (
                              <> • {new Date(timeRecord.registeredAt).toLocaleString('pt-BR')}</>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Informações da solicitação */}
                      <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} grid grid-cols-2 md:grid-cols-4 gap-4 text-xs`}>
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold block mb-1`}>Código</span>
                          <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'} style={{fontFamily: 'monospace'}}>{request.code}</span>
                        </div>
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold block mb-1`}>Turno</span>
                          <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                            {request.workDays.find(d => d.date === todayStr)?.shift || '-'}
                          </span>
                        </div>
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold block mb-1`}>Líder</span>
                          <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{request.leaderName}</span>
                        </div>
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold block mb-1`}>Contato</span>
                          <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{request.contact || '-'}</span>
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
