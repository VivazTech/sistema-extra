import React, { useState } from 'react';
import { Calendar, Filter, BarChart3 } from 'lucide-react';
import ReportsOverviewCharts from '../components/reports/ReportsOverviewCharts';
import { SECTOR_FILTER_OPTIONS } from '../components/ExportFormatModal';

const Graficos: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('VIVAZ');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} className="text-emerald-600" />
            Gráficos
          </h1>
          <p className="text-gray-500 mt-1">
            Total gasto, comparação de meses, gasto por setor e indicadores de saldo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              title="Filtrar por setor"
            >
              {SECTOR_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Data inicial"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Data final"
            />
          </div>
        </div>
      </header>

      <ReportsOverviewCharts
        startDate={startDate || undefined}
        endDate={endDate || undefined}
        sector={selectedSector}
      />
    </div>
  );
};

export default Graficos;
