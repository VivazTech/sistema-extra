
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserX, TrendingDown, Calendar } from 'lucide-react';

interface FrequencyReportProps {
  startDate?: string;
  endDate?: string;
}

const FrequencyReport: React.FC<FrequencyReportProps> = ({ startDate, endDate }) => {
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

  // Detectar faltas através de observações
  const absences = useMemo(() => {
    const absenceList: Array<{
      extraName: string;
      date: string;
      sector: string;
      observation: string;
    }> = [];

    filteredRequests.forEach(req => {
      if (req.observations?.toLowerCase().includes('faltou')) {
        const lines = req.observations.split('\n');
        lines.forEach(line => {
          if (line.toLowerCase().includes('faltou')) {
            const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}/);
            if (dateMatch) {
              absenceList.push({
                extraName: req.extraName,
                date: dateMatch[0],
                sector: req.sector,
                observation: line
              });
            }
          }
        });
      }
    });

    return absenceList;
  }, [filteredRequests]);

  // Estatísticas por setor
  const sectorAbsences = useMemo(() => {
    const sectorMap: { [key: string]: number } = {};
    absences.forEach(absence => {
      sectorMap[absence.sector] = (sectorMap[absence.sector] || 0) + 1;
    });
    return Object.entries(sectorMap).map(([sector, count]) => ({
      name: sector,
      faltas: count
    }));
  }, [absences]);

  // Faltas por dia da semana
  const weekdayAbsences = useMemo(() => {
    const weekdayMap: { [key: string]: number } = {};
    absences.forEach(absence => {
      const date = new Date(absence.date.split('/').reverse().join('-'));
      const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      weekdayMap[weekday] = (weekdayMap[weekday] || 0) + 1;
    });
    return Object.entries(weekdayMap).map(([day, count]) => ({
      dia: day,
      faltas: count
    }));
  }, [absences]);

  // Extras com mais faltas
  const extraAbsences = useMemo(() => {
    const extraMap: { [key: string]: number } = {};
    absences.forEach(absence => {
      extraMap[absence.extraName] = (extraMap[absence.extraName] || 0) + 1;
    });
    return Object.entries(extraMap)
      .map(([name, count]) => ({ name, faltas: count }))
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 10);
  }, [absences]);

  // Taxa de comparecimento
  const totalWorkDays = filteredRequests
    .filter(r => r.status === 'APROVADO')
    .reduce((sum, req) => sum + req.workDays.length, 0);
  
  const attendanceRate = totalWorkDays > 0
    ? (((totalWorkDays - absences.length) / totalWorkDays) * 100).toFixed(1)
    : '100';

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Faltas</span>
            <UserX className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{absences.length}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Taxa de Comparecimento</span>
            <TrendingDown className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{attendanceRate}%</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Dias Trabalhados</span>
            <Calendar className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalWorkDays}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faltas por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Faltas por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorAbsences}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="faltas" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Faltas por Dia da Semana */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Faltas por Dia da Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={weekdayAbsences}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ dia, faltas }) => `${dia}: ${faltas}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="faltas"
              >
                {weekdayAbsences.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Extras com Mais Faltas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Extras com Mais Faltas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Faltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {extraAbsences.map((extra, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{extra.name}</td>
                  <td className="px-6 py-4 text-sm text-red-600 font-bold">{extra.faltas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista Detalhada de Faltas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Detalhamento de Faltas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {absences.map((absence, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{absence.extraName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{absence.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{absence.sector}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{absence.observation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FrequencyReport;
