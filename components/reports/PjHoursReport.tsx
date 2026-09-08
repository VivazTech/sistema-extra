import React, { useEffect, useMemo, useState } from 'react';
import { Download, Calendar, Timer } from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  formatMinutesWorked,
  formatWorkedHours,
  getPjAbsenceLabel,
  getPjAbsenceType,
  workedMinutes,
} from '../../utils/pjHours';
import { formatDateBR, todayDateString, toDateOnlyString } from '../../utils/date';
import { DatabaseLoading } from '../LoadingLottie';
import { catalogSectorMatchesFilter } from '../ExportFormatModal';
import ExportFormatModal from '../ExportFormatModal';
import { exportPjHoursExcel, exportPjHoursPDF, type PjHoursExportRow } from '../../services/pjHoursExport';

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
  const end = todayDateString();
  if (preset === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  const days = preset === 'custom' ? 30 : parseInt(preset, 10);
  const startDate = new Date(`${end}T12:00:00`);
  startDate.setDate(startDate.getDate() - days);
  const y = startDate.getFullYear();
  const m = String(startDate.getMonth() + 1).padStart(2, '0');
  const d = String(startDate.getDate()).padStart(2, '0');
  return { start: `${y}-${m}-${d}`, end };
}

interface Props {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const PjHoursReport: React.FC<Props> = ({ startDate: propsStart, endDate: propsEnd, sector }) => {
  const [period, setPeriod] = useState<PeriodPreset>('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [rows, setRows] = useState<PjHoursExportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => {
    if (period === 'custom' && propsStart && propsEnd) {
      return { start: propsStart, end: propsEnd };
    }
    return getDateRange(period, customStart || undefined, customEnd || undefined);
  }, [period, customStart, customEnd, propsStart, propsEnd]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pj_time_records')
          .select(
            `
            pj_employee_id,
            work_date,
            arrival,
            break_start,
            break_end,
            departure,
            observations,
            pj_employees (
              name,
              active,
              sectors ( name )
            )
          `
          )
          .order('work_date', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const list: PjHoursExportRow[] = (data || [])
          .filter((r: { pj_employees?: { active?: boolean } }) => r.pj_employees && r.pj_employees.active !== false)
          .map((r: {
            pj_employee_id: string;
            work_date: string;
            arrival: string | null;
            break_start: string | null;
            break_end: string | null;
            departure: string | null;
            observations: string | null;
            pj_employees?: { name?: string; sectors?: { name?: string } };
          }) => ({
            employeeId: r.pj_employee_id,
            work_date: toDateOnlyString(r.work_date) || r.work_date,
            arrival: r.arrival,
            break_start: r.break_start,
            break_end: r.break_end,
            departure: r.departure,
            observations: r.observations || null,
            employee_name: r.pj_employees?.name || '—',
            sector_name: r.pj_employees?.sectors?.name || '—',
          }));

        setRows(list);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (period === 'custom' && (!customStart || !customEnd) && !propsStart && !propsEnd) return [];
    const startKey = toDateOnlyString(start);
    const endKey = toDateOnlyString(end);
    if (!startKey || !endKey) return [];
    return rows.filter((x) => {
      if (x.work_date < startKey || x.work_date > endKey) return false;
      if (sector && !catalogSectorMatchesFilter(x.sector_name, sector)) return false;
      return true;
    });
  }, [rows, start, end, period, customStart, customEnd, propsStart, propsEnd, sector]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dc = b.work_date.localeCompare(a.work_date);
      if (dc !== 0) return dc;
      return a.employee_name.localeCompare(b.employee_name, 'pt-BR');
    });
  }, [filtered]);

  const periodTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of sorted) {
      if (getPjAbsenceType(r.observations)) continue;
      const mins = workedMinutes(
        r.arrival || undefined,
        r.break_start || undefined,
        r.break_end || undefined,
        r.departure || undefined
      );
      if (mins == null) continue;
      map.set(r.employeeId, (map.get(r.employeeId) || 0) + mins);
    }
    return map;
  }, [sorted]);

  const canGenerate = period !== 'custom' || (customStart && customEnd) || !!(propsStart && propsEnd);

  const handleGenerate = () => {
    if (!canGenerate || sorted.length === 0) return;
    setShowExportModal(true);
  };

  const handleExportFormat = (format: 'pdf' | 'excel') => {
    const filename = `ponto-pj-${start}-${end}`;
    if (format === 'pdf') {
      void exportPjHoursPDF(sorted, start, end, `${filename}.pdf`);
    } else {
      exportPjHoursExcel(sorted, start, end, `${filename}.xlsx`);
    }
    setShowExportModal(false);
  };

  if (loading) {
    return <DatabaseLoading message="Carregando registros PJ…" minHeight="min-h-[32vh]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
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
                : `${formatDateBR(start)} a ${formatDateBR(end)}`}
            </span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">
            <strong>{sorted.length}</strong> registro(s) de ponto no período
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || sorted.length === 0}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={20} />
          Baixar Relatório
        </button>
      </div>

      {showExportModal && (
        <ExportFormatModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportFormat}
          type="pj"
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Nenhum registro de ponto PJ no período. Ajuste o período ou o filtro de setor.
        </p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Timer size={18} />
              Prévia do período selecionado
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full min-w-[1100px] text-sm text-left">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600 uppercase text-xs font-bold shadow-[inset_0_-1px_0_0_rgb(229_231_235)]">
                <tr>
                  <th className="px-3 py-2.5 bg-gray-50">Data</th>
                  <th className="px-3 py-2.5 bg-gray-50">Nome</th>
                  <th className="px-3 py-2.5 bg-gray-50">Setor/função</th>
                  <th className="px-3 py-2.5 bg-gray-50">Total de horas trabalhadas</th>
                  <th className="px-3 py-2.5 bg-gray-50">Entrada</th>
                  <th className="px-3 py-2.5 bg-gray-50">Saída intervalo</th>
                  <th className="px-3 py-2.5 bg-gray-50">Volta intervalo</th>
                  <th className="px-3 py-2.5 bg-gray-50">Saída</th>
                  <th className="px-3 py-2.5 bg-gray-50">Total do dia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((r, i) => {
                  const absence = getPjAbsenceType(r.observations);
                  const absenceLabel = getPjAbsenceLabel(r.observations);
                  const periodMins = periodTotals.get(r.employeeId) || 0;
                  return (
                    <tr key={`${r.employeeId}-${r.work_date}-${i}`} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateBR(r.work_date)}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.employee_name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.sector_name}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {periodMins > 0 ? formatMinutesWorked(periodMins) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{absence ? '—' : r.arrival || '—'}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{absence ? '—' : r.break_start || '—'}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{absence ? '—' : r.break_end || '—'}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{absence ? '—' : r.departure || '—'}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-emerald-800 whitespace-nowrap">
                        {absence
                          ? absenceLabel
                          : formatWorkedHours(
                              r.arrival || undefined,
                              r.break_start || undefined,
                              r.break_end || undefined,
                              r.departure || undefined
                            )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PjHoursReport;
