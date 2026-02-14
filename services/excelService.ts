import * as XLSX from 'xlsx';
import { ExtraRequest, TimeRecord, WorkDay } from '../types';
import { formatDateBR } from '../utils/date';
import { roundHoursToInteger, roundHoursToOneDecimal, roundMoney } from '../utils/round';

const HORAS_JORNADA_PADRAO = 7 + 20 / 60;

function timeToMinutes(t?: string): number | null {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesWorkedInDay(tr?: TimeRecord): number {
  if (!tr?.arrival || !tr?.departure) return 0;
  const arrival = timeToMinutes(tr.arrival);
  const departure = timeToMinutes(tr.departure);
  if (arrival == null || departure == null) return 0;
  let breakMin = 0;
  if (tr.breakStart && tr.breakEnd) {
    const start = timeToMinutes(tr.breakStart);
    const end = timeToMinutes(tr.breakEnd);
    if (start != null && end != null && end > start) breakMin = end - start;
  }
  return Math.max(0, departure - arrival - breakMin);
}

function hoursWorkedInDay(tr?: TimeRecord): string {
  const totalMin = minutesWorkedInDay(tr);
  if (totalMin <= 0) return '';
  const hours = roundHoursToOneDecimal(totalMin / 60);
  return `${hours.toFixed(1).replace('.', ',')}h`;
}

function totalHoursWorked(workDays: WorkDay[]): string {
  let totalMin = 0;
  for (const day of workDays) {
    const tr = day.timeRecord;
    if (!tr?.arrival || !tr?.departure) continue;
    const arrival = timeToMinutes(tr.arrival);
    const departure = timeToMinutes(tr.departure);
    if (arrival == null || departure == null) continue;
    let breakMin = 0;
    if (tr.breakStart && tr.breakEnd) {
      const start = timeToMinutes(tr.breakStart);
      const end = timeToMinutes(tr.breakEnd);
      if (start != null && end != null && end > start) breakMin = end - start;
    }
    totalMin += Math.max(0, departure - arrival - breakMin);
  }
  const hours = roundHoursToInteger(totalMin / 60);
  return `${hours}h`;
}

function buildReciboData(request: ExtraRequest): { headers: string[][]; table: (string | number)[][] } {
  const valorHora = request.value / HORAS_JORNADA_PADRAO;
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
    const valorDia = roundMoney((minDay / 60) * valorHora);
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

/** Calcula o valor total trabalhado (igual ao RECIBO DE PAGAMENTO): soma por dia das horas efetivas × valor/hora. Arredondamento: < 0,50 baixo, >= 0,50 cima. */
function totalWorkedValue(request: ExtraRequest): number {
  const valorHora = request.value / HORAS_JORNADA_PADRAO;
  let total = 0;
  for (const day of request.workDays) {
    const minDay = minutesWorkedInDay(day.timeRecord);
    total += roundMoney((minDay / 60) * valorHora);
  }
  return roundMoney(total);
}

/** Exporta listagem de solicitações para Excel */
export function exportListExcel(requests: ExtraRequest[], title: string, filename?: string): void {
  const sectors = [...new Set(requests.map(r => r.sector))].sort((a, b) => a.localeCompare(b));
  const periodRange = (wd: WorkDay[]) => {
    if (!wd.length) return '';
    const first = formatDateBR(wd[0].date);
    const last = formatDateBR(wd[wd.length - 1].date);
    return first === last ? first : `${first} - ${last}`;
  };

  const data: (string | number)[][] = [
    ['RELATÓRIO CONTROLE DE EXTRAS'],
    [],
    ['Período', 'Setor', 'Função', 'Nome Extra', 'Status', 'Aprovado por', 'Valor'],
  ];

  let totalGeral = 0;
  for (const setor of sectors) {
    const list = requests.filter(r => r.sector === setor);
    let totalSetor = 0;
    for (const r of list) {
      const valorTrabalhado = totalWorkedValue(r);
      totalSetor += valorTrabalhado;
      totalGeral += valorTrabalhado;
      data.push([
        periodRange(r.workDays),
        r.sector,
        r.role,
        r.extraName,
        r.status,
        r.approvedBy || '—',
        roundMoney(valorTrabalhado),
      ]);
    }
    const totalSetorArredondado = roundMoney(totalSetor);
    data.push([`Subtotal (${setor})`, '', '', '', '', '', totalSetorArredondado]);
    data.push([], []);
  }
  data.push(['TOTAL GERAL', '', '', '', '', '', roundMoney(totalGeral)]);

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
