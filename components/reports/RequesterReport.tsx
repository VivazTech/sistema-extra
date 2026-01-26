
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, TrendingUp, CheckCircle2 } from 'lucide-react';

interface RequesterReportProps {
  startDate?: string;
  endDate?: string;
}

const RequesterReport: React.FC<RequesterReportProps> = ({ startDate, endDate }) => {
  const { requests } = useExtras();

  if (!requests || requests.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
          <User className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-400 font-medium">
            Nenhuma solicitação encontrada.
          </p>
        </div>
      </div>
    );
  }

  const filteredRequests = useMemo(() => {
    if (!startDate && !endDate) return requests;
    return requests.filter(req => {
      const reqDate = new Date(req.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      return (!start || reqDate >= start) && (!end || reqDate <= end);
    });
  }, [requests, startDate, endDate]);

  // Análise por solicitante
  const requesterAnalysis = useMemo(() => {
    const requesterMap: { 
      [key: string]: { 
        total: number; 
        approved: number; 
        rejected: number;
        totalDays: number;
        sectors: Set<string>;
      } 
    } = {};

    filteredRequests.forEach(req => {
      if (!requesterMap[req.requester]) {
        requesterMap[req.requester] = {
          total: 0,
          approved: 0,
          rejected: 0,
          totalDays: 0,
          sectors: new Set()
        };
      }

      requesterMap[req.requester].total += 1;
      requesterMap[req.requester].totalDays += req.workDays.length;
      requesterMap[req.requester].sectors.add(req.sector);

      if (req.status === 'APROVADO') {
        requesterMap[req.requester].approved += 1;
      } else if (req.status === 'REPROVADO') {
        requesterMap[req.requester].rejected += 1;
      }
    });

    return Object.entries(requesterMap)
      .map(([requester, data]) => ({
        name: requester,
        total: data.total,
        aprovadas: data.approved,
        reprovadas: data.rejected,
        totalDias: data.totalDays,
        setores: Array.from(data.sectors).length,
        taxaAprovacao: data.total > 0 ? ((data.approved / data.total) * 100).toFixed(1) : '0',
        mediaDiasPorSolicitacao: data.total > 0 ? (data.totalDays / data.total).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRequests]);

  const topRequesters = requesterAnalysis.slice(0, 10);

  const totalRequesters = requesterAnalysis.length;
  const totalRequests = filteredRequests.length;
  const averageRequestsPerRequester = totalRequesters > 0
    ? (totalRequests / totalRequesters).toFixed(1)
    : '0';

  // Se não houver dados, mostrar mensagem
  if (requesterAnalysis.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
          <User className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-400 font-medium">
            Nenhum dado de solicitante encontrado para o período selecionado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Solicitantes</span>
            <User className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRequesters}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Solicitações</span>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRequests}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Média por Solicitante</span>
            <CheckCircle2 className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{averageRequestsPerRequester}</div>
        </div>
      </div>

      {/* Gráfico Top 10 */}
      {topRequesters.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Solicitantes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topRequesters}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="aprovadas" fill="#10b981" name="Aprovadas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela Detalhada */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Análise Detalhada por Solicitante</h3>
        </div>
        <div className="overflow-x-auto">
          {requesterAnalysis.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Solicitante</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aprovadas</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reprovadas</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Taxa Aprovação</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total Dias</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Média Dias/Solicitação</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requesterAnalysis.map((requester, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{requester.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-bold">{requester.total}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-bold">{requester.aprovadas}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-bold">{requester.reprovadas}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{requester.taxaAprovacao}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{requester.totalDias}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{requester.mediaDiasPorSolicitacao}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{requester.setores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">
              Nenhum solicitante encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequesterReport;
