import React, { Suspense, useState } from 'react';
import { Calendar, Filter, BarChart3 } from 'lucide-react';
import { SECTOR_FILTER_OPTIONS } from '../components/ExportFormatModal';
import { useExtras } from '../context/ExtraContext';
import { DatabaseLoading } from '../components/LoadingLottie';

const ReportsOverviewCharts = React.lazy(() => import('../components/reports/ReportsOverviewCharts'));

const Graficos: React.FC = () => {
  const { events } = useExtras();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('VIVAZ');
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} className="text-emerald-600" />
            Gráficos
          </h1>
          <p className="text-gray-500 mt-1">
            Total gasto, comparação de meses, gasto por setor e indicadores de saldo
          </p>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <Filter size={18} className="text-gray-400 shrink-0" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              title="Filtrar por setor"
            >
              {SECTOR_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              title="Filtrar por evento"
            >
              <option value="">Todos os eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.name}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <Calendar size={18} className="text-gray-400 shrink-0" />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full min-w-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Data inicial"
              />
              <span className="text-gray-400 shrink-0 text-sm">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Data final"
              />
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<DatabaseLoading message="Carregando gráficos..." minHeight="min-h-[40vh]" />}>
        <ReportsOverviewCharts
          startDate={startDate || undefined}
          endDate={endDate || undefined}
          sector={selectedSector}
          event={selectedEvent || undefined}
        />
      </Suspense>
    </div>
  );
};

export default Graficos;
