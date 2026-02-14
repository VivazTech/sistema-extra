
import React, { useMemo } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector } from '../ExportFormatModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileWarning, AlertCircle, Camera, Clock } from 'lucide-react';
import { formatDateBR } from '../../utils/date';

interface IncompleteRecordsReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const IncompleteRecordsReport: React.FC<IncompleteRecordsReportProps> = ({ startDate, endDate, sector }) => {
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

  // Analisar registros incompletos
  const incompleteRecords = useMemo(() => {
    const records: Array<{
      extraName: string;
      date: string;
      sector: string;
      missingFields: string[];
      hasPhoto: boolean;
      hasAllTimes: boolean;
    }> = [];

    filteredRequests
      .filter(r => r.status === 'APROVADO')
      .forEach(req => {
        req.workDays.forEach(day => {
          const missing: string[] = [];
          const timeRecord = day.timeRecord;

          if (!timeRecord) {
            missing.push('Todos os horários');
          } else {
            if (!timeRecord.arrival) missing.push('Chegada');
            if (!timeRecord.breakStart) missing.push('Saída Intervalo');
            if (!timeRecord.breakEnd) missing.push('Volta Intervalo');
            if (!timeRecord.departure) missing.push('Saída Final');
          }

          if (!timeRecord?.photoUrl) {
            missing.push('Foto/Assinatura');
          }

          if (missing.length > 0) {
            records.push({
              extraName: req.extraName,
              date: day.date,
              sector: req.sector,
              missingFields: missing,
              hasPhoto: !!timeRecord?.photoUrl,
              hasAllTimes: !!(timeRecord?.arrival && timeRecord?.departure && 
                            timeRecord?.breakStart && timeRecord?.breakEnd)
            });
          }
        });
      });

    return records;
  }, [filteredRequests]);

  // Estatísticas
  const totalIncomplete = incompleteRecords.length;
  const withoutPhoto = incompleteRecords.filter(r => !r.hasPhoto).length;
  const withoutTimes = incompleteRecords.filter(r => !r.hasAllTimes).length;

  // Por setor
  const bySector = useMemo(() => {
    const sectorMap: { [key: string]: number } = {};
    incompleteRecords.forEach(record => {
      sectorMap[record.sector] = (sectorMap[record.sector] || 0) + 1;
    });
    return Object.entries(sectorMap).map(([sector, count]) => ({
      setor: sector,
      quantidade: count
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [incompleteRecords]);

  // Por tipo de campo faltante
  const byMissingField = useMemo(() => {
    const fieldMap: { [key: string]: number } = {};
    incompleteRecords.forEach(record => {
      record.missingFields.forEach(field => {
        fieldMap[field] = (fieldMap[field] || 0) + 1;
      });
    });
    return Object.entries(fieldMap).map(([field, count]) => ({
      campo: field,
      quantidade: count
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [incompleteRecords]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Registros Incompletos</span>
            <FileWarning className="text-red-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalIncomplete}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Sem Foto/Assinatura</span>
            <Camera className="text-amber-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{withoutPhoto}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Sem Horários Completos</span>
            <Clock className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{withoutTimes}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Setor */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Registros Incompletos por Setor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bySector}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="setor" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por Campo Faltante */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Campos Faltantes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byMissingField}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="campo" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista Detalhada */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Detalhamento de Registros Incompletos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Extra</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Campos Faltantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incompleteRecords.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.extraName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateBR(record.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.sector}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {record.missingFields.map((field, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
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

export default IncompleteRecordsReport;
