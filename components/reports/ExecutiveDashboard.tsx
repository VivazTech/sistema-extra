
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector } from '../ExportFormatModal';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExecutiveDashboardProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ startDate, endDate, sector }) => {
  const { requests, sectors, extraSaldoRecords } = useExtras();

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (startDate || endDate) {
      list = list.filter(req => {
        const hasWorkDayInRange = req.workDays.some(day => {
          const dayDate = new Date(day.date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          return (!start || dayDate >= start) && (!end || dayDate <= end);
        });
        return hasWorkDayInRange;
      });
    }
    if (sector) list = filterBySector(list, sector);
    return list;
  }, [requests, startDate, endDate, sector]);

  // KPIs Principais
  const totalRequests = filteredRequests.length;
  const approvedRequests = filteredRequests.filter(r => r.status === 'APROVADO').length;
  const rejectedRequests = filteredRequests.filter(r => r.status === 'REPROVADO').length;
  const pendingRequests = filteredRequests.filter(r => r.status === 'SOLICITADO').length;

  // Cálculo de custos
  const totalCost = filteredRequests
    .filter(r => r.status === 'APROVADO')
    .reduce((sum, req) => sum + (req.value * req.workDays.length), 0);

  // Faltas (observações que contêm "faltou")
  const absences = filteredRequests.filter(req => 
    req.observations?.toLowerCase().includes('faltou')
  ).length;

  // Taxa de aprovação
  const approvalRate = totalRequests > 0 
    ? ((approvedRequests / totalRequests) * 100).toFixed(1)
    : '0';

  // Dados por setor
  const sectorData = sectors.map(sector => {
    const sectorRequests = filteredRequests.filter(r => r.sector === sector.name);
    const approved = sectorRequests.filter(r => r.status === 'APROVADO').length;
    const cost = sectorRequests
      .filter(r => r.status === 'APROVADO')
      .reduce((sum, req) => sum + (req.value * req.workDays.length), 0);
    
    return {
      name: sector.name,
      total: sectorRequests.length,
      approved,
      cost: cost.toFixed(2)
    };
  }).filter(s => s.total > 0);

  // Dados mensais (últimos 6 meses)
  const monthlyData = useMemo(() => {
    const months: { [key: string]: { requests: number; cost: number } } = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months[monthKey] = { requests: 0, cost: 0 };
    }

    filteredRequests.forEach(req => {
      req.workDays.forEach(day => {
        const date = new Date(day.date);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (months[monthKey]) {
          months[monthKey].requests += 1;
          if (req.status === 'APROVADO') {
            months[monthKey].cost += req.value;
          }
        }
      });
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data
    }));
  }, [filteredRequests]);

  // Status distribution
  const statusData = [
    { name: 'Aprovados', value: approvedRequests, color: '#10b981' },
    { name: 'Solicitados', value: pendingRequests, color: '#f59e0b' },
    { name: 'Reprovados', value: rejectedRequests, color: '#ef4444' },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Solicitações</span>
            <Users className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRequests}</div>
          <div className="text-xs text-gray-400 mt-1">No período selecionado</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Taxa de Aprovação</span>
            <CheckCircle2 className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{approvalRate}%</div>
          <div className="text-xs text-gray-400 mt-1">{approvedRequests} aprovadas</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Custo Total</span>
            <DollarSign className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">Extras aprovados</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Faltas Registradas</span>
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{absences}</div>
          <div className="text-xs text-gray-400 mt-1">Extras que faltaram</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência Mensal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Tendência Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#3b82f6" name="Solicitações" />
              <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" name="Custo (R$)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição de Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance por Setor */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Performance por Setor</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sectorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="total" fill="#3b82f6" name="Total Solicitações" />
            <Bar yAxisId="left" dataKey="approved" fill="#10b981" name="Aprovadas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Resumo por Setor */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Resumo por Setor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aprovadas</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Custo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sectorData.map((sector, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{sector.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.total}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.approved}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                    R$ {parseFloat(sector.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default ExecutiveDashboard;
