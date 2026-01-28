
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileDown, 
  MoreHorizontal, 
  Check, 
  X, 
  Printer,
  Ban
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { generateIndividualPDF, generateListPDF } from '../services/pdfService';
import RequestModal from '../components/RequestModal';
import { formatDateBR } from '../utils/date';

const Requests: React.FC = () => {
  const { requests, updateStatus } = useExtras();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');


  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.extraName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    
    // Managers only see their sectors if restricted (mock implementation)
    const isManagerAuthorized = user?.role !== 'MANAGER' || (user.sectors?.includes(r.sector));
    
    return matchesSearch && matchesStatus && isManagerAuthorized;
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
      } catch (error) {
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
        setRejectModalOpen(false);
        setRejectionReason('');
      } catch (error) {
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
      } catch (error) {
        console.error('Erro ao cancelar solicitação:', error);
        alert('Erro ao cancelar solicitação. Verifique o console para mais detalhes.');
      }
    }
  };

  const handlePrint = (r: any) => {
    generateIndividualPDF(r);
  };

  const handlePrintDay = (req: any, workDay: any) => {
    // Gerar PDF apenas para o dia selecionado (já inclui horários/foto se existirem no timeRecord)
    const requestForDay = {
      ...req,
      workDays: [workDay],
    };
    generateIndividualPDF(requestForDay);
  };

  const handleExportList = () => {
    generateListPDF(filteredRequests, `Solicitações - Filtro: ${filterStatus}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Solicitações de Extras</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportList}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-sm transition-all"
          >
            <FileDown size={18} /> Exportar PDF
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
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-bold uppercase">Valor</div>
                    <div className="text-lg font-black text-gray-900">
                      {req.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
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
                    {req.observations?.includes('PORTARIA - Horário não informado') && (
                      <span className="text-[10px] font-bold text-red-600">Horário não informado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dias (cada dia com ações próprias) */}
              <div className="divide-y divide-gray-100">
                {req.workDays.map((workDay: any, idx: number) => {
                  const zebra = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  const tr = workDay.timeRecord;
                  const hasTimes = !!(tr?.arrival || tr?.breakStart || tr?.breakEnd || tr?.departure);
                  const hasPhoto = !!tr?.photoUrl;

                  return (
                    <div key={`${req.id}-${workDay.date}-${workDay.shift}`} className={`${zebra} p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4`}>
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
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
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

                        {/* Imprimir por dia */}
                        {req.status === 'APROVADO' && (
                          <button
                            onClick={() => handlePrintDay(req, workDay)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                            title="Imprimir PDF do dia"
                          >
                            <Printer size={16} />
                            Imprimir dia
                          </button>
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
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <RequestModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />

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
    </div>
  );
};

export default Requests;
