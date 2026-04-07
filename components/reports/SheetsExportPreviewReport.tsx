import React, { useMemo, useState } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { formatDateBR } from '../../utils/date';
import { Table2, Send, Loader2 } from 'lucide-react';
import { GOOGLE_SHEETS_TARGET_DISPLAY_NAME } from '../../constants';
import { buildPreviewRows } from '../../services/sheetsPreviewRows';
import { pushPreviewRowsToSheets } from '../../services/sheetsPushService';

export type { SheetsPreviewRow } from '../../services/sheetsPreviewRows';
export { buildPreviewRows } from '../../services/sheetsPreviewRows';

interface Props {
  startDate?: string;
  endDate?: string;
  sector?: string;
  /** Quando true, layout compacto para uso dentro de «Recibos de Extras». */
  embedded?: boolean;
}

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const moneyOrDash = (n: number) => (n > 0 ? money(n) : '—');

const SheetsExportPreviewReport: React.FC<Props> = ({ startDate, endDate, sector, embedded }) => {
  const { requests } = useExtras();
  const [sendFlash, setSendFlash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);

  const rows = useMemo(
    () => buildPreviewRows(requests, startDate, endDate, sector),
    [requests, startDate, endDate, sector]
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

  const scrollMaxClass = embedded ? 'max-h-60' : 'max-h-[70vh]';

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Table2 size={18} className="text-emerald-600 shrink-0" />
            {embedded ? 'Prévia para planilha (conferência)' : 'Prévia para planilha (Google Sheets)'}
          </h3>
          {embedded ? (
            <p className="text-xs text-gray-500 mt-1">
              Aprovadas, quatro horários na portaria; valores como no recibo (excelService).
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1 max-w-3xl">
              Somente aprovadas com os quatro horários na portaria. Mesma lógica do recibo Excel.
            </p>
          )}
        </div>
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
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 px-4 py-8 text-center bg-gray-50/30">
          Nenhum registro com horários completos no período e setor selecionados.
        </p>
      ) : (
        <div className={`${scrollMaxClass} overflow-auto`}>
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
  );
};

export default SheetsExportPreviewReport;
