
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector } from '../ExportFormatModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserCheck, Star, TrendingUp } from 'lucide-react';
import { formatDateBR } from '../../utils/date';

interface PerformanceReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const PerformanceReport: React.FC<PerformanceReportProps> = ({ startDate, endDate, sector }) => {
  const { requests } = useExtras();

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

  // Performance por extra
  const extraPerformance = useMemo(() => {
    const extraMap: { 
      [key: string]: { 
        totalDays: number; 
        absences: number; 
        lateArrivals: number;
        sectors: Set<string>;
        lastWorkDate: string;
      } 
    } = {};

    filteredRequests
      .filter(r => r.status === 'APROVADO')
      .forEach(req => {
        if (!extraMap[req.extraName]) {
          extraMap[req.extraName] = {
            totalDays: 0,
            absences: 0,
            lateArrivals: 0,
            sectors: new Set(),
            lastWorkDate: ''
          };
        }

        extraMap[req.extraName].totalDays += req.workDays.length;
        extraMap[req.extraName].sectors.add(req.sector);

        // Verificar faltas
        if (req.observations?.toLowerCase().includes('faltou')) {
          extraMap[req.extraName].absences += 1;
        }

        // Verificar atrasos
        req.workDays.forEach(day => {
          if (day.timeRecord?.arrival) {
            const [hour, min] = day.timeRecord.arrival.split(':').map(Number);
            if (hour > 8 || (hour === 8 && min > 0)) {
              extraMap[req.extraName].lateArrivals += 1;
            }
          }
          if (day.date > extraMap[req.extraName].lastWorkDate) {
            extraMap[req.extraName].lastWorkDate = day.date;
          }
        });
      });

    return Object.entries(extraMap)
      .map(([name, data]) => {
        const reliability = data.totalDays > 0
          ? (((data.totalDays - data.absences) / data.totalDays) * 100).toFixed(1)
          : '100';
        
        return {
          name,
          totalDias: data.totalDays,
          faltas: data.absences,
          atrasos: data.lateArrivals,
          setores: Array.from(data.sectors).join(', '),
          confiabilidade: parseFloat(reliability),
          ultimoTrabalho: data.lastWorkDate
        };
      })
      .sort((a, b) => b.totalDias - a.totalDias)
      .slice(0, 20);
  }, [filteredRequests]);

  // Extras mais utilizados
  const topExtras = extraPerformance.slice(0, 10);

  // Estatísticas gerais
  const totalExtras = extraPerformance.length;
  const totalDays = extraPerformance.reduce((sum, e) => sum + e.totalDias, 0);
  const totalAbsences = extraPerformance.reduce((sum, e) => sum + e.faltas, 0);
  const averageReliability = totalExtras > 0
    ? (extraPerformance.reduce((sum, e) => sum + e.confiabilidade, 0) / totalExtras).toFixed(1)
    : '100';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Extras</span>
            <UserCheck className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalExtras}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Dias</span>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalDays}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Confiabilidade Média</span>
            <Star className="text-yellow-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{averageReliability}%</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Faltas</span>
            <TrendingUp className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalAbsences}</div>
        </div>
      </div>

      {/* Gráfico Top 10 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Extras Mais Utilizados</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topExtras}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalDias" fill="#3b82f6" name="Dias Trabalhados" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Performance */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Performance Detalhada dos Extras</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total Dias</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Faltas</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Atrasos</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Confiabilidade</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setores</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Último Trabalho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {extraPerformance.map((extra, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{extra.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-bold">{extra.totalDias}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${
                    extra.faltas > 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {extra.faltas}
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold ${
                    extra.atrasos > 0 ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    {extra.atrasos}
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold ${
                    extra.confiabilidade >= 95 ? 'text-emerald-600' :
                    extra.confiabilidade >= 80 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {extra.confiabilidade}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{extra.setores}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {extra.ultimoTrabalho ? formatDateBR(extra.ultimoTrabalho) : 'N/A'}
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

export default PerformanceReport;
