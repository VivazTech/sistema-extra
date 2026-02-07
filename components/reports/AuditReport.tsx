
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { Shield, User, Clock, FileText } from 'lucide-react';
import { formatDateBR, formatDateTimeBR } from '../../utils/date';

interface AuditReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const AuditReport: React.FC<AuditReportProps> = ({ startDate, endDate, sector }) => {
  const { requests } = useExtras();

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
    if (sector) list = list.filter(r => r.sector === sector);
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
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Histórico de Aprovações/Reprovações</h3>
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
              {approvalHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
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
      </div>

      {/* Histórico de Registros de Ponto */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Histórico de Registros de Ponto</h3>
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
              {timeRecordChanges.map((change, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
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
      </div>
    </div>
  );
};

export default AuditReport;
