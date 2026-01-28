
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { formatDateBR } from '../../utils/date';

interface ObservationsReportProps {
  startDate?: string;
  endDate?: string;
}

const ObservationsReport: React.FC<ObservationsReportProps> = ({ startDate, endDate }) => {
  const { requests } = useExtras();

  const filteredRequests = useMemo(() => {
    if (!startDate && !endDate) return requests;
    return requests.filter(req => {
      const hasWorkDayInRange = req.workDays.some(day => {
        const dayDate = new Date(day.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        return (!start || dayDate >= start) && (!end || dayDate <= end);
      });
      return hasWorkDayInRange;
    });
  }, [requests, startDate, endDate]);

  // Extrair todas as observações
  const observations = useMemo(() => {
    const obsList: Array<{
      extraName: string;
      date: string;
      sector: string;
      observation: string;
      type: string;
    }> = [];

    filteredRequests.forEach(req => {
      if (req.observations) {
        const lines = req.observations.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          let type = 'Outro';
          if (line.toLowerCase().includes('faltou')) type = 'Falta';
          else if (line.toLowerCase().includes('horário não informado')) type = 'Horário Não Informado';
          else if (line.toLowerCase().includes('portaria')) type = 'Portaria';
          
          const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}/);
          const date = dateMatch ? dateMatch[0] : req.workDays[0]?.date || '';

          obsList.push({
            extraName: req.extraName,
            date,
            sector: req.sector,
            observation: line.trim(),
            type
          });
        });
      }
    });

    return obsList;
  }, [filteredRequests]);

  // Observações por tipo
  const observationsByType = useMemo(() => {
    const typeMap: { [key: string]: number } = {};
    observations.forEach(obs => {
      typeMap[obs.type] = (typeMap[obs.type] || 0) + 1;
    });
    return Object.entries(typeMap).map(([type, count]) => ({
      tipo: type,
      quantidade: count
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [observations]);

  // Observações por setor
  const observationsBySector = useMemo(() => {
    const sectorMap: { [key: string]: number } = {};
    observations.forEach(obs => {
      sectorMap[obs.sector] = (sectorMap[obs.sector] || 0) + 1;
    });
    return Object.entries(sectorMap).map(([sector, count]) => ({
      setor: sector,
      quantidade: count
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [observations]);

  const totalObservations = observations.length;
  const requestsWithObservations = filteredRequests.filter(r => r.observations).length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Observações</span>
            <FileText className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalObservations}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Solicitações com Observações</span>
            <AlertCircle className="text-amber-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{requestsWithObservations}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Tipos Diferentes</span>
            <TrendingUp className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{observationsByType.length}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Observações por Tipo */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Observações por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={observationsByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Observações por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Observações por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={observationsBySector}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="setor" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista Detalhada */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Detalhamento de Observações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {observations.map((obs, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{obs.extraName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {obs.date ? (obs.date.includes('/') ? obs.date : formatDateBR(obs.date)) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{obs.sector}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      obs.type === 'Falta' ? 'bg-red-100 text-red-700' :
                      obs.type === 'Horário Não Informado' ? 'bg-amber-100 text-amber-700' :
                      obs.type === 'Portaria' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {obs.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{obs.observation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ObservationsReport;
