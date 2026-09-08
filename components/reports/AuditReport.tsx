
import React, { useEffect, useMemo, useState } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector } from '../ExportFormatModal';
import { Shield, User, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateBR, formatDateTimeBR } from '../../utils/date';

const PAGE_SIZE_OPTIONS = [10, 50, 100, 500] as const;
const DEFAULT_PAGE_SIZE = 10;

interface AuditReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const AuditReport: React.FC<AuditReportProps> = ({ startDate, endDate, sector }) => {
  const { requests } = useExtras();
  const [approvalPageSize, setApprovalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [approvalPage, setApprovalPage] = useState(1);
  const [pontoPageSize, setPontoPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pontoPage, setPontoPage] = useState(1);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (startDate || endDate) {
      list = list.filter(req => {
        const reqDate = new Date(req.createdAt);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        return (!start || reqDate >= start) && (!end || reqDate <= end);
      });
    }
    if (sector) list = filterBySector(list, sector);
    return list;
  }, [requests, startDate, endDate, sector]);

  // Histórico de aprovações/reprovações
  const approvalHistory = useMemo(() => {
    return filteredRequests
      .filter(r => r.status === 'APROVADO' || r.status === 'REPROVADO')
      .map(req => ({
        code: req.code,
        extraName: req.extraName,
        sector: req.sector,
        status: req.status,
        approvedBy: req.approvedBy || 'N/A',
        approvedAt: req.approvedAt || req.updatedAt,
        createdAt: req.createdAt,
        rejectionReason: req.rejectionReason,
        timeToApproval: req.approvedAt && req.createdAt
          ? ((new Date(req.approvedAt).getTime() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60)).toFixed(1)
          : null
      }))
      .sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
  }, [filteredRequests]);

  // Alterações em registros de ponto
  const timeRecordChanges = useMemo(() => {
    const changes: Array<{
      extraName: string;
      date: string;
      sector: string;
      registeredBy: string;
      registeredAt: string;
      hasPhoto: boolean;
    }> = [];

    filteredRequests
      .filter(r => r.status === 'APROVADO')
      .forEach(req => {
        req.workDays.forEach(day => {
          if (day.timeRecord?.registeredAt) {
            changes.push({
              extraName: req.extraName,
              date: day.date,
              sector: req.sector,
              registeredBy: day.timeRecord.registeredBy || 'N/A',
              registeredAt: day.timeRecord.registeredAt,
              hasPhoto: !!day.timeRecord.photoUrl
            });
          }
        });
      });

    return changes.sort((a, b) => 
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );
  }, [filteredRequests]);

  const approvalTotalPages = Math.max(1, Math.ceil(approvalHistory.length / approvalPageSize));
  const pontoTotalPages = Math.max(1, Math.ceil(timeRecordChanges.length / pontoPageSize));

  const paginatedApprovals = useMemo(() => {
    const start = (approvalPage - 1) * approvalPageSize;
    return approvalHistory.slice(start, start + approvalPageSize);
  }, [approvalHistory, approvalPage, approvalPageSize]);

  const paginatedPonto = useMemo(() => {
    const start = (pontoPage - 1) * pontoPageSize;
    return timeRecordChanges.slice(start, start + pontoPageSize);
  }, [timeRecordChanges, pontoPage, pontoPageSize]);

  const approvalFrom = approvalHistory.length === 0 ? 0 : (approvalPage - 1) * approvalPageSize + 1;
  const approvalTo = Math.min(approvalPage * approvalPageSize, approvalHistory.length);
  const pontoFrom = timeRecordChanges.length === 0 ? 0 : (pontoPage - 1) * pontoPageSize + 1;
  const pontoTo = Math.min(pontoPage * pontoPageSize, timeRecordChanges.length);

  useEffect(() => {
    setApprovalPage(1);
    setPontoPage(1);
  }, [startDate, endDate, sector]);

  useEffect(() => {
    if (approvalPage > approvalTotalPages) setApprovalPage(approvalTotalPages);
  }, [approvalPage, approvalTotalPages]);

  useEffect(() => {
    if (pontoPage > pontoTotalPages) setPontoPage(pontoTotalPages);
  }, [pontoPage, pontoTotalPages]);

  // Estatísticas
  const totalApprovals = approvalHistory.filter(a => a.status === 'APROVADO').length;
  const totalRejections = approvalHistory.filter(a => a.status === 'REPROVADO').length;
  const totalTimeRecords = timeRecordChanges.length;
  const uniqueApprovers = new Set(approvalHistory.map(a => a.approvedBy)).size;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Aprovações</span>
            <Shield className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalApprovals}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Reprovações</span>
            <Shield className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRejections}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Registros de Ponto</span>
            <Clock className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalTimeRecords}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Aprovadores Únicos</span>
            <User className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{uniqueApprovers}</div>
        </div>
      </div>

      {/* Histórico de Aprovações */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">Histórico de Aprovações/Reprovações</h3>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs font-bold text-gray-500 uppercase">Itens/página</span>
            <select
              value={approvalPageSize}
              onChange={(e) => {
                setApprovalPageSize(Number(e.target.value));
                setApprovalPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aprovado por</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data Aprovação</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tempo para Aprovação</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Motivo Reprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedApprovals.map((item, idx) => (
                <tr key={`${item.code}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.extraName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.sector}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.status === 'APROVADO' 
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.approvedBy}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateBR(item.approvedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.timeToApproval ? `${item.timeToApproval}h` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.rejectionReason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {approvalHistory.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-semibold text-gray-700">{approvalFrom}–{approvalTo}</span> de{' '}
              <span className="font-semibold text-gray-700">{approvalHistory.length}</span>
            </p>
            {approvalTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalPage((p) => Math.max(1, p - 1))}
                  disabled={approvalPage <= 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {approvalPage} de {approvalTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setApprovalPage((p) => Math.min(approvalTotalPages, p + 1))}
                  disabled={approvalPage >= approvalTotalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Histórico de Registros de Ponto */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">Histórico de Registros de Ponto</h3>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs font-bold text-gray-500 uppercase">Itens/página</span>
            <select
              value={pontoPageSize}
              onChange={(e) => {
                setPontoPageSize(Number(e.target.value));
                setPontoPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Registrado por</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data Registro</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPonto.map((change, idx) => (
                <tr key={`${change.extraName}-${change.date}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{change.extraName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateBR(change.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{change.sector}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{change.registeredBy}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateTimeBR(change.registeredAt)}
                  </td>
                  <td className="px-6 py-4">
                    {change.hasPhoto ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        Sim
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        Não
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {timeRecordChanges.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-semibold text-gray-700">{pontoFrom}–{pontoTo}</span> de{' '}
              <span className="font-semibold text-gray-700">{timeRecordChanges.length}</span>
            </p>
            {pontoTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPontoPage((p) => Math.max(1, p - 1))}
                  disabled={pontoPage <= 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {pontoPage} de {pontoTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPontoPage((p) => Math.min(pontoTotalPages, p + 1))}
                  disabled={pontoPage >= pontoTotalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditReport;
