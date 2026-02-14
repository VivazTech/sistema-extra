
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileDown, 
  MoreHorizontal, 
  Check, 
  X, 
  DollarSign,
  Ban,
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Edit,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { useActionLog } from '../context/ActionLogContext';
import { generateSingleReciboPDF, generateListPDF, generateIndividualPDF } from '../services/pdfService';
import { exportSingleReciboExcel, exportListExcel } from '../services/excelService';
import ExportFormatModal from '../components/ExportFormatModal';
import RequestModal from '../components/RequestModal';
import { formatDateBR } from '../utils/date';
import type { ExtraRequest } from '../types';

const Requests: React.FC = () => {
  const { requests, updateStatus, updateTimeRecord, deleteRequest, deleteWorkDay } = useExtras();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { logAction } = useActionLog();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ExtraRequest | null>(null);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingTimeRecord, setEditingTimeRecord] = useState<{ requestId: string; workDate: string } | null>(null);
  const [timeRecordForm, setTimeRecordForm] = useState<{
    arrival?: string;
    breakStart?: string;
    breakEnd?: string;
    departure?: string;
  }>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [exportModal, setExportModal] = useState<{ type: 'recibo'; request: ExtraRequest } | { type: 'list' } | null>(null);

  const toggleGroupExpanded = (requestId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  };


  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.extraName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    
    // Managers only see their sectors if restricted
    const isManagerAuthorized = user?.role !== 'MANAGER' || (user.sectors?.includes(r.sector));
    // Líder só vê solicitações do próprio setor
    const isLeaderAuthorized = user?.role !== 'LEADER' || (user.sectors?.length && user.sectors.includes(r.sector));
    
    return matchesSearch && matchesStatus && isManagerAuthorized && isLeaderAuthorized;
  });

  const handleApprove = async (id: string) => {
    if (confirm('Deseja realmente aprovar esta solicitação?')) {
      try {
        // Validar se user.id é UUID válido
        if (!user?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
          alert('Erro: Usuário não autenticado corretamente. Por favor, faça login novamente.');
          return;
        }
        await updateStatus(id, 'APROVADO', undefined, user.id);
        logAction('Solicitações > Aprovar', 'OK', { requestId: id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao aprovar';
        logAction('Solicitações > Aprovar', `Erro: ${msg}`, { requestId: id });
        console.error('Erro ao aprovar solicitação:', error);
        alert('Erro ao aprovar solicitação. Verifique o console para mais detalhes.');
      }
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedRequestId(id);
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (!rejectionReason) return alert('O motivo da reprovação é obrigatório.');
    if (selectedRequestId) {
      try {
        // Validar se user.id é UUID válido (não obrigatório para reprovação, mas melhor validar)
        const userId = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) 
          ? user.id 
          : undefined;
        await updateStatus(selectedRequestId, 'REPROVADO', rejectionReason, userId);
        logAction('Solicitações > Reprovar', 'OK', { requestId: selectedRequestId, motivo: rejectionReason });
        setRejectModalOpen(false);
        setRejectionReason('');
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao reprovar';
        logAction('Solicitações > Reprovar', `Erro: ${msg}`, { requestId: selectedRequestId });
        console.error('Erro ao reprovar solicitação:', error);
        alert('Erro ao reprovar solicitação. Verifique o console para mais detalhes.');
      }
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Motivo do cancelamento (opcional):');
    if (reason !== null) {
      try {
        await updateStatus(id, 'CANCELADO', reason || 'Sem motivo informado');
        logAction('Solicitações > Cancelar', 'OK', { requestId: id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao cancelar';
        logAction('Solicitações > Cancelar', `Erro: ${msg}`, { requestId: id });
        console.error('Erro ao cancelar solicitação:', error);
        alert('Erro ao cancelar solicitação. Verifique o console para mais detalhes.');
      }
    }
  };

  const handlePrint = (r: any) => {
    generateIndividualPDF(r);
  };

  const handleRecibo = (req: ExtraRequest) => {
    setExportModal({ type: 'recibo', request: req });
  };

  const handleExportList = () => {
    setExportModal({ type: 'list' });
  };

  const handleExportFormat = (format: 'pdf' | 'excel', sectorFilter?: string) => {
    if (!exportModal) return;
    if (exportModal.type === 'recibo') {
      if (format === 'pdf') generateSingleReciboPDF(exportModal.request);
      else exportSingleReciboExcel(exportModal.request);
    } else {
      let list = filteredRequests;
      if (sectorFilter === 'VIVAZ') {
        list = filteredRequests.filter(r => r.sector.toLowerCase() !== 'aquamania');
      } else if (sectorFilter === 'AQUAMANIA') {
        list = filteredRequests.filter(r => r.sector.toLowerCase() === 'aquamania');
      }
      const sectorSuffix = sectorFilter ? ` - ${sectorFilter}` : '';
      const title = `Solicitações - Filtro: ${filterStatus}${sectorSuffix}`;
      if (format === 'pdf') generateListPDF(list, title);
      else exportListExcel(list, title);
    }
    setExportModal(null);
  };

  // Verificar se há horários não informados em um workDay
  const hasMissingTimes = (workDay: any) => {
    const tr = workDay.timeRecord;
    if (!tr) return true; // Se não há timeRecord, todos estão faltando
    return !tr.arrival || !tr.breakStart || !tr.breakEnd || !tr.departure;
  };

  // Solicitação tem algum dia com horários faltando (status correto para "Horário não informado")
  const requestHasMissingTimes = (r: ExtraRequest) =>
    r.workDays.some((wd: any) => hasMissingTimes(wd));

  // Obter campos não informados
  const getMissingFields = (workDay: any) => {
    const tr = workDay.timeRecord || {};
    const missing: Array<{ field: string; label: string; icon: any }> = [];
    
    if (!tr.arrival) missing.push({ field: 'arrival', label: 'Chegada', icon: LogIn });
    if (!tr.breakStart) missing.push({ field: 'breakStart', label: 'Saída p/ Intervalo', icon: Coffee });
    if (!tr.breakEnd) missing.push({ field: 'breakEnd', label: 'Volta do Intervalo', icon: Coffee });
    if (!tr.departure) missing.push({ field: 'departure', label: 'Saída Final', icon: LogOut });
    
    return missing;
  };

  // Abrir modal de edição de horários
  const handleOpenTimeEdit = (requestId: string, workDate: string, workDay: any) => {
    const tr = workDay.timeRecord || {};
    setEditingTimeRecord({ requestId, workDate });
    setTimeRecordForm({
      arrival: tr.arrival || '',
      breakStart: tr.breakStart || '',
      breakEnd: tr.breakEnd || '',
      departure: tr.departure || '',
    });
  };

  // Salvar horários preenchidos
  const handleSaveTimeRecord = async () => {
    if (!editingTimeRecord || !user) return;

    // Apenas ADMIN pode preencher horários; líder não pode
    if (user.role !== 'ADMIN') {
      alert('Apenas administradores podem preencher horários não informados.');
      return;
    }

    try {
      // Buscar o workDay atual para preservar campos já preenchidos
      const request = requests.find(r => r.id === editingTimeRecord.requestId);
      if (!request) {
        alert('Solicitação não encontrada.');
        return;
      }

      const workDay = request.workDays.find(d => d.date === editingTimeRecord.workDate);
      if (!workDay) {
        alert('Dia de trabalho não encontrado.');
        return;
      }

      const existing = workDay.timeRecord || {};

      // Admin pode editar os 4 campos; usar sempre os valores do formulário
      const updatedTimeRecord: any = {
        arrival: timeRecordForm.arrival?.trim() || undefined,
        breakStart: timeRecordForm.breakStart?.trim() || undefined,
        breakEnd: timeRecordForm.breakEnd?.trim() || undefined,
        departure: timeRecordForm.departure?.trim() || undefined,
        photoUrl: existing.photoUrl,
        observations: existing.observations,
        registeredBy: existing.registeredBy,
        registeredAt: existing.registeredAt,
      };

      // Exigir pelo menos chegada e saída final para salvar
      if (!updatedTimeRecord.arrival || !updatedTimeRecord.departure) {
        alert('Preencha pelo menos Chegada e Saída Final.');
        return;
      }

      await updateTimeRecord(
        editingTimeRecord.requestId,
        editingTimeRecord.workDate,
        updatedTimeRecord,
        user.name || 'Admin'
      );

      setEditingTimeRecord(null);
      setTimeRecordForm({});
      alert('Horários salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      alert('Erro ao salvar horários. Verifique o console para mais detalhes.');
    }
  };

  const leaderSectorLabel = user?.role === 'LEADER' && user.sectors?.length
    ? user.sectors.join(', ')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Extras</h1>
          {leaderSectorLabel && (
            <p className="text-sm text-gray-600 mt-0.5 font-medium">Setor: {leaderSectorLabel}</p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportList}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-sm transition-all"
          >
            <FileDown size={18} /> Exportar Lista
          </button>
          {user?.role !== 'VIEWER' && (
            <button 
              onClick={() => setModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md transition-all"
            >
              <Plus size={18} /> Novo Extra
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou ID..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="SOLICITADO">Solicitado</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REPROVADO">Reprovado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Search size={40} className="opacity-20" />
            <p>Nenhum extra encontrado com estes filtros.</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header do card (igual vibe Banco de Extras) */}
              <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-500">{req.code}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-sm font-black text-gray-900 truncate">{req.extraName}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="font-bold text-gray-700">{req.sector}</span>
                    <span>/{req.role}</span>
                    <span className="text-gray-300">•</span>
                    <span>Líder: <span className="font-semibold text-gray-700">{req.leaderName}</span></span>
                    <span className="text-gray-300">•</span>
                    <span>Demandante: <span className="font-semibold text-gray-700">{req.requester}</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-4">
                  <div className="flex items-center gap-2">
                    {req.status === 'APROVADO' && user?.role !== 'LEADER' && (
                      <button
                        onClick={() => handleRecibo(req as ExtraRequest)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                        title="Baixar recibo de pagamento (PDF com todos os dias)"
                      >
                        <DollarSign size={16} />
                        Recibo
                      </button>
                    )}
                    {user?.role === 'ADMIN' && (
                      <>
                        <button
                          onClick={() => setEditingRequest(req)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs"
                          title="Editar solicitação"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) {
                              try {
                                await deleteRequest(req.id);
                              } catch (e) {
                                console.error(e);
                                alert('Erro ao excluir solicitação.');
                              }
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-xs"
                          title="Excluir solicitação"
                        >
                          <Trash2 size={16} />
                          Apagar
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-bold uppercase">Valor</div>
                    <div className="text-lg font-black text-gray-900">
                      {(req.value * (req.workDays?.length || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    {(req.workDays?.length || 0) > 1 && (
                      <div className="text-[10px] text-gray-500">
                        {req.workDays.length} × R$ {req.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`
                      inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide
                      ${req.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' : ''}
                      ${req.status === 'SOLICITADO' ? 'bg-amber-100 text-amber-700' : ''}
                      ${req.status === 'REPROVADO' ? 'bg-red-100 text-red-700' : ''}
                      ${req.status === 'CANCELADO' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {req.status}
                    </span>
                    {req.status === 'SOLICITADO' && req.needsManagerApproval && (
                      <span className="text-[10px] font-bold text-amber-600">Aguardando gerente</span>
                    )}
                    {req.observations?.includes('PORTARIA - Horário não informado') && requestHasMissingTimes(req) && (
                      <span className="text-[10px] font-bold text-red-600">Horário não informado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dias (cada dia com ações próprias); ocultos até clicar em "Ver dias" */}
              {(() => {
                const totalDays = req.workDays.length;
                const isExpanded = expandedGroups.has(req.id);
                const showVerDias = totalDays >= 1;
                const visibleDays = isExpanded ? req.workDays : [];

                return (
                  <div className="divide-y divide-gray-100">
                    {visibleDays.map((workDay: any, idx: number) => {
                      const zebra = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                      const tr = workDay.timeRecord;
                      const hasTimes = !!(tr?.arrival || tr?.breakStart || tr?.breakEnd || tr?.departure);
                      const hasPhoto = !!tr?.photoUrl;
                      const hasMissing = hasMissingTimes(workDay);
                      const missingFields = getMissingFields(workDay);

                      return (
                        <div key={`${req.id}-${workDay.date}-${workDay.shift}`} className={`${zebra} p-4 sm:p-5`}>
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Data</div>
                                <div className="text-sm font-bold text-gray-900">{formatDateBR(workDay.date)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Turno</div>
                                <div className="text-sm font-semibold text-gray-700">{workDay.shift}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Portaria</div>
                                <div className="text-xs text-gray-700">
                                  {hasTimes ? (
                                    <span className="font-semibold">
                                      {tr?.arrival || '—'} • {tr?.breakStart || '—'} • {tr?.breakEnd || '—'} • {tr?.departure || '—'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Sem horários</span>
                                  )}
                                  {hasPhoto && <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Foto</span>}
                                </div>
                                {hasMissing && (
                                  <div className="mt-1">
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                      Horários não informados
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {hasPhoto && tr?.photoUrl && (
                              <div className="shrink-0 flex flex-col items-center gap-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Foto confirmação</div>
                                <a
                                  href={tr.photoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-200 bg-gray-100 hover:border-emerald-500 transition-colors"
                                  title="Abrir foto em nova aba"
                                >
                                  <img
                                    src={tr.photoUrl}
                                    alt="Foto do extra"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (tr?.photoUrl?.startsWith('data:')) target.src = tr.photoUrl;
                                      else target.style.display = 'none';
                                    }}
                                  />
                                </a>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              {/* Botão para apagar apenas este dia (apenas ADMIN, quando há mais de um dia) */}
                              {user?.role === 'ADMIN' && totalDays > 1 && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Remover o dia ${formatDateBR(workDay.date)} desta solicitação?`)) {
                                      try {
                                        await deleteWorkDay(req.id, workDay.date);
                                        logAction('Solicitações > Apagar dia', 'OK', { requestId: req.id, workDate: workDay.date });
                                      } catch (e) {
                                        console.error(e);
                                        alert('Erro ao remover dia.');
                                      }
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-xs"
                                  title="Apagar este dia da solicitação"
                                >
                                  <Trash2 size={16} />
                                  Apagar dia
                                </button>
                              )}
                              {/* Botão para preencher horários não informados (apenas ADMIN) */}
                              {hasMissing && user?.role === 'ADMIN' && (
                                <button
                                  onClick={() => handleOpenTimeEdit(req.id, workDay.date, workDay)}
                                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
                                  title="Preencher horários não informados"
                                >
                                  <Edit size={16} />
                                  Preencher Horários
                                </button>
                              )}
                              {/* Botão para editar horários já preenchidos (apenas ADMIN) */}
                              {!hasMissing && user?.role === 'ADMIN' && (
                                <button
                                  onClick={() => handleOpenTimeEdit(req.id, workDay.date, workDay)}
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg text-xs"
                                  title="Editar horários registrados"
                                >
                                  <Clock size={16} />
                                  Editar Horários
                                </button>
                              )}

                              {/* Aprovar/Reprovar por dia (ação aplicada na solicitação, mas disponível em cada dia) */}
                              {req.status === 'SOLICITADO' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                <>
                                  <button
                                    onClick={() => handleApprove(req.id)}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                                    title="Aprovar"
                                  >
                                    <Check size={16} />
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => handleOpenReject(req.id)}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs"
                                    title="Reprovar"
                                  >
                                    <X size={16} />
                                    Reprovar
                                  </button>
                                </>
                              )}

                              {/* Cancelar (líder) */}
                              {req.status === 'SOLICITADO' && user?.role === 'LEADER' && (
                                <button
                                  onClick={() => handleCancel(req.id)}
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs"
                                  title="Cancelar"
                                >
                                  <Ban size={16} />
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {showVerDias && (
                      <div className="bg-gray-50/80 p-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpanded(req.id)}
                          className="flex items-center justify-start gap-2 w-full py-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              Ocultar dias
                              <ChevronUp size={18} className="shrink-0" />
                            </>
                          ) : (
                            <>
                              Ver dias
                              <span className="text-gray-500 font-normal">({totalDays} {totalDays === 1 ? 'dia' : 'dias'})</span>
                              <ChevronDown size={18} className="shrink-0" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        )}
      </div>

      {exportModal && (
        <ExportFormatModal
          isOpen={!!exportModal}
          onClose={() => setExportModal(null)}
          onExport={handleExportFormat}
          type={exportModal.type === 'recibo' ? 'recibo' : 'list'}
        />
      )}

      <RequestModal
        isOpen={isModalOpen || !!editingRequest}
        onClose={() => { setModalOpen(false); setEditingRequest(null); }}
        initialRequest={editingRequest}
      />

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">Motivo da Reprovação</h2>
            <textarea 
              autoFocus
              className="w-full border border-gray-200 rounded-xl p-3 h-32 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Descreva o motivo por que esta solicitação está sendo negada..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRejectModalOpen(false)} className="flex-1 py-2 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">Voltar</button>
              <button onClick={submitReject} className="flex-1 py-2 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md">Confirmar Reprovação</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Horários Não Informados */}
      {editingTimeRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Preencher Horários Não Informados</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Preencha apenas os horários que estão em branco
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTimeRecord(null);
                  setTimeRecordForm({});
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {(() => {
              const request = requests.find(r => r.id === editingTimeRecord.requestId);
              const workDay = request?.workDays.find(d => d.date === editingTimeRecord.workDate);
              const missingFields = workDay ? getMissingFields(workDay) : [];
              const tr = workDay?.timeRecord || {};

              return (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Clock size={18} />
                      <span className="text-sm font-bold">
                        Preencha os horários que estão faltando para o dia {formatDateBR(editingTimeRecord.workDate)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chegada - admin pode editar todos os 4 campos */}
                    <div className={`p-4 rounded-xl border ${!tr.arrival ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <LogIn size={16} className={!tr.arrival ? 'text-amber-600' : 'text-gray-400'} />
                        Chegada
                        {!tr.arrival && <span className="text-xs text-amber-600 font-bold">(Não informado)</span>}
                      </label>
                      <input
                        type="time"
                        value={timeRecordForm.arrival || ''}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, arrival: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Saída para Intervalo */}
                    <div className={`p-4 rounded-xl border ${!tr.breakStart ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <Coffee size={16} className={!tr.breakStart ? 'text-amber-600' : 'text-gray-400'} />
                        Saída p/ Intervalo
                        {!tr.breakStart && <span className="text-xs text-amber-600 font-bold">(Não informado)</span>}
                      </label>
                      <input
                        type="time"
                        value={timeRecordForm.breakStart || ''}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, breakStart: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Volta do Intervalo */}
                    <div className={`p-4 rounded-xl border ${!tr.breakEnd ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <Coffee size={16} className={!tr.breakEnd ? 'text-amber-600' : 'text-gray-400'} />
                        Volta do Intervalo
                        {!tr.breakEnd && <span className="text-xs text-amber-600 font-bold">(Não informado)</span>}
                      </label>
                      <input
                        type="time"
                        value={timeRecordForm.breakEnd || ''}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, breakEnd: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Saída Final */}
                    <div className={`p-4 rounded-xl border ${!tr.departure ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <LogOut size={16} className={!tr.departure ? 'text-amber-600' : 'text-gray-400'} />
                        Saída Final
                        {!tr.departure && <span className="text-xs text-amber-600 font-bold">(Não informado)</span>}
                      </label>
                      <input
                        type="time"
                        value={timeRecordForm.departure || ''}
                        onChange={(e) => setTimeRecordForm({ ...timeRecordForm, departure: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setEditingTimeRecord(null);
                        setTimeRecordForm({});
                      }}
                      className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveTimeRecord}
                      className="flex-1 py-3 font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-md transition-colors"
                    >
                      Salvar Horários
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
