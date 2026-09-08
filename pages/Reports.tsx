import React, { useState } from 'react';
import { FileText, Timer, Filter, Table2 } from 'lucide-react';
import { SECTOR_FILTER_OPTIONS } from '../components/ExportFormatModal';
import { DatabaseLoading } from '../components/LoadingLottie';

const RecibosExtrasReport = React.lazy(() => import('../components/reports/RecibosExtrasReport'));
const SheetsExportPreviewReport = React.lazy(() => import('../components/reports/SheetsExportPreviewReport'));
const PjHoursReport = React.lazy(() => import('../components/reports/PjHoursReport'));

const Reports: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<string>('VIVAZ');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500">Recibos de extras e ponto da Portaria PJ</p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Filter size={18} className="text-gray-400 shrink-0" />
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            title="Filtrar por agrupamento de setor"
          >
            {SECTOR_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-5 pb-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-emerald-600" />
            Recibos de Extras
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Prévia do período e download dos recibos de pagamento em PDF ou Excel.
          </p>
        </div>
        <div className="p-6">
          <React.Suspense fallback={<DatabaseLoading message="Carregando recibos…" minHeight="min-h-[24vh]" />}>
            <RecibosExtrasReport />
          </React.Suspense>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-5 pb-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Table2 size={20} className="text-emerald-600" />
            Prévia para planilha (conferência)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Aprovadas, quatro horários na portaria; valores como no recibo (excelService).
          </p>
        </div>
        <div className="p-6">
          <React.Suspense fallback={<DatabaseLoading message="Carregando prévia…" minHeight="min-h-[24vh]" />}>
            <SheetsExportPreviewReport hideHeader sector={selectedSector || undefined} />
          </React.Suspense>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-5 pb-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Timer size={20} className="text-emerald-600" />
            Relatório Portaria PJ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Ponto dos funcionários PJ: nome, setor/função, horários, total do dia e total de horas no período.
          </p>
        </div>
        <div className="p-6">
          <React.Suspense fallback={<DatabaseLoading message="Carregando ponto PJ…" minHeight="min-h-[24vh]" />}>
            <PjHoursReport sector={selectedSector || undefined} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};

export default Reports;
