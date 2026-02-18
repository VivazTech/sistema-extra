import * as XLSX from 'xlsx';
import { ExtraRequest, TimeRecord, WorkDay } from '../types';
import { formatDateBR } from '../utils/date';
import { roundMoney } from '../utils/round';

const HORAS_JORNADA_PADRAO = 7 + 20 / 60;

function timeToMinutes(t?: string): number | null {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Se saída < entrada (ex.: 00:02 vs 15:50), turno passou da meia-noite: considera saída no dia seguinte (+24h). */
function effectiveDepartureMinutes(arrivalMin: number, departureMin: number): number {
  return departureMin >= arrivalMin ? departureMin : departureMin + 24 * 60;
}

function minutesWorkedInDay(tr?: TimeRecord): number {
  if (!tr?.arrival || !tr?.departure) return 0;
  const arrival = timeToMinutes(tr.arrival);
  const departure = timeToMinutes(tr.departure);
  if (arrival == null || departure == null) return 0;
  const departureEffective = effectiveDepartureMinutes(arrival, departure);
  let breakMin = 0;
  if (tr.breakStart && tr.breakEnd) {
    const start = timeToMinutes(tr.breakStart);
    const end = timeToMinutes(tr.breakEnd);
    if (start != null && end != null && end > start) breakMin = end - start;
  }
  return Math.max(0, departureEffective - arrival - breakMin);
}

/** Converte minutos totais em string HH:MM (ex.: 426 → "07:06"). */
function minutesToHHMM(totalMin: number): string {
  if (totalMin <= 0) return '';
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hoursWorkedInDay(tr?: TimeRecord): string {
  const totalMin = minutesWorkedInDay(tr);
  return minutesToHHMM(totalMin);
}

function totalHoursWorked(workDays: WorkDay[]): string {
  let totalMin = 0;
  for (const day of workDays) {
    const tr = day.timeRecord;
    if (!tr?.arrival || !tr?.departure) continue;
    const arrival = timeToMinutes(tr.arrival);
    const departure = timeToMinutes(tr.departure);
    if (arrival == null || departure == null) continue;
    const departureEffective = effectiveDepartureMinutes(arrival, departure);
    let breakMin = 0;
    if (tr.breakStart && tr.breakEnd) {
      const start = timeToMinutes(tr.breakStart);
      const end = timeToMinutes(tr.breakEnd);
      if (start != null && end != null && end > start) breakMin = end - start;
    }
    totalMin += Math.max(0, departureEffective - arrival - breakMin);
  }
  return minutesToHHMM(totalMin);
}

function buildReciboData(request: ExtraRequest): { headers: string[][]; table: (string | number)[][] } {
  const isCombinado = request.valueType === 'combinado';
  const valorHora = isCombinado ? 0 : request.value / HORAS_JORNADA_PADRAO;
  const totalHours = totalHoursWorked(request.workDays);
  const periodStr = request.workDays.length
    ? `${formatDateBR(request.workDays[0].date)} - ${formatDateBR(request.workDays[request.workDays.length - 1].date)}`
    : '';

  const headers: string[][] = [
    ['RECIBO DE PAGAMENTO'],
    [],
    ['Nome', request.extraName, 'Demandante', request.requester],
    ['Setor', request.sector, 'Função', request.role],
    ['Motivo', request.reason, 'Aprovado por', request.approvedBy || 'N/A'],
    ['CPF', request.extraCpf || '', 'Período', periodStr],
  ];

  const tableHeaders = ['Data', 'Horário Chegada', 'Início Intervalo', 'Fim Intervalo', 'Horário Saída', 'Total Horas', 'Valor'];
  const table: (string | number)[][] = [tableHeaders];

  let totalValor = 0;
  for (const day of request.workDays) {
    const tr = day.timeRecord;
    const hours = hoursWorkedInDay(tr);
    const minDay = minutesWorkedInDay(tr);
    const valorDia = isCombinado ? roundMoney(request.value) : roundMoney((minDay / 60) * valorHora);
    totalValor += valorDia;
    table.push([
      formatDateBR(day.date),
      tr?.arrival || '',
      tr?.breakStart || '',
      tr?.breakEnd || '',
      tr?.departure || '',
      hours,
      valorDia > 0 ? valorDia.toFixed(2) : '',
    ]);
  }
  totalValor = roundMoney(totalValor);
  table.push(['TOTAL', '', '', '', '', totalHours, totalValor.toFixed(2)]);

  return { headers, table };
}

/** Exporta um recibo individual para Excel */
export function exportSingleReciboExcel(request: ExtraRequest, filename?: string): void {
  const { headers, table } = buildReciboData(request);
  const wsData = [...headers, [], ...table];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recibo');
  XLSX.writeFile(wb, filename || `recibo-pagamento-${request.code}.xlsx`);
}

/** Calcula o valor total trabalhado (igual ao RECIBO DE PAGAMENTO): valor combinado = valor por dia/turno × dias; por hora = soma por dia das horas efetivas × valor/hora. */
function totalWorkedValue(request: ExtraRequest): number {
  if (request.valueType === 'combinado') return roundMoney(request.value * (request.workDays?.length || 1));
  const valorHora = request.value / HORAS_JORNADA_PADRAO;
  let total = 0;
  for (const day of request.workDays) {
    const minDay = minutesWorkedInDay(day.timeRecord);
    total += roundMoney((minDay / 60) * valorHora);
  }
  return roundMoney(total);
}

/** Exporta listagem para Excel: coluna Setor = todos os setores do extra (ordem alfabética); subtotais por setor no final. */
export function exportListExcel(requests: ExtraRequest[], title: string, filename?: string): void {
  const sectors = [...new Set(requests.map(r => r.sector))].sort((a, b) => a.localeCompare(b));

  const data: (string | number)[][] = [
    ['RELATÓRIO CONTROLE DE EXTRAS'],
    [],
    ['Período', 'Setor', 'Nome Extra', 'Tipo de valor', 'Valor'],
  ];

  const subtotaisPorSetor = new Map<string, number>();
  let totalGeral = 0;
  for (const r of requests) {
    const s = r.sector ?? '';
    if (!s) continue;
    const v = totalWorkedValue(r);
    subtotaisPorSetor.set(s, (subtotaisPorSetor.get(s) ?? 0) + v);
    totalGeral += v;
  }
  for (const s of sectors) {
    subtotaisPorSetor.set(s, roundMoney(subtotaisPorSetor.get(s) ?? 0));
  }
  totalGeral = roundMoney(totalGeral);

  const byExtra = new Map<string, ExtraRequest[]>();
  for (const r of requests) {
    const key = r.extraName ?? '';
    if (!byExtra.has(key)) byExtra.set(key, []);
    byExtra.get(key)!.push(r);
  }
  const extrasOrdenados = [...byExtra.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

  for (const [, group] of extrasOrdenados) {
    const first = group[0];
    const allDates = group.flatMap(r => r.workDays.map(d => d.date)).sort();
    const periodStr =
      allDates.length === 0
        ? ''
        : allDates.length === 1
          ? formatDateBR(allDates[0])
          : `${formatDateBR(allDates[0])} - ${formatDateBR(allDates[allDates.length - 1])}`;
    const setoresUnicos = [...new Set(group.map(r => r.sector).filter(Boolean))].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    const setorStr = setoresUnicos.join(', ');
    const valor = roundMoney(group.reduce((s, r) => s + totalWorkedValue(r), 0));
    data.push([
      periodStr,
      setorStr,
      first.extraName || '',
      first.valueType === 'combinado' ? 'Combinado' : 'Por Hora',
      valor
    ]);
  }

  for (const setor of sectors) {
    data.push([`Subtotal (${setor})`, '', '', '', subtotaisPorSetor.get(setor) ?? 0]);
  }
  data.push(['TOTAL GERAL', '', '', '', totalGeral]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Listagem');
  XLSX.writeFile(wb, filename || `listagem-extras-${new Date().getTime()}.xlsx`);
}

/** Exporta recibos em massa para Excel (uma planilha por solicitação) */
export function exportBulkRecibosExcel(requests: ExtraRequest[], filename?: string): void {
  const wb = XLSX.utils.book_new();
  const approved = requests.filter(r => r.status === 'APROVADO');

  if (approved.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['Nenhuma solicitação aprovada no período selecionado.']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Info');
  } else {
    approved.forEach((req, idx) => {
      const { headers, table } = buildReciboData(req);
      const sheetName = `${req.code}`.slice(0, 31);
      const wsData = [...headers, [], ...table];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  XLSX.writeFile(wb, filename || `recibos-pagamento-${new Date().getTime()}.xlsx`);
}
