import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtraRequest, TimeRecord, WorkDay } from '../types';
import { formatDateBR, formatDateTimeBR } from '../utils/date';

/** Altura de um bloco "solicitação" para caber 3 por folha A4 (~99mm). */
const CARD_HEIGHT_MM = 99;

/** Converte "HH:MM" em minutos desde meia-noite. */
function timeToMinutes(t?: string): number | null {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Calcula horas trabalhadas no dia (departure - arrival - intervalo). Retorna string "X,Xh" ou "". */
function hoursWorkedInDay(tr?: TimeRecord): string {
  if (!tr?.arrival || !tr?.departure) return '';
  const arrival = timeToMinutes(tr.arrival);
  const departure = timeToMinutes(tr.departure);
  if (arrival == null || departure == null) return '';
  let breakMin = 0;
  if (tr.breakStart && tr.breakEnd) {
    const start = timeToMinutes(tr.breakStart);
    const end = timeToMinutes(tr.breakEnd);
    if (start != null && end != null && end > start) breakMin = end - start;
  }
  const totalMin = Math.max(0, departure - arrival - breakMin);
  const hours = Math.round((totalMin / 60) * 10) / 10;
  return `${hours.toFixed(1).replace('.', ',')}h`;
}

/** Soma total de horas trabalhadas (string "X,Xh"). */
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
  const hours = Math.round((totalMin / 60) * 10) / 10;
  return `${hours.toFixed(1).replace('.', ',')}h`;
}

/** Gera o conteúdo de um bloco individual (1/3 da folha). offsetY = 0, 99 ou 198 para 3 por página. */
function buildIndividualPDF(doc: jsPDF, request: ExtraRequest, offsetY: number = 0) {
  const col1 = 20;
  const col2 = 110;

  const addField = (label: string, value: string, xPos: number, yPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, xPos, yPos + offsetY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${value || 'N/A'}`, xPos + 32, yPos + offsetY);
  };

  // Título menor – alinhado à esquerda
  doc.setFontSize(12);
  doc.setTextColor(20, 83, 45);
  doc.text('VIVAZ CATARATAS RESORT', 20, 8 + offsetY, { align: 'left' });
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('RECIBO DE PAGAMENTO', 20, 14 + offsetY, { align: 'left' });
  doc.setLineWidth(0.3);
  doc.line(20, 17 + offsetY, 190, 17 + offsetY);

  doc.setFontSize(9);
  let y = 24;

  addField('Status', request.status, col1, y);
  addField('Demandante', request.requester, col2, y);
  y += 5;
  addField('Setor', request.sector, col1, y);
  addField('Função', request.role, col2, y);
  y += 5;
  addField('Motivo', request.reason, col1, y);
  addField('Aprovado por', request.approvedBy || 'N/A', col2, y);
  y += 5;
  // Período trabalhado abaixo de "Aprovado por"
  const periodStr = request.workDays.length
    ? `${formatDateBR(request.workDays[0].date)} - ${formatDateBR(request.workDays[request.workDays.length - 1].date)}`
    : '';
  doc.setFont('helvetica', 'bold');
  doc.text('Período:', col2, y + offsetY);
  doc.setFont('helvetica', 'normal');
  doc.text(periodStr || 'N/A', col2 + 22, y + offsetY);
  y += 5;
  addField('Nome Extra', request.extraName, col1, y);
  y += 6;

  // Controle de Ponto (Portaria) – tabela com 2 colunas a mais: Total Horas e Valor total
  const valuePerDay = request.workDays.length ? request.value / request.workDays.length : 0;
  const totalHours = totalHoursWorked(request.workDays);
  const head = ['Data', 'Horário de Chegada', 'Início Intervalo', 'Fim Intervalo', 'Horário de Saída', 'Total Horas', 'Valor'];
  const body = request.workDays.map(day => {
    const tr = day.timeRecord;
    const hours = hoursWorkedInDay(tr);
    const valor = valuePerDay > 0 ? valuePerDay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    return [
      formatDateBR(day.date),
      tr?.arrival || '',
      tr?.breakStart || '',
      tr?.breakEnd || '',
      tr?.departure || '',
      hours,
      valor
    ];
  });
  body.push(['TOTAL', '', '', '', '', totalHours, request.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE DE PONTO (PORTARIA)', 105, y + offsetY, { align: 'center' });
  y += 4;
  autoTable(doc, {
    startY: y + offsetY,
    head: [head],
    body,
    theme: 'grid',
    styles: { minCellHeight: 6, halign: 'center', valign: 'middle', fontSize: 8 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 }
  });

  const tableEndY = (doc as any).lastAutoTable.finalY;
  const finalY = tableEndY + 8;
  doc.line(20, finalY, 90, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Assinatura do Funcionário Extra', 55, finalY + 4, { align: 'center' });
  doc.text(`CPF do Funcionário Extra: ${request.extraCpf || '_________________________'}`, 95, finalY + 4);
  doc.text(`Data: ${formatDateBR(new Date())}`, 95, finalY + 9);
}

export const generateIndividualPDF = (request: ExtraRequest) => {
  const doc = new jsPDF();
  buildIndividualPDF(doc, request, 0);
  buildIndividualPDF(doc, request, CARD_HEIGHT_MM);
  buildIndividualPDF(doc, request, CARD_HEIGHT_MM * 2);
  // Linhas de guia para recorte (entre os 3 blocos)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, CARD_HEIGHT_MM, 190, CARD_HEIGHT_MM);
  doc.line(20, CARD_HEIGHT_MM * 2, 190, CARD_HEIGHT_MM * 2);
  doc.save(`recibo-pagamento-${request.code}.pdf`);
};

/** Retorna URL do PDF individual (3 por folha) para exibir em iframe (revogue com URL.revokeObjectURL quando não precisar mais). */
export const getIndividualPDFBlobUrl = (request: ExtraRequest): string => {
  const doc = new jsPDF();
  buildIndividualPDF(doc, request, 0);
  buildIndividualPDF(doc, request, CARD_HEIGHT_MM);
  buildIndividualPDF(doc, request, CARD_HEIGHT_MM * 2);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, CARD_HEIGHT_MM, 190, CARD_HEIGHT_MM);
  doc.line(20, CARD_HEIGHT_MM * 2, 190, CARD_HEIGHT_MM * 2);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

/** Retorna URL do PDF de listagem para exibir em iframe (revogue com URL.revokeObjectURL quando não precisar mais). */
export const getListPDFBlobUrl = (requests: ExtraRequest[], title: string): string => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const formatWorkDaysSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return '';
    const firstDate = formatDateBR(workDays[0].date);
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstDate} +${extraDays} dias` : firstDate;
  };
  const formatShiftSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return '';
    const firstShift = workDays[0].shift;
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstShift} +${extraDays}` : firstShift;
  };
  doc.setFontSize(16);
  doc.text(`VIVAZ CATARATAS - ${title.toUpperCase()}`, 148, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Gerado em: ${formatDateTimeBR(new Date())}`, 148, 22, { align: 'center' });
  autoTable(doc, {
    startY: 30,
    head: [['ID', 'Data', 'Turno', 'Setor', 'Função', 'Nome Extra', 'Status', 'Aprovado por', 'Valor']],
    body: requests.map(r => [
      r.code,
      formatWorkDaysSummary(r.workDays),
      formatShiftSummary(r.workDays),
      r.sector,
      r.role,
      r.extraName,
      r.status,
      r.approvedBy || '',
      r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 83, 45] }
  });
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

export const generateListPDF = (requests: ExtraRequest[], title: string) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const formatWorkDaysSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return '';
    const firstDate = formatDateBR(workDays[0].date);
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstDate} +${extraDays} dias` : firstDate;
  };

  const formatShiftSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return '';
    const firstShift = workDays[0].shift;
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstShift} +${extraDays}` : firstShift;
  };
  doc.setFontSize(16);
  doc.text(`VIVAZ CATARATAS - ${title.toUpperCase()}`, 148, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Gerado em: ${formatDateTimeBR(new Date())}`, 148, 22, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['ID', 'Data', 'Turno', 'Setor', 'Função', 'Nome Extra', 'Status', 'Aprovado por', 'Valor']],
    body: requests.map(r => [
      r.code,
      formatWorkDaysSummary(r.workDays),
      formatShiftSummary(r.workDays),
      r.sector,
      r.role,
      r.extraName,
      r.status,
      r.approvedBy || '',
      r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 83, 45] }
  });

  doc.save(`listagem-extras-${new Date().getTime()}.pdf`);
};
