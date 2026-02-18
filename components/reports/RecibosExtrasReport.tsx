import React, { useMemo, useState } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { generateBulkRecibosPDF } from '../../services/pdfService';
import { exportBulkRecibosExcel } from '../../services/excelService';
import ExportFormatModal from '../ExportFormatModal';
import { FileText, Download, Calendar } from 'lucide-react';
import { formatDateBR } from '../../utils/date';
import type { ExtraRequest, WorkDay } from '../../types';

/** Agrupa solicitações por nome do extra e retorna uma lista com um "request" por extra, com todos os workDays consolidados e ordenados por data. */
function consolidateRequestsByExtra(requests: ExtraRequest[]): ExtraRequest[] {
  const byKey = new Map<string, ExtraRequest[]>();
  for (const r of requests) {
    const key = (r.extraName || '').trim().toLowerCase();
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }
  const result: ExtraRequest[] = [];
  for (const [, list] of byKey) {
    const first = list[0];
    const allWorkDays: WorkDay[] = [];
    for (const req of list) {
      for (const wd of req.workDays) {
        allWorkDays.push({ date: wd.date, shift: wd.shift, timeRecord: wd.timeRecord ? { ...wd.timeRecord } : undefined });
      }
    }
    allWorkDays.sort((a, b) => a.date.localeCompare(b.date));
    result.push({
      ...first,
      id: `${first.id}-agrupado`,
      code: `${first.code} (agrupado)`,
      workDays: allWorkDays,
    });
  }
  return result.sort((a, b) => (a.extraName || '').localeCompare(b.extraName || '', 'pt-BR'));
}

type PeriodPreset = '7' | '30' | '60' | '90' | '365' | 'custom';

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
  { value: '365', label: '1 ano' },
  { value: 'custom', label: 'Data personalizada' },
];

function getDateRange(preset: PeriodPreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  if (preset === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  const days = preset === 'custom' ? 30 : parseInt(preset, 10);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().slice(0, 10);
  return { start, end };
}

interface RecibosExtrasReportProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const RecibosExtrasReport: React.FC<RecibosExtrasReportProps> = ({ startDate: propsStart, endDate: propsEnd }) => {
  const { requests } = useExtras();
  const [period, setPeriod] = useState<PeriodPreset>('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const { start, end } = useMemo(() => {
    if (period === 'custom' && propsStart && propsEnd) {
      return { start: propsStart, end: propsEnd };
    }
    return getDateRange(period, customStart || undefined, customEnd || undefined);
  }, [period, customStart, customEnd, propsStart, propsEnd]);

  // Lista apenas por período; o filtro de setor (VIVAZ/AQUAMANIA) é aplicado só no modal "Baixar Recibos"
  const filteredRequests = useMemo(() => {
    if (period === 'custom' && (!customStart || !customEnd) && !propsStart && !propsEnd) return [];
    return requests.filter(req => {
      if (req.status !== 'APROVADO') return false;
      const startD = new Date(start);
      const endD = new Date(end);
      const hasWorkDayInRange = req.workDays.some(day => {
        const dayDate = new Date(day.date);
        return dayDate >= startD && dayDate <= endD;
      });
      return hasWorkDayInRange;
    });
  }, [requests, start, end, period, customStart, customEnd, propsStart, propsEnd]);

  const handleGenerate = () => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    setShowExportModal(true);
  };

  const handleExportFormat = (
    format: 'pdf' | 'excel',
    sectorFilter?: string,
    listOptions?: { groupByExtra?: boolean }
  ) => {
    let list = filteredRequests;
    if (sectorFilter === 'VIVAZ') {
      list = filteredRequests.filter(r => r.sector.toLowerCase() !== 'aquamania');
    } else if (sectorFilter === 'AQUAMANIA') {
      list = filteredRequests.filter(r => r.sector.toLowerCase() === 'aquamania');
    }
    if (listOptions?.groupByExtra && list.length > 0) {
      list = consolidateRequestsByExtra(list);
    }
    list = [...list].sort(
      (a, b) =>
        (a.extraName || '').localeCompare(b.extraName || '', 'pt-BR') ||
        (a.code || '').localeCompare(b.code || '')
    );
    const sectorSuffix = sectorFilter ? `-${sectorFilter.replace(/\s+/g, '-')}` : '';
    const groupSuffix = listOptions?.groupByExtra ? '-agrupado' : '';
    const filename = `recibos-pagamento-${start}-${end}${sectorSuffix}${groupSuffix}`;
    if (format === 'pdf') {
      generateBulkRecibosPDF(list, `${filename}.pdf`);
    } else {
      exportBulkRecibosExcel(list, `${filename}.xlsx`);
    }
    setShowExportModal(false);
  };

  const canGenerate = period !== 'custom' || (customStart && customEnd);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${period === opt.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inicial</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data final</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={20} className="text-emerald-600" />
            <span className="text-sm">
              {period === 'custom' && customStart && customEnd
                ? `${formatDateBR(customStart)} a ${formatDateBR(customEnd)}`
                : `${formatDateBR(start)} a ${formatDateBR(end)}`
              }
            </span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">
            <strong>{filteredRequests.length}</strong> solicitações aprovadas no período
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || filteredRequests.length === 0}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={20} />
          Baixar Recibos de Pagamento
        </button>
      </div>

      {showExportModal && (
        <ExportFormatModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportFormat}
          type="bulk"
        />
      )}

      {filteredRequests.length === 0 && (
        <p className="text-gray-500 text-sm">
          Nenhuma solicitação aprovada no período. Ajuste o período ou aguarde aprovações.
        </p>
      )}

      {filteredRequests.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText size={18} />
              Solicitações incluídas na exportação
            </h3>
          </div>
          <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {filteredRequests.map(req => (
              <li key={req.id} className="px-4 py-2 text-sm text-gray-600 flex justify-between">
                <span>{req.code} – {req.extraName}</span>
                <span className="text-gray-400">{req.workDays.length} dia(s)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RecibosExtrasReport;
