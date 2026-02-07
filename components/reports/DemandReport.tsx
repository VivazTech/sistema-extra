
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Calendar } from 'lucide-react';

interface DemandReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const DemandReport: React.FC<DemandReportProps> = ({ startDate, endDate, sector }) => {
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

  // Demanda por setor
  const sectorDemand = useMemo(() => {
    const sectorMap: { [key: string]: { requests: number; days: number; approved: number } } = {};
    
    filteredRequests.forEach(req => {
      if (!sectorMap[req.sector]) {
        sectorMap[req.sector] = { requests: 0, days: 0, approved: 0 };
      }
      sectorMap[req.sector].requests += 1;
      sectorMap[req.sector].days += req.workDays.length;
      if (req.status === 'APROVADO') {
        sectorMap[req.sector].approved += 1;
      }
    });

    return Object.entries(sectorMap)
      .map(([sector, data]) => ({
        name: sector,
        solicitacoes: data.requests,
        dias: data.days,
        aprovadas: data.approved,
        taxaAprovacao: data.requests > 0 ? ((data.approved / data.requests) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.solicitacoes - a.solicitacoes);
  }, [filteredRequests]);

  // Funções mais demandadas
  const roleDemand = useMemo(() => {
    const roleMap: { [key: string]: number } = {};
    
    filteredRequests.forEach(req => {
      roleMap[req.role] = (roleMap[req.role] || 0) + 1;
    });

    return Object.entries(roleMap)
      .map(([role, count]) => ({ name: role, quantidade: count }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [filteredRequests]);

  // Demanda mensal
  const monthlyDemand = useMemo(() => {
    const months: { [key: string]: number } = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months[monthKey] = 0;
    }

    filteredRequests.forEach(req => {
      req.workDays.forEach(day => {
        const date = new Date(day.date);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (months[monthKey] !== undefined) {
          months[monthKey] += 1;
        }
      });
    });

    return Object.entries(months).map(([month, count]) => ({
      month,
      demanda: count
    }));
  }, [filteredRequests]);

  // Demanda por dia da semana
  const weekdayDemand = useMemo(() => {
    const weekdayMap: { [key: string]: number } = {};
    
    filteredRequests.forEach(req => {
      req.workDays.forEach(day => {
        const date = new Date(day.date);
        const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        weekdayMap[weekday] = (weekdayMap[weekday] || 0) + 1;
      });
    });

    return Object.entries(weekdayMap).map(([day, count]) => ({
      dia: day,
      demanda: count
    }));
  }, [filteredRequests]);

  const totalRequests = filteredRequests.length;
  const totalDays = filteredRequests.reduce((sum, req) => sum + req.workDays.length, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Solicitações</span>
            <Users className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRequests}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Dias</span>
            <Calendar className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalDays}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Setores Ativos</span>
            <TrendingUp className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{sectorDemand.length}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demanda por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Demanda por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorDemand}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="solicitacoes" fill="#3b82f6" name="Solicitações" />
              <Bar dataKey="aprovadas" fill="#10b981" name="Aprovadas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendência Mensal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Tendência Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyDemand}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="demanda" stroke="#3b82f6" name="Demanda" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Demanda por Dia da Semana */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Demanda por Dia da Semana</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weekdayDemand}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="demanda" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detalhamento por Setor */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Detalhamento por Setor</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Solicitações</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sectorDemand.map((sector, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sector.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sector.solicitacoes}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sector.dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Funções */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Top 10 Funções Mais Demandadas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roleDemand.map((role, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-bold">{role.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandReport;
