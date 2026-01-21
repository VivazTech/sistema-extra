
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

const Requests: React.FC = () => {
  const { requests, updateStatus } = useExtras();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatWorkDays = (workDays: { date: string; shift: string }[]) => {
    if (!workDays.length) return '';
    const firstDate = new Date(workDays[0].date).toLocaleDateString('pt-BR');
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstDate} +${extraDays} dias` : firstDate;
  };

  const formatShiftSummary = (workDays: { date: string; shift: string }[]) => {
    if (!workDays.length) return '';
    const firstShift = workDays[0].shift;
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstShift} +${extraDays}` : firstShift;
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.extraName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    
    // Managers only see their sectors if restricted (mock implementation)
    const isManagerAuthorized = user?.role !== 'MANAGER' || (user.sectors?.includes(r.sector));
    
    return matchesSearch && matchesStatus && isManagerAuthorized;
  });

  const handleApprove = (id: string) => {
    if (confirm('Deseja realmente aprovar esta solicitação?')) {
      updateStatus(id, 'APROVADO', undefined, user?.name);
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedRequestId(id);
    setRejectModalOpen(true);
  };

  const submitReject = () => {
    if (!rejectionReason) return alert('O motivo da reprovação é obrigatório.');
    if (selectedRequestId) {
      updateStatus(selectedRequestId, 'REPROVADO', rejectionReason, user?.name);
      setRejectModalOpen(false);
      setRejectionReason('');
    }
  };

  const handleCancel = (id: string) => {
    const reason = prompt('Motivo do cancelamento (opcional):');
    if (reason !== null) {
      updateStatus(id, 'CANCELADO', reason || 'Sem motivo informado');
    }
  };

  const handlePrint = (r: any) => {
    generateIndividualPDF(r);
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">ID / Data</th>
              <th className="px-6 py-4">Setor / Função</th>
              <th className="px-6 py-4">Nome do Extra</th>
              <th className="px-6 py-4">Líder</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRequests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="font-bold text-gray-900 text-sm">{req.code}</p>
                  <p className="text-xs text-gray-500">{formatWorkDays(req.workDays)}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="font-medium text-gray-900 text-sm">{req.sector}</p>
                  <p className="text-xs text-gray-500">{req.role}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{req.extraName}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatShiftSummary(req.workDays)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{req.leaderName}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase
                    ${req.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' : ''}
                    ${req.status === 'SOLICITADO' ? 'bg-amber-100 text-amber-700' : ''}
                    ${req.status === 'REPROVADO' ? 'bg-red-100 text-red-700' : ''}
                    ${req.status === 'CANCELADO' ? 'bg-gray-100 text-gray-700' : ''}
                  `}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-900">
                    {req.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center gap-1">
                    {req.status === 'SOLICITADO' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                      <>
                        <button 
                          onClick={() => handleApprove(req.id)}
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                          title="Aprovar"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleOpenReject(req.id)}
                          className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                          title="Reprovar"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {req.status === 'APROVADO' && (
                      <button 
                        onClick={() => handlePrint(req)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        title="Imprimir PDF"
                      >
                        <Printer size={16} />
                      </button>
                    )}
                    {req.status === 'SOLICITADO' && user?.role === 'LEADER' && (
                      <button 
                        onClick={() => handleCancel(req.id)}
                        className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all"
                        title="Cancelar"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRequests.length === 0 && (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Search size={40} className="opacity-20" />
            <p>Nenhum extra encontrado com estes filtros.</p>
          </div>
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
