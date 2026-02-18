
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
  ArrowDownAZ,
  UserX,
  FileText,
  Save
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { ExtraRequest } from '../types';
import { supabase } from '../services/supabase';
import { formatDateTimeBR } from '../utils/date';
import { formatDateBR } from '../utils/date';

const Portaria: React.FC = () => {
  const { requests, sectors, shifts, updateTimeRecord, appendRequestObservation, removeWorkDay } = useExtras();
  const { user } = useAuth();
  const canViewValues = user?.role !== 'PORTARIA' && user?.role !== 'VIEWER';
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [selectedShift, setSelectedShift] = useState<string>('TODOS');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'recent'>('alphabetical');
  /** Rascunho da observação da portaria por card (key = requestId-workDate). */
  const [observationDraft, setObservationDraft] = useState<Record<string, string>>({});
  /** Key do card cuja observação está sendo salva (para mostrar loading). */
  const [observationSavingKey, setObservationSavingKey] = useState<string | null>(null);
  /** Key do card que acabou de ter o turno confirmado (mensagem de sucesso). */
  const [turnoConfirmedKey, setTurnoConfirmedKey] = useState<string | null>(null);
  /** Rascunho dos horários digitados (só local, não salva até clicar em Registrar). Key: requestId-workDate. */
  const [timeDraft, setTimeDraft] = useState<Record<string, Partial<Record<'arrival' | 'breakStart' | 'breakEnd' | 'departure', string>>>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const timeDraftKey = (requestId: string, workDate: string) => `${requestId}-${workDate}`;

  const setTimeDraftField = (
    requestId: string,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure',
    value: string
  ) => {
    const key = timeDraftKey(requestId, workDate);
    setTimeDraft(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const getDisplayTime = (
    request: ExtraRequest,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure'
  ): string => {
    const tr = getTimeRecord(request, workDate);
    const draft = timeDraft[timeDraftKey(request.id, workDate)];
    return (tr[field] ?? draft?.[field] ?? '') || '';
  };

  const clearTimeDraftField = (requestId: string, workDate: string, field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure') => {
    const key = timeDraftKey(requestId, workDate);
    setTimeDraft(prev => {
      const next = { ...prev[key] };
      delete next[field];
      return { ...prev, [key]: next };
    });
  };

  /** Oculto temporariamente: quando false, o turno é confirmado ao preencher os 4 horários (saída final), sem exigir foto. */
  const SHOW_PHOTO_FEATURE = false;

  // Atualizar horário atual a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtrar solicitações aprovadas por período (só aparecem as que ainda têm dia incompleto)
  const periodExtras = useMemo(() => {
    const startDate = dateStart || todayStr;
    const endDate = dateEnd || todayStr;

    return requests.filter(req => {
      if (req.status !== 'APROVADO') return false;

      const inPeriod = req.workDays.some(day => {
        const dayDate = day.date;
        return dayDate >= startDate && dayDate <= endDate;
      });
      if (!inPeriod) return false;

      const hasIncomplete = req.workDays.some(day => {
        if (day.date < startDate || day.date > endDate) return false;
        const tr = day.timeRecord;
        if (SHOW_PHOTO_FEATURE) return !(tr?.arrival && tr?.departure && tr?.photoUrl);
        return !(tr?.arrival && tr?.breakStart && tr?.breakEnd && tr?.departure);
      });
      return hasIncomplete;
    });
  }, [requests, dateStart, dateEnd, todayStr]);

  // Aplicar todos os filtros (setor, turno, pesquisa, período) e ordenação
  const filteredExtras = useMemo(() => {
    let filtered = periodExtras;

    // Filtro por setor
    if (selectedSector !== 'TODOS') {
      filtered = filtered.filter(req => req.sector === selectedSector);
    }

    // Filtro por turno (workDay no período com esse turno)
    if (selectedShift !== 'TODOS') {
      const startDate = dateStart || todayStr;
      const endDate = dateEnd || todayStr;
      filtered = filtered.filter(req =>
        req.workDays.some(day =>
          day.date >= startDate && day.date <= endDate && day.shift === selectedShift
        )
      );
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
  }, [periodExtras, selectedSector, selectedShift, dateStart, dateEnd, todayStr, searchTerm, sortOrder]);

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
    
    return (Math.round((totalMinutes / 60) * 100) / 100).toFixed(2);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const buildNotInformedNote = (fieldLabel: string, workDate: string) => {
    const formattedDate = formatDateBR(workDate);
    return `PORTARIA - Horário não informado: ${fieldLabel} (${formattedDate})`;
  };

  /** Salva o horário no banco. Chamado apenas ao clicar em Registrar ou Não informado. */
  const saveTimeRecord = (
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
    clearTimeDraftField(requestId, workDate, field);

    if (!SHOW_PHOTO_FEATURE && value) {
      const allFilled =
        (updatedTimeRecord.arrival || '') !== '' &&
        (updatedTimeRecord.breakStart ?? '') !== '' &&
        (updatedTimeRecord.breakEnd ?? '') !== '' &&
        (updatedTimeRecord.departure ?? '') !== '';
      if (allFilled) {
        setTurnoConfirmedKey(`${requestId}-${workDate}`);
        setTimeout(() => setTurnoConfirmedKey(null), 4000);
      }
    }
  };

  /** Registrar: usa horário digitado se houver, senão horário atual. Só salva ao clicar no botão. */
  const handleRegisterTime = (
    requestId: string,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure'
  ) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    const displayValue = getDisplayTime(request, workDate, field);
    const valueToSave = displayValue.trim() ? displayValue : getCurrentTime();
    saveTimeRecord(requestId, workDate, field, valueToSave);
  };

  const handleNotInformed = async (
    requestId: string,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure',
    fieldLabel: string
  ) => {
    saveTimeRecord(requestId, workDate, field, '');
    clearTimeDraftField(requestId, workDate, field);
    await appendRequestObservation(requestId, buildNotInformedNote(fieldLabel, workDate));
  };

  const getTimeRecord = (request: ExtraRequest, date: string) => {
    const workDay = request.workDays.find(d => d.date === date);
    return workDay?.timeRecord || {};
  };

  const isComplete = (request: ExtraRequest, date: string) => {
    const timeRecord = getTimeRecord(request, date);
    if (SHOW_PHOTO_FEATURE) return !!(timeRecord.arrival && timeRecord.departure && timeRecord.photoUrl);
    return !!(timeRecord.arrival && timeRecord.breakStart && timeRecord.breakEnd && timeRecord.departure);
  };

  const hasAllTimes = (request: ExtraRequest, date: string) => {
    const timeRecord = getTimeRecord(request, date);
    return !!(timeRecord.arrival && timeRecord.breakStart && timeRecord.breakEnd && timeRecord.departure);
  };

  // Campo de horário já foi preenchido (tem valor) e não pode mais ser alterado
  const isTimeFieldLocked = (
    request: ExtraRequest,
    workDate: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure'
  ) => {
    const tr = getTimeRecord(request, workDate);
    const value = tr[field];
    return value != null && value !== '';
  };

  const [capturingPhoto, setCapturingPhoto] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSaveSuccessKey, setPhotoSaveSuccessKey] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Effect para atribuir o stream ao vídeo quando o elemento estiver pronto
  useEffect(() => {
    if (capturingPhoto && streamRef.current) {
      // Aguardar o elemento de vídeo ser renderizado
      const checkVideoElement = () => {
        if (videoRef.current && streamRef.current) {
          const video = videoRef.current;
          const stream = streamRef.current;
          
          video.srcObject = stream;
          
          // Aguardar o vídeo estar pronto para reproduzir
          const handleLoadedMetadata = () => {
            video.play().catch(err => {
              console.error('Erro ao reproduzir vídeo:', err);
            });
          };
          
          if (video.readyState >= 2) {
            // Já está carregado
            video.play().catch(err => {
              console.error('Erro ao reproduzir vídeo:', err);
            });
          } else {
            video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
          }
        } else {
          // Tentar novamente após um pequeno delay
          setTimeout(checkVideoElement, 50);
        }
      };
      
      checkVideoElement();
    }
  }, [capturingPhoto]);

  const startCamera = async (requestId: string, workDate: string) => {
    try {
      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não está disponível neste navegador. Use HTTPS ou localhost.');
      }

      // Primeiro, definir o estado para renderizar o elemento de vídeo
      setCapturingPhoto(`${requestId}-${workDate}`);
      
      // Aguardar um pouco para garantir que o elemento seja renderizado
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Agora acessar a câmera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      
      // O useEffect vai atribuir o stream ao vídeo quando o elemento estiver pronto
      // Mas também tentamos atribuir diretamente caso o elemento já esteja disponível
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('Erro ao reproduzir vídeo:', err);
        });
      }
    } catch (error: any) {
      console.error('Erro ao acessar câmera:', error);
      setCapturingPhoto(null); // Limpar estado em caso de erro
      streamRef.current = null;
      
      let errorMessage = 'Erro ao acessar a câmera.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada. Verifique se há uma câmera conectada.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'A câmera está sendo usada por outro aplicativo. Feche outros aplicativos que possam estar usando a câmera.';
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      alert(errorMessage);
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
      setPhotoSaveSuccessKey(`${requestId}-${workDate}`);
      setTimeout(() => setPhotoSaveSuccessKey(null), 3000);
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
              {formatDateBR(new Date()).slice(0, 5)}
            </div>
            <div className="text-xs text-gray-500 uppercase font-bold">
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date())}
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

        {/* Segunda linha: Período e Turno */}
        <div className="flex flex-wrap items-center gap-4">
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
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <Clock size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Turno:</span>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium bg-white"
            >
              <option value="TODOS">Todos</option>
              {shifts.filter(s => s.name).map(shift => {
                const startDate = dateStart || todayStr;
                const endDate = dateEnd || todayStr;
                const count = periodExtras.filter(req =>
                  req.workDays.some(day =>
                    day.date >= startDate && day.date <= endDate && day.shift === shift.name
                  )
                ).length;
                return (
                  <option key={shift.id} value={shift.name}>
                    {shift.name} ({count})
                  </option>
                );
              })}
            </select>
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
              {searchTerm || dateStart || dateEnd || selectedSector !== 'TODOS' || selectedShift !== 'TODOS'
                ? 'Nenhum resultado encontrado com os filtros aplicados'
                : 'Nenhum funcionário extra aprovado para hoje'}
              {selectedSector !== 'TODOS' && ` no setor ${selectedSector}`}
              {selectedShift !== 'TODOS' && ` no turno ${selectedShift}`}
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
                    {/* Valor: combinado = total fixo; por hora = ref. × dias */}
                    {canViewValues && (
                      <div className="text-right text-emerald-600">
                        <div className="text-xs font-bold uppercase mb-1">Valor</div>
                        <div className="text-lg font-black">
                          {request.valueType === 'combinado'
                            ? `R$ ${request.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `R$ ${(request.value * (request.workDays?.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                        {request.valueType !== 'combinado' && (request.workDays?.length || 0) > 1 && (
                          <div className="text-[10px] opacity-90">
                            {request.workDays.length} × R$ {request.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )}
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
                    {!timeRecord.arrival && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Confirmar que ${request.extraName} faltou no dia ${formatDateBR(workDayDate)}?`)) {
                            removeWorkDay(request.id, workDayDate, user?.name || 'Portaria');
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md"
                        title="Marcar como faltou"
                      >
                        FALTOU
                      </button>
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
                      {turnoConfirmedKey === photoKey && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800">
                          <CheckCircle size={24} className="shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-bold">Turno confirmado com sucesso!</p>
                            <p className="text-sm opacity-90">Todos os horários foram registrados.</p>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
                        Registro de Horários
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Chegada */}
                        <div className={`bg-white p-4 rounded-xl border ${isTimeFieldLocked(request, workDayDate, 'arrival') ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <LogIn size={16} className="text-emerald-600" />
                            Chegada
                            {isTimeFieldLocked(request, workDayDate, 'arrival') && (
                              <span className="text-xs font-normal text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Registrado</span>
                            )}
                          </label>
                          <input
                            type="time"
                            value={getDisplayTime(request, workDayDate, 'arrival')}
                            onChange={(e) => {
                              if (isTimeFieldLocked(request, workDayDate, 'arrival')) return;
                              setTimeDraftField(request.id, workDayDate, 'arrival', e.target.value);
                            }}
                            readOnly={isTimeFieldLocked(request, workDayDate, 'arrival')}
                            disabled={isTimeFieldLocked(request, workDayDate, 'arrival')}
                            className={`w-full px-4 py-3 rounded-lg border text-gray-900 font-bold text-lg outline-none ${isTimeFieldLocked(request, workDayDate, 'arrival') ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'}`}
                          />
                          {!isTimeFieldLocked(request, workDayDate, 'arrival') && (
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
                          )}
                        </div>

                        {/* Saída para Intervalo */}
                        <div className={`bg-white p-4 rounded-xl border ${isTimeFieldLocked(request, workDayDate, 'breakStart') ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <Coffee size={16} className="text-amber-600" />
                            Saída p/ Intervalo
                            {isTimeFieldLocked(request, workDayDate, 'breakStart') && (
                              <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Registrado</span>
                            )}
                          </label>
                          <input
                            type="time"
                            value={getDisplayTime(request, workDayDate, 'breakStart')}
                            onChange={(e) => {
                              if (isTimeFieldLocked(request, workDayDate, 'breakStart')) return;
                              setTimeDraftField(request.id, workDayDate, 'breakStart', e.target.value);
                            }}
                            readOnly={isTimeFieldLocked(request, workDayDate, 'breakStart')}
                            disabled={isTimeFieldLocked(request, workDayDate, 'breakStart')}
                            className={`w-full px-4 py-3 rounded-lg border text-gray-900 font-bold text-lg outline-none ${isTimeFieldLocked(request, workDayDate, 'breakStart') ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500'}`}
                          />
                          {!isTimeFieldLocked(request, workDayDate, 'breakStart') && (
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
                          )}
                        </div>

                        {/* Volta do Intervalo */}
                        <div className={`bg-white p-4 rounded-xl border ${isTimeFieldLocked(request, workDayDate, 'breakEnd') ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <Coffee size={16} className="text-emerald-600" />
                            Volta do Intervalo
                            {isTimeFieldLocked(request, workDayDate, 'breakEnd') && (
                              <span className="text-xs font-normal text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Registrado</span>
                            )}
                          </label>
                          <input
                            type="time"
                            value={getDisplayTime(request, workDayDate, 'breakEnd')}
                            onChange={(e) => {
                              if (isTimeFieldLocked(request, workDayDate, 'breakEnd')) return;
                              setTimeDraftField(request.id, workDayDate, 'breakEnd', e.target.value);
                            }}
                            readOnly={isTimeFieldLocked(request, workDayDate, 'breakEnd')}
                            disabled={isTimeFieldLocked(request, workDayDate, 'breakEnd')}
                            className={`w-full px-4 py-3 rounded-lg border text-gray-900 font-bold text-lg outline-none ${isTimeFieldLocked(request, workDayDate, 'breakEnd') ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'}`}
                          />
                          {!isTimeFieldLocked(request, workDayDate, 'breakEnd') && (
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
                          )}
                        </div>

                        {/* Saída Final */}
                        <div className={`bg-white p-4 rounded-xl border ${isTimeFieldLocked(request, workDayDate, 'departure') ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <LogOut size={16} className="text-red-600" />
                            Saída Final
                            {isTimeFieldLocked(request, workDayDate, 'departure') && (
                              <span className="text-xs font-normal text-red-700 bg-red-100 px-2 py-0.5 rounded">Registrado</span>
                            )}
                          </label>
                          <input
                            type="time"
                            value={getDisplayTime(request, workDayDate, 'departure')}
                            onChange={(e) => {
                              if (isTimeFieldLocked(request, workDayDate, 'departure')) return;
                              setTimeDraftField(request.id, workDayDate, 'departure', e.target.value);
                            }}
                            readOnly={isTimeFieldLocked(request, workDayDate, 'departure')}
                            disabled={isTimeFieldLocked(request, workDayDate, 'departure')}
                            className={`w-full px-4 py-3 rounded-lg border text-gray-900 font-bold text-lg outline-none ${isTimeFieldLocked(request, workDayDate, 'departure') ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500'}`}
                          />
                          {!isTimeFieldLocked(request, workDayDate, 'departure') && (
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
                          )}
                        </div>
                      </div>

                      {/* Observação da portaria - abaixo do registro de horários */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          <FileText size={14} className="text-gray-500" />
                          Observação da portaria
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Anote aqui qualquer acontecimento relevante do dia (atrasos, ocorrências, etc.).
                        </p>
                        <textarea
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y min-h-[80px]"
                          placeholder="Ex.: Extra chegou 10 min atrasado; solicitou saída 15 min mais cedo..."
                          value={observationDraft[photoKey] ?? timeRecord.observations ?? ''}
                          onChange={(e) => setObservationDraft(prev => ({ ...prev, [photoKey]: e.target.value }))}
                          rows={3}
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              const value = observationDraft[photoKey] ?? timeRecord.observations ?? '';
                              setObservationSavingKey(photoKey);
                              try {
                                await updateTimeRecord(
                                  request.id,
                                  workDayDate,
                                  { ...timeRecord, observations: value || undefined },
                                  user?.name || 'Portaria'
                                );
                                setObservationDraft(prev => {
                                  const next = { ...prev };
                                  delete next[photoKey];
                                  return next;
                                });
                              } catch (e) {
                                console.error(e);
                                alert('Erro ao salvar observação.');
                              } finally {
                                setObservationSavingKey(null);
                              }
                            }}
                            disabled={observationSavingKey === photoKey}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {observationSavingKey === photoKey ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Salvar observação
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Captura de Foto - Oculto temporariamente (SHOW_PHOTO_FEATURE) */}
                      {SHOW_PHOTO_FEATURE && allTimesFilled && !hasPhoto && (
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
                                  <div className="absolute inset-x-0 top-0 py-3 px-4 bg-emerald-600/95 text-white flex items-center justify-center gap-2 rounded-t-xl">
                                    <CheckCircle size={22} className="shrink-0" />
                                    <span className="font-bold text-sm">Foto capturada com sucesso</span>
                                  </div>
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

                      {/* Foto Confirmada - Oculto temporariamente (SHOW_PHOTO_FEATURE) */}
                      {SHOW_PHOTO_FEATURE && hasPhoto && timeRecord.photoUrl && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                            {photoSaveSuccessKey === `${request.id}-${workDayDate}` && (
                              <div className="mb-3 py-3 px-4 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2 font-bold">
                                <CheckCircle size={20} className="shrink-0" />
                                Foto registrada com sucesso
                              </div>
                            )}
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
                              <> • {formatDateTimeBR(timeRecord.registeredAt)}</>
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
