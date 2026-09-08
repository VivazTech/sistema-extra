import React, { useMemo, useState } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { formatDateBR, todayDateString, toDateOnlyString } from '../../utils/date';
import { Table2, Send, Loader2, Calendar } from 'lucide-react';
import { GOOGLE_SHEETS_TARGET_DISPLAY_NAME } from '../../constants';
import { buildPreviewRows } from '../../services/sheetsPreviewRows';
import { pushPreviewRowsToSheets } from '../../services/sheetsPushService';

export type { SheetsPreviewRow } from '../../services/sheetsPreviewRows';
export { buildPreviewRows } from '../../services/sheetsPreviewRows';

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
  /** Oculta título interno quando o card da página já tem título e subtítulo. */
  hideHeader?: boolean;
}

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const moneyOrDash = (n: number) => (n > 0 ? money(n) : '—');

const SheetsExportPreviewReport: React.FC<Props> = ({ startDate: propsStart, endDate: propsEnd, sector, hideHeader }) => {
  const { requests } = useExtras();
  const [period, setPeriod] = useState<PeriodPreset>('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sendFlash, setSendFlash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);

  const { start, end } = useMemo(() => {
    if (period === 'custom' && propsStart && propsEnd) {
      return { start: propsStart, end: propsEnd };
    }
    return getDateRange(period, customStart || undefined, customEnd || undefined);
  }, [period, customStart, customEnd, propsStart, propsEnd]);

  const startKey = toDateOnlyString(start) || start;
  const endKey = toDateOnlyString(end) || end;

  const rows = useMemo(
    () => buildPreviewRows(requests, startKey, endKey, sector),
    [requests, startKey, endKey, sector]
  );

  const handleSendClick = async () => {
    if (rows.length === 0) {
      window.alert('Não há linhas para enviar. Ajuste filtros ou aguarde registros completos na portaria.');
      return;
    }
    setSendError(null);
    setSendFlash(null);
    setSendLoading(true);
    const result = await pushPreviewRowsToSheets(rows);
    setSendLoading(false);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    setSendFlash(`${result.appended} linha(s) enviada(s) para «${GOOGLE_SHEETS_TARGET_DISPLAY_NAME}».`);
    window.setTimeout(() => setSendFlash(null), 8000);
  };

  const toolbar = (
    <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0 w-full sm:w-auto">
      <button
        type="button"
        onClick={() => void handleSendClick()}
        disabled={sendLoading || rows.length === 0}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sendLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        {sendLoading ? 'Enviando…' : `Enviar para «${GOOGLE_SHEETS_TARGET_DISPLAY_NAME}»`}
      </button>
      <span className="text-xs text-gray-500 text-center sm:text-right">{rows.length} linha(s)</span>
      {sendError && (
        <p className="text-xs text-red-600 font-medium text-center sm:text-right max-w-md">{sendError}</p>
      )}
      {sendFlash && !sendError && (
        <p className="text-xs text-emerald-700 font-medium text-center sm:text-right">{sendFlash}</p>
      )}
    </div>
  );

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
            <strong>{rows.length}</strong> linha(s) com horários completos no período
          </span>
        </div>
      </div>

      <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {!hideHeader && (
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Table2 size={18} className="text-emerald-600 shrink-0" />
                Prévia para planilha (Google Sheets)
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-3xl">
                Somente aprovadas com os quatro horários na portaria. Mesma lógica do recibo Excel.
              </p>
            </div>
          )}
          {hideHeader ? <div className="min-w-0 sm:ml-auto" /> : null}
          {toolbar}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 px-4 py-8 text-center bg-gray-50/30">
            Nenhum registro com horários completos no período e setor selecionados.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1200px] text-sm text-left">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wide shadow-[inset_0_-1px_0_0_rgb(229_231_235)]">
                <tr>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Nome do extra</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Setor</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Função</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Motivo</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Data do trabalho</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Entrada</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Saída intervalo</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Volta intervalo</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Saída final</th>
                  <th
                    className="px-3 py-2.5 whitespace-nowrap bg-gray-50"
                    title="Valor na solicitação: combinado = por dia; por hora = base da hora"
                  >
                    Valor combinado / hora
                  </th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Total horas (dia)</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Valor hora (R$)</th>
                  <th className="px-3 py-2.5 whitespace-nowrap bg-gray-50">Valor a pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={`${r.requestId}-${r.workDate}-${i}`} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.extraName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.sector}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.role}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateBR(r.workDate)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.arrival}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.breakStart}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.breakEnd}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.departure}</td>
                    <td className="px-3 py-2 whitespace-nowrap" title={r.valueTypeLabel}>
                      {money(r.valorCadastrado)}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.totalHorasDia || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{moneyOrDash(r.valorHora)}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-800 whitespace-nowrap">{money(r.valorPagar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SheetsExportPreviewReport;
