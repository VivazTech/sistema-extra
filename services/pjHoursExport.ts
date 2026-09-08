import * as XLSX from 'xlsx';
import { formatDateBR } from '../utils/date';
import {
  formatMinutesWorked,
  formatWorkedHours,
  getPjAbsenceLabel,
  getPjAbsenceType,
  workedMinutes,
} from '../utils/pjHours';

export type PjHoursExportRow = {
  employeeId: string;
  work_date: string;
  arrival: string | null;
  break_start: string | null;
  break_end: string | null;
  departure: string | null;
  observations: string | null;
  employee_name: string;
  sector_name: string;
};

const HEADERS = [
  'Data',
  'Nome',
  'Setor/função',
  'Total de horas trabalhadas',
  'Entrada',
  'Saída intervalo',
  'Volta intervalo',
  'Saída',
  'Total do dia',
  'Situação',
];

function periodTotals(rows: PjHoursExportRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
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
}

export function buildPjHoursExportRows(rows: PjHoursExportRow[]): string[][] {
  const totals = periodTotals(rows);
  return rows.map((r) => {
    const absence = getPjAbsenceLabel(r.observations);
    const dayTotal = absence
      ? '—'
      : formatWorkedHours(
          r.arrival || undefined,
          r.break_start || undefined,
          r.break_end || undefined,
          r.departure || undefined
        );
    const periodMins = totals.get(r.employeeId) || 0;
    return [
      formatDateBR(r.work_date),
      r.employee_name,
      r.sector_name,
      periodMins > 0 ? formatMinutesWorked(periodMins) : '—',
      absence ? '—' : r.arrival || '—',
      absence ? '—' : r.break_start || '—',
      absence ? '—' : r.break_end || '—',
      absence ? '—' : r.departure || '—',
      dayTotal,
      absence || '—',
    ];
  });
}

export function exportPjHoursExcel(
  rows: PjHoursExportRow[],
  start: string,
  end: string,
  filename?: string
): void {
  const body = buildPjHoursExportRows(rows);
  const ws = XLSX.utils.aoa_to_sheet([
    ['Relatório de Ponto PJ'],
    [`Período: ${formatDateBR(start)} a ${formatDateBR(end)}`],
    [`Registros: ${rows.length}`],
    [],
    HEADERS,
    ...body,
  ]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ponto PJ');
  XLSX.writeFile(wb, filename || `ponto-pj-${start}-${end}.xlsx`);
}

export async function exportPjHoursPDF(
  rows: PjHoursExportRow[],
  start: string,
  end: string,
  filename?: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('l', 'mm', 'a4');

  doc.setFontSize(14);
  doc.setTextColor(20, 83, 45);
  doc.text('Relatório de Ponto PJ', 148, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Período: ${formatDateBR(start)} a ${formatDateBR(end)}  |  Registros: ${rows.length}`,
    148,
    18,
    { align: 'center' }
  );

  autoTable(doc, {
    startY: 22,
    margin: { left: 8, right: 8 },
    head: [HEADERS],
    body: buildPjHoursExportRows(rows),
    styles: { fontSize: 7, cellPadding: 1.4, overflow: 'linebreak' },
    headStyles: { fillColor: [5, 150, 105], fontSize: 7, cellPadding: 1.4 },
  });

  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(`${i} / ${totalPages}`, 290, 205, { align: 'right' });
  }

  doc.save(filename || `ponto-pj-${start}-${end}.pdf`);
}
