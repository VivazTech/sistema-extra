import React, { useMemo, useState } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector } from '../ExportFormatModal';
import {
  hoursWorkedDisplayForTimeRecord,
  effectiveValorHoraRecibo,
  valorDiaReciboLike,
} from '../../services/excelService';
import { formatDateBR, toDateOnlyString } from '../../utils/date';
import type { ExtraRequest, WorkDay } from '../../types';
import { Table2, Send } from 'lucide-react';
import { GOOGLE_SHEETS_TARGET_DISPLAY_NAME } from '../../constants';

interface Props {
  startDate?: string;
  endDate?: string;
  sector?: string;
  /** Quando true, layout compacto para uso dentro de «Recibos de Extras». */
  embedded?: boolean;
}

function hasCompletePortariaTimes(tr?: { arrival?: string; breakStart?: string; breakEnd?: string; departure?: string }): boolean {
  return !!(tr?.arrival && tr?.breakStart && tr?.breakEnd && tr?.departure);
}

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const moneyOrDash = (n: number) => (n > 0 ? money(n) : '—');

export type SheetsPreviewRow = {
  requestId: string;
  code: string;
  extraName: string;
  sector: string;
  role: string;
  reason: string;
  workDate: string;
  arrival: string;
  breakStart: string;
  breakEnd: string;
  departure: string;
  /** Valor cadastrado na solicitação (combinado = por dia; por hora = referência da hora). */
  valorCadastrado: number;
  totalHorasDia: string;
  valorHora: number;
  valorPagar: number;
  valueTypeLabel: string;
};

export function buildPreviewRows(requests: ExtraRequest[], startDate?: string, endDate?: string, sector?: string): SheetsPreviewRow[] {
  let list = requests;
  if (startDate || endDate) {
    list = list.filter((req) => {
      const hasWorkDayInRange = req.workDays.some((day) => {
        const d = toDateOnlyString(day.date);
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
      return hasWorkDayInRange;
    });
  }
  if (sector) list = filterBySector(list, sector);

  const rows: SheetsPreviewRow[] = [];

  list
    .filter((r) => r.status === 'APROVADO')
    .forEach((req) => {
      req.workDays.forEach((day: WorkDay, dayIndex: number) => {
        const dStr = toDateOnlyString(day.date) || day.date;
        if (startDate && dStr < startDate) return;
        if (endDate && dStr > endDate) return;
        const tr = day.timeRecord;
        if (!hasCompletePortariaTimes(tr)) return;

        const valorHora = effectiveValorHoraRecibo(req);
        rows.push({
          requestId: req.id,
          code: req.code,
          extraName: req.extraName,
          sector: req.sector,
          role: req.role,
          reason: req.reason,
          workDate: dStr,
          arrival: tr!.arrival!,
          breakStart: tr!.breakStart!,
          breakEnd: tr!.breakEnd!,
          departure: tr!.departure!,
          valorCadastrado: req.value,
          totalHorasDia: hoursWorkedDisplayForTimeRecord(tr),
          valorHora,
          valorPagar: valorDiaReciboLike(req, day, dayIndex),
          valueTypeLabel: req.valueType === 'combinado' ? 'Combinado' : 'Por hora',
        });
      });
    });

  rows.sort((a, b) => {
    const dc = b.workDate.localeCompare(a.workDate);
    if (dc !== 0) return dc;
    return a.extraName.localeCompare(b.extraName, 'pt-BR');
  });

  return rows;
}

const SheetsExportPreviewReport: React.FC<Props> = ({ startDate, endDate, sector, embedded }) => {
  const { requests } = useExtras();
  const [sendFlash, setSendFlash] = useState<string | null>(null);

  const rows = useMemo(
    () => buildPreviewRows(requests, startDate, endDate, sector),
    [requests, startDate, endDate, sector]
  );

  const handleSendClick = () => {
    if (rows.length === 0) {
      window.alert('Não há linhas para enviar. Ajuste filtros ou aguarde registros completos na portaria.');
      return;
    }
    // Integração Google Sheets (webhook) virá depois; payload já espelha o que será enviado.
    console.info('[Sheets preview] payload para envio futuro', rows);
    setSendFlash(`${rows.length} linha(s) preparada(s). Envio à planilha será habilitado na integração.`);
    window.setTimeout(() => setSendFlash(null), 5000);
  };

  return (
    <div className={`w-full max-w-none space-y-4 ${embedded ? 'pt-2' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {embedded ? (
            <>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Table2 className="text-emerald-600 shrink-0" size={20} />
                Prévia para planilha (conferência)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Mesmos critérios do recibo: aprovadas, quatro horários na portaria. Filtro de setor igual ao cabeçalho de Relatórios.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Table2 className="text-emerald-600" size={22} />
                Prévia para planilha (Google Sheets)
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                Somente solicitações <strong>aprovadas</strong> com os quatro horários preenchidos na portaria (entrada, saída/volta do intervalo e saída final).
                Valores e total de horas seguem a mesma lógica do recibo Excel (<code className="text-xs bg-gray-100 px-1 rounded">excelService</code>).
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSendClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Send size={18} />
            Enviar para «{GOOGLE_SHEETS_TARGET_DISPLAY_NAME}»
          </button>
          <span className="text-xs text-gray-500 text-center sm:text-right">{rows.length} linha(s)</span>
          {sendFlash && <p className="text-xs text-emerald-700 font-medium text-center sm:text-right">{sendFlash}</p>}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 border border-dashed border-gray-200 rounded-xl text-center bg-gray-50/50">
          Nenhum registro com horários completos no período e setor selecionados.
        </p>
      ) : (
        <div className="w-full overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
          <table className="w-full min-w-[1200px] text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap">Nome do extra</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Setor</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Função</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Motivo</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Data do trabalho</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Entrada</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Saída intervalo</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Volta intervalo</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Saída final</th>
                <th className="px-3 py-2.5 whitespace-nowrap" title="Valor na solicitação: combinado = por dia; por hora = base da hora">
                  Valor combinado / hora
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">Total horas (dia)</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Valor hora (R$)</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Valor a pagar</th>
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
