import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtraRequest, TimeRecord, WorkDay } from '../types';
import { formatDateBR, formatDateTimeBR } from '../utils/date';

/** Margem superior da página (mm). */
const PAGE_TOP_MARGIN = 10;
/** Margem após cada recibo antes do divisor (mm). */
const MARGIN_AFTER_CARD = 4;
/** Espaço entre divisor e próximo recibo (mm). */
const GAP_BEFORE_NEXT_CARD = 6;
/** Altura mínima necessária para iniciar um novo recibo na página (mm). */
const MIN_CARD_HEIGHT_MM = 70;
/** Altura da página A4 (mm). */
const A4_HEIGHT_MM = 297;

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

/**
 * Gera o conteúdo de um recibo. Retorna a coordenada Y (mm) do fim do recibo
 * (abaixo dos rótulos de assinatura) para o próximo recibo começar sem sobrepor.
 */
function buildIndividualPDF(doc: jsPDF, request: ExtraRequest, offsetY: number = 0): number {
  const col1 = 20;
  const col2 = 110;

  const addField = (label: string, value: string, xPos: number, yPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, xPos, yPos + offsetY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${value || 'N/A'}`, xPos + 32, yPos + offsetY);
  };

  // Título – mesma linha: esquerda e direita
  doc.setFontSize(12);
  doc.setTextColor(20, 83, 45);
  doc.text('VIVAZ CATARATAS RESORT', 20, 8 + offsetY, { align: 'left' });
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('RECIBO DE PAGAMENTO', 190, 8 + offsetY, { align: 'right' });
  doc.setLineWidth(0.3);
  doc.line(20, 12 + offsetY, 190, 12 + offsetY);

  doc.setFontSize(9);
  let y = 18;

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

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE DE PONTO (PORTARIA)', 105, y + offsetY, { align: 'center' });
  y += 3;
  const totalRowIndex = body.length - 1;
  autoTable(doc, {
    startY: y + offsetY,
    head: [head],
    body,
    theme: 'grid',
    styles: { minCellHeight: 6, halign: 'center', valign: 'middle', fontSize: 8 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    didParseCell: (data) => {
      if (data.row.index === totalRowIndex && data.column.index === 6) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  const tableEndY = (doc as any).lastAutoTable.finalY;
  const finalY = tableEndY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  // Linha primeiro (escreve em cima), rótulos ABAIXO da linha
  const totalW = 190 - 20;
  const gap = 4;
  const w = (totalW - 2 * gap) / 3;
  const x1 = 20;
  const x2 = 20 + gap + w;
  const x3 = 20 + 2 * (gap + w);
  const lineY = finalY + 2;
  doc.line(x1, lineY, x1 + w, lineY);
  doc.line(x2, lineY, x2 + w, lineY);
  doc.line(x3, lineY, x3 + w, lineY);
  doc.text('CPF do Funcionário Extra', x1 + w / 2, lineY + 4, { align: 'center' });
  doc.text('Data do Recebimento', x2 + w / 2, lineY + 4, { align: 'center' });
  doc.text('Assinatura do Funcionário Extra', x3 + w / 2, lineY + 4, { align: 'center' });
  return lineY + 10;
}

/** Desenha divisor tracejado (corte da folha) entre recibos: - - - - - */
function drawDashedDivider(doc: jsPDF, y: number) {
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.25);
  const x1 = 20;
  const x2 = 190;
  const dashLen = 4;
  const gapLen = 3;
  let x = x1;
  while (x < x2) {
    doc.line(x, y, Math.min(x + dashLen, x2), y);
    x += dashLen + gapLen;
  }
}

export const generateIndividualPDF = (request: ExtraRequest) => {
  const doc = new jsPDF();
  let offsetY = PAGE_TOP_MARGIN;
  for (let i = 0; i < 3; i++) {
    if (offsetY + MIN_CARD_HEIGHT_MM > A4_HEIGHT_MM) {
      doc.addPage();
      offsetY = PAGE_TOP_MARGIN;
    }
    const cardBottom = buildIndividualPDF(doc, request, offsetY);
    if (i < 2) {
      drawDashedDivider(doc, cardBottom + MARGIN_AFTER_CARD);
      offsetY = cardBottom + MARGIN_AFTER_CARD + GAP_BEFORE_NEXT_CARD;
    }
  }
  doc.save(`recibo-pagamento-${request.code}.pdf`);
};

/** Gera e baixa um único recibo (1 cópia) para uma solicitação. Usado na lista de Solicitações. */
export const generateSingleReciboPDF = (request: ExtraRequest) => {
  const doc = new jsPDF();
  buildIndividualPDF(doc, request, PAGE_TOP_MARGIN);
  doc.save(`recibo-pagamento-${request.code}.pdf`);
};

/** Retorna URL do PDF com um único recibo (1 cópia) para exibir em iframe. */
export const getSingleReciboPDFBlobUrl = (request: ExtraRequest): string => {
  const doc = new jsPDF();
  buildIndividualPDF(doc, request, PAGE_TOP_MARGIN);
  return URL.createObjectURL(doc.output('blob'));
};

/** Retorna URL do PDF individual (3 cópias, quantas couberem por página) para exibir em iframe. */
export const getIndividualPDFBlobUrl = (request: ExtraRequest): string => {
  const doc = new jsPDF();
  let offsetY = PAGE_TOP_MARGIN;
  for (let i = 0; i < 3; i++) {
    if (offsetY + MIN_CARD_HEIGHT_MM > A4_HEIGHT_MM) {
      doc.addPage();
      offsetY = PAGE_TOP_MARGIN;
    }
    const cardBottom = buildIndividualPDF(doc, request, offsetY);
    if (i < 2) {
      drawDashedDivider(doc, cardBottom + MARGIN_AFTER_CARD);
      offsetY = cardBottom + MARGIN_AFTER_CARD + GAP_BEFORE_NEXT_CARD;
    }
  }
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

/** Desenha 3 cópias de um recibo no doc (posição dinâmica e quebra de página). */
function drawThreeRecibos(doc: jsPDF, request: ExtraRequest): void {
  let offsetY = PAGE_TOP_MARGIN;
  for (let i = 0; i < 3; i++) {
    if (offsetY + MIN_CARD_HEIGHT_MM > A4_HEIGHT_MM) {
      doc.addPage();
      offsetY = PAGE_TOP_MARGIN;
    }
    const cardBottom = buildIndividualPDF(doc, request, offsetY);
    if (i < 2) {
      drawDashedDivider(doc, cardBottom + MARGIN_AFTER_CARD);
      offsetY = cardBottom + MARGIN_AFTER_CARD + GAP_BEFORE_NEXT_CARD;
    }
  }
}

/** Gera PDF com recibos em massa: um recibo por extra, em sequência na mesma página, separados por linha tracejada. */
export const getBulkRecibosPDFBlobUrl = (requests: ExtraRequest[]): string => {
  const doc = new jsPDF();
  const approved = requests.filter(r => r.status === 'APROVADO');
  if (approved.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhuma solicitação aprovada no período selecionado.', 20, 30);
    return URL.createObjectURL(doc.output('blob'));
  }
  let offsetY = PAGE_TOP_MARGIN;
  approved.forEach((req, index) => {
    if (offsetY + MIN_CARD_HEIGHT_MM > A4_HEIGHT_MM) {
      doc.addPage();
      offsetY = PAGE_TOP_MARGIN;
    }
    const cardBottom = buildIndividualPDF(doc, req, offsetY);
    if (index < approved.length - 1) {
      drawDashedDivider(doc, cardBottom + MARGIN_AFTER_CARD);
      offsetY = cardBottom + MARGIN_AFTER_CARD + GAP_BEFORE_NEXT_CARD;
    }
  });
  return URL.createObjectURL(doc.output('blob'));
};

/** Gera e baixa PDF de recibos em massa: um recibo por extra, em sequência, separados por linha tracejada. */
export const generateBulkRecibosPDF = (requests: ExtraRequest[], filename?: string) => {
  const approved = requests.filter(r => r.status === 'APROVADO');
  const doc = new jsPDF();
  if (approved.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhuma solicitação aprovada no período selecionado.', 20, 30);
    doc.save(filename || 'recibos-pagamento.pdf');
    return;
  }
  let offsetY = PAGE_TOP_MARGIN;
  approved.forEach((req, index) => {
    if (offsetY + MIN_CARD_HEIGHT_MM > A4_HEIGHT_MM) {
      doc.addPage();
      offsetY = PAGE_TOP_MARGIN;
    }
    const cardBottom = buildIndividualPDF(doc, req, offsetY);
    if (index < approved.length - 1) {
      drawDashedDivider(doc, cardBottom + MARGIN_AFTER_CARD);
      offsetY = cardBottom + MARGIN_AFTER_CARD + GAP_BEFORE_NEXT_CARD;
    }
  });
  doc.save(filename || `recibos-pagamento-${new Date().getTime()}.pdf`);
};

/** Formata período para tabela: "01/07/2025 - 07/07/2025" */
function formatPeriodRange(workDays: ExtraRequest['workDays']): string {
  if (!workDays.length) return '';
  const first = formatDateBR(workDays[0].date);
  const last = formatDateBR(workDays[workDays.length - 1].date);
  return first === last ? first : `${first} - ${last}`;
}

/** Agrupa solicitações por setor e monta body da tabela com subtotal, separador verde e total geral. */
function buildListBodyBySector(requests: ExtraRequest[]): {
  body: string[][];
  summaryRowIndices: Set<number>;
  greenBarRowIndices: Set<number>;
  spacerRowIndices: Set<number>;
} {
  const body: string[][] = [];
  const summaryRowIndices = new Set<number>();
  const greenBarRowIndices = new Set<number>();
  const spacerRowIndices = new Set<number>();
  const sectors = [...new Set(requests.map(r => r.sector))].sort((a, b) => a.localeCompare(b));
  let totalGeral = 0;
  const emptyRow = ['', '', '', '', '', '', ''];

  for (let i = 0; i < sectors.length; i++) {
    const setor = sectors[i];
    const list = requests.filter(r => r.sector === setor);
    let totalSetor = 0;
    for (const r of list) {
      body.push([
        formatPeriodRange(r.workDays),
        r.sector,
        r.role,
        r.extraName,
        r.status,
        r.approvedBy || '—',
        r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);
      totalSetor += r.value;
    }
    body.push([`Subtotal (${setor})`, '', '', '', '', '', totalSetor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    summaryRowIndices.add(body.length - 1);
    totalGeral += totalSetor;

    if (i < sectors.length - 1) {
      body.push([...emptyRow]);
      spacerRowIndices.add(body.length - 1);
      body.push([...emptyRow]);
      greenBarRowIndices.add(body.length - 1);
      body.push([...emptyRow]);
      spacerRowIndices.add(body.length - 1);
    }
  }

  body.push(['TOTAL GERAL', '', '', '', '', '', totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
  summaryRowIndices.add(body.length - 1);

  return { body, summaryRowIndices, greenBarRowIndices, spacerRowIndices };
}

/** Adiciona paginação no canto inferior direito (fonte pequena). */
function addListPagination(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(`${i} / ${totalPages}`, 290, 205, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
}

/** Retorna URL do PDF de listagem para exibir em iframe (revogue com URL.revokeObjectURL quando não precisar mais). */
export const getListPDFBlobUrl = (requests: ExtraRequest[], title: string): string => {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(16);
  doc.text('RELATORIO CONTROLE DE EXTRAS', 148, 15, { align: 'center' });
  const { body, summaryRowIndices, greenBarRowIndices, spacerRowIndices } = buildListBodyBySector(requests);
  const GREEN_LINE_HEIGHT_MM = 0.35;
  autoTable(doc, {
    startY: 22,
    head: [['Período', 'Setor', 'Função', 'Nome Extra', 'Status', 'Aprovado por', 'Valor']],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 83, 45] },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const idx = data.row.index;
      if (summaryRowIndices.has(idx)) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 0) data.cell.styles.halign = 'left';
        if (idx === body.length - 1) {
          data.cell.styles.fillColor = [230, 245, 230];
        }
      } else if (greenBarRowIndices.has(idx)) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.cellPadding = 0;
        data.cell.styles.minCellHeight = GREEN_LINE_HEIGHT_MM;
      } else if (spacerRowIndices.has(idx)) {
        data.cell.styles.cellPadding = 0;
        data.cell.styles.minCellHeight = 1.5;
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && greenBarRowIndices.has(data.row.index) && data.column.index === 0) {
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 10;
        const x = margin;
        const w = pageW - margin * 2;
        const cellY = (data as any).cell?.y ?? data.cursor.y - GREEN_LINE_HEIGHT_MM;
        doc.setFillColor(20, 83, 45);
        doc.rect(x, cellY, w, GREEN_LINE_HEIGHT_MM, 'F');
      }
    }
  });
  addListPagination(doc);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

export const generateListPDF = (requests: ExtraRequest[], title: string) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(16);
  doc.text('RELATORIO CONTROLE DE EXTRAS', 148, 15, { align: 'center' });

  const { body, summaryRowIndices, greenBarRowIndices, spacerRowIndices } = buildListBodyBySector(requests);
  const GREEN_LINE_HEIGHT_MM = 0.35;
  autoTable(doc, {
    startY: 22,
    head: [['Período', 'Setor', 'Função', 'Nome Extra', 'Status', 'Aprovado por', 'Valor']],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 83, 45] },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const idx = data.row.index;
      if (summaryRowIndices.has(idx)) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 0) data.cell.styles.halign = 'left';
        if (idx === body.length - 1) {
          data.cell.styles.fillColor = [230, 245, 230];
        }
      } else if (greenBarRowIndices.has(idx)) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.cellPadding = 0;
        data.cell.styles.minCellHeight = GREEN_LINE_HEIGHT_MM;
      } else if (spacerRowIndices.has(idx)) {
        data.cell.styles.cellPadding = 0;
        data.cell.styles.minCellHeight = 1.5;
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && greenBarRowIndices.has(data.row.index) && data.column.index === 0) {
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 10;
        const x = margin;
        const w = pageW - margin * 2;
        const cellY = (data as any).cell?.y ?? data.cursor.y - GREEN_LINE_HEIGHT_MM;
        doc.setFillColor(20, 83, 45);
        doc.rect(x, cellY, w, GREEN_LINE_HEIGHT_MM, 'F');
      }
    }
  });

  addListPagination(doc);
  doc.save(`listagem-extras-${new Date().getTime()}.pdf`);
};
