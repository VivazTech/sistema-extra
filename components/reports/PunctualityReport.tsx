
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDateBR } from '../../utils/date';

interface PunctualityReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const PunctualityReport: React.FC<PunctualityReportProps> = ({ startDate, endDate, sector }) => {
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
    if (sector) list = list.filter(r => r.sector === sector);
    return list;
  }, [requests, startDate, endDate, sector]);

  // Analisar registros de ponto
  const timeRecords = useMemo(() => {
    const records: Array<{
      extraName: string;
      date: string;
      sector: string;
      arrival: string;
      departure: string;
      breakStart?: string;
      breakEnd?: string;
      workHours: number;
      isLate: boolean;
      delayMinutes: number;
    }> = [];

    filteredRequests
      .filter(r => r.status === 'APROVADO')
      .forEach(req => {
        req.workDays.forEach(day => {
          if (day.timeRecord?.arrival && day.timeRecord?.departure) {
            const [arrivalHour, arrivalMin] = day.timeRecord.arrival.split(':').map(Number);
            const [departureHour, departureMin] = day.timeRecord.departure.split(':').map(Number);
            
            const arrivalTime = arrivalHour * 60 + arrivalMin;
            const departureTime = departureHour * 60 + departureMin;
            
            // Considerar atraso se chegou depois das 8h (480 minutos)
            const expectedArrival = 8 * 60; // 8:00
            const isLate = arrivalTime > expectedArrival;
            const delayMinutes = isLate ? arrivalTime - expectedArrival : 0;
            
            // Calcular horas trabalhadas
            let workMinutes = departureTime - arrivalTime;
            if (day.timeRecord.breakStart && day.timeRecord.breakEnd) {
              const [breakStartHour, breakStartMin] = day.timeRecord.breakStart.split(':').map(Number);
              const [breakEndHour, breakEndMin] = day.timeRecord.breakEnd.split(':').map(Number);
              const breakStart = breakStartHour * 60 + breakStartMin;
              const breakEnd = breakEndHour * 60 + breakEndMin;
              workMinutes -= (breakEnd - breakStart);
            }
            
            const workHours = workMinutes / 60;

            records.push({
              extraName: req.extraName,
              date: day.date,
              sector: req.sector,
              arrival: day.timeRecord.arrival,
              departure: day.timeRecord.departure,
              breakStart: day.timeRecord.breakStart,
              breakEnd: day.timeRecord.breakEnd,
              workHours: parseFloat(workHours.toFixed(2)),
              isLate,
              delayMinutes
            });
          }
        });
      });

    return records;
  }, [filteredRequests]);

  // Estatísticas
  const totalRecords = timeRecords.length;
  const lateRecords = timeRecords.filter(r => r.isLate).length;
  const onTimeRate = totalRecords > 0 ? (((totalRecords - lateRecords) / totalRecords) * 100).toFixed(1) : '100';
  const averageDelay = lateRecords > 0
    ? (timeRecords.filter(r => r.isLate).reduce((sum, r) => sum + r.delayMinutes, 0) / lateRecords).toFixed(0)
    : '0';
  const averageWorkHours = totalRecords > 0
    ? (timeRecords.reduce((sum, r) => sum + r.workHours, 0) / totalRecords).toFixed(1)
    : '0';

  // Atrasos por setor
  const sectorDelays = useMemo(() => {
    const sectorMap: { [key: string]: { total: number; late: number; totalDelay: number } } = {};
    
    timeRecords.forEach(record => {
      if (!sectorMap[record.sector]) {
        sectorMap[record.sector] = { total: 0, late: 0, totalDelay: 0 };
      }
      sectorMap[record.sector].total += 1;
      if (record.isLate) {
        sectorMap[record.sector].late += 1;
        sectorMap[record.sector].totalDelay += record.delayMinutes;
      }
    });

    return Object.entries(sectorMap).map(([sector, data]) => ({
      name: sector,
      total: data.total,
      atrasos: data.late,
      taxaAtraso: data.total > 0 ? ((data.late / data.total) * 100).toFixed(1) : '0',
      mediaAtraso: data.late > 0 ? (data.totalDelay / data.late).toFixed(0) : '0'
    }));
  }, [timeRecords]);

  // Atrasos por dia da semana
  const weekdayDelays = useMemo(() => {
    const weekdayMap: { [key: string]: { total: number; late: number } } = {};
    
    timeRecords.forEach(record => {
      const date = new Date(record.date);
      const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      if (!weekdayMap[weekday]) {
        weekdayMap[weekday] = { total: 0, late: 0 };
      }
      weekdayMap[weekday].total += 1;
      if (record.isLate) {
        weekdayMap[weekday].late += 1;
      }
    });

    return Object.entries(weekdayMap).map(([day, data]) => ({
      dia: day,
      total: data.total,
      atrasos: data.late,
      taxa: data.total > 0 ? ((data.late / data.total) * 100).toFixed(1) : '0'
    }));
  }, [timeRecords]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total de Registros</span>
            <Clock className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRecords}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Taxa de Pontualidade</span>
            <CheckCircle2 className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{onTimeRate}%</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Atrasos</span>
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{lateRecords}</div>
          <div className="text-xs text-gray-400 mt-1">Média: {averageDelay} min</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Média de Horas</span>
            <Clock className="text-emerald-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{averageWorkHours}h</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atrasos por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Atrasos por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorDelays}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="atrasos" fill="#ef4444" name="Atrasos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taxa de Atraso por Dia da Semana */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Taxa de Atraso por Dia da Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weekdayDelays}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="taxa" stroke="#ef4444" name="Taxa de Atraso (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Atrasos por Setor */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Análise de Pontualidade por Setor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Atrasos</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Taxa de Atraso</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Média de Atraso (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sectorDelays.map((sector, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{sector.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.total}</td>
                  <td className="px-6 py-4 text-sm text-red-600 font-bold">{sector.atrasos}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.taxaAtraso}%</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sector.mediaAtraso} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registros com Atraso */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Registros com Atraso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chegada</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Atraso</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Horas Trabalhadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timeRecords
                .filter(r => r.isLate)
                .map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.extraName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateBR(record.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.sector}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.arrival}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-bold">{record.delayMinutes} min</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.workHours}h</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PunctualityReport;
