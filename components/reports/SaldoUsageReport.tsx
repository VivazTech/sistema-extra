
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingDown, AlertCircle } from 'lucide-react';

interface SaldoUsageReportProps {
  startDate?: string;
  endDate?: string;
}

const SaldoUsageReport: React.FC<SaldoUsageReportProps> = ({ startDate, endDate }) => {
  const { requests, sectors, extraSaldoRecords, getSaldoForWeek } = useExtras();

  // Calcular saldo utilizado e disponível por setor
  const saldoAnalysis = useMemo(() => {
    return sectors.map(sector => {
      // Buscar registro de saldo mais recente para o setor
      const saldoRecord = extraSaldoRecords
        .filter(r => r.setor === sector.name)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!saldoRecord) {
        return {
          setor: sector.name,
          saldoDisponivel: null,
          saldoUtilizado: 0,
          saldoRestante: null,
          percentualUtilizado: null,
          status: 'no-record'
        };
      }

      // Contar dias trabalhados por extras aprovados neste setor
      const usedDays = requests
        .filter(r => r.sector === sector.name && r.status === 'APROVADO')
        .reduce((sum, req) => sum + req.workDays.length, 0);

      const availableSaldo = getSaldoForWeek(sector.name, new Date().toISOString().split('T')[0]);
      
      if (availableSaldo === 'no-record' || availableSaldo === null) {
        return {
          setor: sector.name,
          saldoDisponivel: null,
          saldoUtilizado: usedDays,
          saldoRestante: null,
          percentualUtilizado: null,
          status: 'no-record'
        };
      }

      const remaining = availableSaldo;
      const total = usedDays + remaining;
      const percentUsed = total > 0 ? ((usedDays / total) * 100).toFixed(1) : '0';

      return {
        setor: sector.name,
        saldoDisponivel: total,
        saldoUtilizado: usedDays,
        saldoRestante: remaining,
        percentualUtilizado: parseFloat(percentUsed),
        status: remaining < 0 ? 'negative' : remaining < 10 ? 'low' : 'ok'
      };
    }).filter(s => s.saldoDisponivel !== null);
  }, [sectors, requests, extraSaldoRecords, getSaldoForWeek]);

  // Setores com saldo negativo ou baixo
  const alerts = saldoAnalysis.filter(s => s.status === 'negative' || s.status === 'low');

  // Projeção de saldo (últimos 3 meses)
  const projection = useMemo(() => {
    const months: { [key: string]: { used: number; available: number } } = {};
    const now = new Date();
    
    for (let i = 2; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months[monthKey] = { used: 0, available: 0 };
    }

    sectors.forEach(sector => {
      const saldoRecord = extraSaldoRecords
        .filter(r => r.setor === sector.name)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (saldoRecord) {
        Object.keys(months).forEach(month => {
          const used = requests
            .filter(r => r.sector === sector.name && r.status === 'APROVADO')
            .reduce((sum, req) => {
              const monthRequests = req.workDays.filter(day => {
                const dayDate = new Date(day.date);
                return dayDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) === month;
              }).length;
              return sum + monthRequests;
            }, 0);
          
          months[month].used += used;
          // Simplificação: assumir saldo disponível constante
          months[month].available += saldoRecord.quadroAprovado * 30; // Aproximação
        });
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      utilizado: data.used,
      disponivel: data.available,
      restante: data.available - data.used
    }));
  }, [sectors, extraSaldoRecords, requests]);

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-600" size={20} />
            <h3 className="font-bold text-red-900">Alertas de Saldo</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={idx} className="text-sm text-red-700">
                <strong>{alert.setor}:</strong> Saldo {alert.status === 'negative' ? 'negativo' : 'baixo'} 
                ({alert.saldoRestante} dias restantes)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Setores Monitorados</span>
            <BarChart3 className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{saldoAnalysis.length}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total Utilizado</span>
            <TrendingDown className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {saldoAnalysis.reduce((sum, s) => sum + s.saldoUtilizado, 0)} dias
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total Disponível</span>
            <BarChart3 className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {saldoAnalysis.reduce((sum, s) => sum + (s.saldoDisponivel || 0), 0)} dias
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilização por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Utilização de Saldo por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={saldoAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="setor" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="saldoUtilizado" fill="#3b82f6" name="Utilizado" />
              <Bar dataKey="saldoRestante" fill="#10b981" name="Disponível" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Projeção Mensal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Projeção de Utilização</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="utilizado" stroke="#3b82f6" name="Utilizado" />
              <Line type="monotone" dataKey="disponivel" stroke="#10b981" name="Disponível" />
              <Line type="monotone" dataKey="restante" stroke="#f59e0b" name="Restante" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Detalhamento de Saldo por Setor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Saldo Disponível</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Saldo Utilizado</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Saldo Restante</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">% Utilizado</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {saldoAnalysis.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.setor}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.saldoDisponivel || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.saldoUtilizado}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${
                    item.saldoRestante !== null && item.saldoRestante < 0 
                      ? 'text-red-600' 
                      : item.saldoRestante !== null && item.saldoRestante < 10
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {item.saldoRestante !== null ? item.saldoRestante : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.percentualUtilizado !== null ? `${item.percentualUtilizado}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'negative' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Negativo</span>
                    )}
                    {item.status === 'low' && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Baixo</span>
                    )}
                    {item.status === 'ok' && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">OK</span>
                    )}
                    {item.status === 'no-record' && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">Sem registro</span>
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

export default SaldoUsageReport;
