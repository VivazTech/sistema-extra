
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

interface FinancialReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const FinancialReport: React.FC<FinancialReportProps> = ({ startDate, endDate, sector }) => {
  const { requests, sectors } = useExtras();

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
    if (sector) list = list.filter(r => r.sector === sector);
    return list;
  }, [requests, startDate, endDate, sector]);

  // Cálculo de custos
  const approvedRequests = filteredRequests.filter(r => r.status === 'APROVADO');
  
  const totalCost = approvedRequests.reduce((sum, req) => {
    return sum + (req.value * req.workDays.length);
  }, 0);

  // Custo por setor
  const sectorCosts = useMemo(() => {
    const sectorMap: { [key: string]: { cost: number; days: number; requests: number } } = {};
    
    approvedRequests.forEach(req => {
      if (!sectorMap[req.sector]) {
        sectorMap[req.sector] = { cost: 0, days: 0, requests: 0 };
      }
      const cost = req.value * req.workDays.length;
      sectorMap[req.sector].cost += cost;
      sectorMap[req.sector].days += req.workDays.length;
      sectorMap[req.sector].requests += 1;
    });

    return Object.entries(sectorMap).map(([sector, data]) => ({
      name: sector,
      custo: parseFloat(data.cost.toFixed(2)),
      dias: data.days,
      solicitacoes: data.requests,
      mediaPorDia: data.days > 0 ? parseFloat((data.cost / data.days).toFixed(2)) : 0
    })).sort((a, b) => b.custo - a.custo);
  }, [approvedRequests]);

  // Custo mensal
  const monthlyCosts = useMemo(() => {
    const months: { [key: string]: { cost: number; requests: number } } = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months[monthKey] = { cost: 0, requests: 0 };
    }

    approvedRequests.forEach(req => {
      req.workDays.forEach(day => {
        const date = new Date(day.date);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (months[monthKey]) {
          months[monthKey].cost += req.value;
          months[monthKey].requests += 1;
        }
      });
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      custo: parseFloat(data.cost.toFixed(2)),
      solicitacoes: data.requests
    }));
  }, [approvedRequests]);

  // Custo por função
  const roleCosts = useMemo(() => {
    const roleMap: { [key: string]: number } = {};
    
    approvedRequests.forEach(req => {
      const cost = req.value * req.workDays.length;
      roleMap[req.role] = (roleMap[req.role] || 0) + cost;
    });

    return Object.entries(roleMap)
      .map(([role, cost]) => ({ name: role, custo: parseFloat(cost.toFixed(2)) }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 10);
  }, [approvedRequests]);

  const totalDays = approvedRequests.reduce((sum, req) => sum + req.workDays.length, 0);
  const averageCostPerDay = totalDays > 0 ? (totalCost / totalDays).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Custo Total</span>
            <DollarSign className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Dias</span>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalDays}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Média por Dia</span>
            <PieChartIcon className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">R$ {averageCostPerDay}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Solicitações Aprovadas</span>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{approvedRequests.length}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência Mensal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Tendência de Custos Mensais</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyCosts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              <Legend />
              <Line type="monotone" dataKey="custo" stroke="#10b981" name="Custo (R$)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Custo por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Custo por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorCosts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              <Bar dataKey="custo" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Custos por Setor */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Detalhamento de Custos por Setor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Custo Total</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dias</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Solicitações</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Média por Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sectorCosts.map((sector, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{sector.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                    R$ {sector.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.dias}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.solicitacoes}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    R$ {sector.mediaPorDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Funções por Custo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Top 10 Funções por Custo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Função</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Custo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleCosts.map((role, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                    R$ {role.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default FinancialReport;
