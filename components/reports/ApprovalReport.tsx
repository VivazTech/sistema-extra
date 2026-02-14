
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector } from '../ExportFormatModal';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';

interface ApprovalReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const ApprovalReport: React.FC<ApprovalReportProps> = ({ startDate, endDate, sector }) => {
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
    if (sector) list = filterBySector(list, sector);
    return list;
  }, [requests, startDate, endDate, sector]);

  // Estatísticas gerais
  const total = filteredRequests.length;
  const approved = filteredRequests.filter(r => r.status === 'APROVADO').length;
  const rejected = filteredRequests.filter(r => r.status === 'REPROVADO').length;
  const pending = filteredRequests.filter(r => r.status === 'SOLICITADO').length;
  const cancelled = filteredRequests.filter(r => r.status === 'CANCELADO').length;

  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0';
  const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : '0';

  // Tempo médio de aprovação
  const averageApprovalTime = useMemo(() => {
    const approvedWithTime = filteredRequests
      .filter(r => r.status === 'APROVADO' && r.approvedAt && r.createdAt)
      .map(r => {
        const created = new Date(r.createdAt).getTime();
        const approved = new Date(r.approvedAt!).getTime();
        return (approved - created) / (1000 * 60 * 60); // horas
      });

    if (approvedWithTime.length === 0) return 0;
    return approvedWithTime.reduce((sum, time) => sum + time, 0) / approvedWithTime.length;
  }, [filteredRequests]);

  // Aprovações por líder
  const leaderApprovals = useMemo(() => {
    const leaderMap: { [key: string]: { approved: number; rejected: number; total: number } } = {};
    
    filteredRequests.forEach(req => {
      if (!leaderMap[req.leaderName]) {
        leaderMap[req.leaderName] = { approved: 0, rejected: 0, total: 0 };
      }
      leaderMap[req.leaderName].total += 1;
      if (req.status === 'APROVADO') leaderMap[req.leaderName].approved += 1;
      if (req.status === 'REPROVADO') leaderMap[req.leaderName].rejected += 1;
    });

    return Object.entries(leaderMap)
      .map(([leader, data]) => ({
        name: leader,
        aprovadas: data.approved,
        reprovadas: data.rejected,
        total: data.total,
        taxaAprovacao: data.total > 0 ? ((data.approved / data.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRequests]);

  // Motivos de reprovação
  const rejectionReasons = useMemo(() => {
    const reasonMap: { [key: string]: number } = {};
    
    filteredRequests
      .filter(r => r.status === 'REPROVADO' && r.rejectionReason)
      .forEach(req => {
        const reason = req.rejectionReason || 'Sem motivo';
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      });

    return Object.entries(reasonMap)
      .map(([reason, count]) => ({ motivo: reason, quantidade: count }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredRequests]);

  // Urgência vs Normal
  const urgencyData = useMemo(() => {
    const urgent = filteredRequests.filter(r => r.urgency).length;
    const normal = filteredRequests.filter(r => !r.urgency).length;
    return [
      { name: 'Urgente', value: urgent, color: '#ef4444' },
      { name: 'Normal', value: normal, color: '#10b981' }
    ];
  }, [filteredRequests]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Taxa de Aprovação</span>
            <CheckCircle2 className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{approvalRate}%</div>
          <div className="text-xs text-gray-400 mt-1">{approved} de {total}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Taxa de Reprovação</span>
            <XCircle className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{rejectionRate}%</div>
          <div className="text-xs text-gray-400 mt-1">{rejected} de {total}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Tempo Médio Aprovação</span>
            <Clock className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{averageApprovalTime.toFixed(1)}h</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Pendentes</span>
            <TrendingUp className="text-amber-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{pending}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição de Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Aprovados', value: approved },
                  { name: 'Solicitados', value: pending },
                  { name: 'Reprovados', value: rejected },
                  { name: 'Cancelados', value: cancelled }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[approved, pending, rejected, cancelled].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Urgência vs Normal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Solicitações Urgentes vs Normais</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={urgencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aprovações por Líder */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Aprovações por Líder</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Líder</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aprovadas</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reprovadas</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Taxa de Aprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderApprovals.map((leader, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{leader.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{leader.total}</td>
                  <td className="px-6 py-4 text-sm text-emerald-600 font-bold">{leader.aprovadas}</td>
                  <td className="px-6 py-4 text-sm text-red-600 font-bold">{leader.reprovadas}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{leader.taxaAprovacao}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Motivos de Reprovação */}
      {rejectionReasons.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Motivos de Reprovação</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rejectionReasons.map((reason, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{reason.motivo}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-bold">{reason.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalReport;
