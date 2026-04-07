import { filterBySector } from '../components/ExportFormatModal';
import {
  hoursWorkedDisplayForTimeRecord,
  effectiveValorHoraRecibo,
  valorDiaReciboLike,
} from './excelService';
import { toDateOnlyString } from '../utils/date';
import type { ExtraRequest, WorkDay } from '../types';

function hasCompletePortariaTimes(tr?: {
  arrival?: string;
  breakStart?: string;
  breakEnd?: string;
  departure?: string;
}): boolean {
  return !!(tr?.arrival && tr?.breakStart && tr?.breakEnd && tr?.departure);
}

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

export function buildPreviewRows(
  requests: ExtraRequest[],
  startDate?: string,
  endDate?: string,
  sector?: string
): SheetsPreviewRow[] {
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
