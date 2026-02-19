import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtraRequest, TimeRecord, WorkDay } from '../types';
import { formatDateBR, formatDateTimeBR } from '../utils/date';
import { roundMoney } from '../utils/round';

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
/** Margem inferior mínima (mm) para não cortar recibo. */
const PAGE_BOTTOM_MARGIN_MM = 15;
/** Linha de corte fixa no meio da página (PDF em massa: dois recibos por página). */
const CUT_LINE_Y_MM = A4_HEIGHT_MM / 2;
/** Margem (mm) entre fim do recibo e a linha de corte (metade superior). */
const MARGIN_BEFORE_CUT_MM = 3;
/** Margem (mm) entre linha de corte e início do recibo (metade inferior). */
const MARGIN_AFTER_CUT_MM = 5;
/** Limite Y (mm) até onde o recibo da metade superior pode ir. */
const TOP_HALF_END_Y = CUT_LINE_Y_MM - MARGIN_BEFORE_CUT_MM;
/** Início Y (mm) do slot da metade inferior. */
const BOTTOM_HALF_START_Y = CUT_LINE_Y_MM + MARGIN_AFTER_CUT_MM;
/** Altura máxima (mm) para um recibo na metade superior. */
const TOP_HALF_MAX_HEIGHT_MM = TOP_HALF_END_Y - PAGE_TOP_MARGIN;
/** Altura máxima (mm) para um recibo na metade inferior. */
const BOTTOM_HALF_MAX_HEIGHT_MM = (A4_HEIGHT_MM - PAGE_BOTTOM_MARGIN_MM) - BOTTOM_HALF_START_Y;
/** Altura do cabeçalho do recibo até o início da tabela (mm). */
const RECIBO_HEADER_MM = 42;
/** Altura por linha da tabela (minCellHeight) (mm). */
const RECIBO_TABLE_ROW_MM = 6;
/** Altura do rodapé do recibo (após tabela até fim: linhas de assinatura) (mm). */
const RECIBO_FOOTER_MM = 17;

/** Estima a altura total do recibo em mm (cabeçalho + tabela + rodapé) para evitar quebra no meio. */
function estimateReciboHeightMm(request: ExtraRequest): number {
  const tableRows = 1 + request.workDays.length + 1; // cabeçalho da tabela + dias + linha TOTAL
  return RECIBO_HEADER_MM + tableRows * RECIBO_TABLE_ROW_MM + RECIBO_FOOTER_MM;
}

/** Verifica se o recibo inteiro cabe na página a partir de offsetY; se não couber, adiciona nova página e retorna PAGE_TOP_MARGIN. */
function ensureReciboFitsPage(doc: jsPDF, request: ExtraRequest, offsetY: number): number {
  const height = estimateReciboHeightMm(request);
  const maxY = A4_HEIGHT_MM - PAGE_BOTTOM_MARGIN_MM;
  if (offsetY + height > maxY) {
    doc.addPage();
    return PAGE_TOP_MARGIN;
  }
  return offsetY;
}

/** Jornada padrão em horas (7h20) para cálculo do valor da hora. */
const HORAS_JORNADA_PADRAO = 7 + 20 / 60; // 7,333...

/** Limites de caracteres no recibo para evitar sobreposição/transbordamento. */
const RECIBO_MAX_36 = 36; // Nome, Setor, Motivo
const RECIBO_MAX_26 = 26; // Demandante, Função, Aprovado por

/** Trunca texto ao limite indicado; se truncar, acrescenta "..." no fim. */
function truncateRecibo(value: string | undefined, maxLen: number): string {
  const s = (value || '').trim();
  if (s.length <= maxLen) return s || 'N/A';
  return s.slice(0, maxLen - 3) + '...';
}

/** Converte "HH:MM" em minutos desde meia-noite. */
function timeToMinutes(t?: string): number | null {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Se saída < entrada (ex.: 00:02 vs 15:50), turno passou da meia-noite: considera saída no dia seguinte (+24h). */
function effectiveDepartureMinutes(arrivalMin: number, departureMin: number): number {
  return departureMin >= arrivalMin ? departureMin : departureMin + 24 * 60;
}

/** Calcula minutos trabalhados no dia (departure - arrival - intervalo). Retorna 0 se incompleto. Considera turno após meia-noite (saída no dia seguinte). */
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

/** Calcula horas trabalhadas no dia. Retorna string HH:MM ou "". */
function hoursWorkedInDay(tr?: TimeRecord): string {
  const totalMin = minutesWorkedInDay(tr);
  return minutesToHHMM(totalMin);
}

/** Soma total de horas trabalhadas (string HH:MM). Considera turno após meia-noite. */
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

  // Título – alinhado à esquerda
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('RECIBO DE PAGAMENTO', 20, 8 + offsetY, { align: 'left' });
  doc.setLineWidth(0.3);
  doc.line(20, 12 + offsetY, 190, 12 + offsetY);

  doc.setFontSize(9);
  let y = 18;

  // Nome e Demandante na primeira linha, alinhados (limites: 36 e 26 caracteres)
  addField('Nome', truncateRecibo(request.extraName, RECIBO_MAX_36), col1, y);
  addField('Demandante', truncateRecibo(request.requester, RECIBO_MAX_26), col2, y);
  y += 5;
  addField('Setor', truncateRecibo(request.sector, RECIBO_MAX_36), col1, y);
  addField('Função', truncateRecibo(request.role, RECIBO_MAX_26), col2, y);
  y += 5;
  addField('Motivo', truncateRecibo(request.reason, RECIBO_MAX_36), col1, y);
  addField('Aprovado por', truncateRecibo(request.approvedBy || 'N/A', RECIBO_MAX_26), col2, y);
  y += 5;
  // CPF e Período na mesma linha, alinhados
  const periodStr = request.workDays.length
    ? `${formatDateBR(request.workDays[0].date)} - ${formatDateBR(request.workDays[request.workDays.length - 1].date)}`
    : '';
  addField('CPF', request.extraCpf || '', col1, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Período:', col2, y + offsetY);
  doc.setFont('helvetica', 'normal');
  doc.text(periodStr || 'N/A', col2 + 22, y + offsetY);
  y += 6;

  // Controle de Ponto (Portaria). Agrupado (consolidatedTotal): total fixo, valor por dia em branco.
  const useConsolidatedTotal = request.consolidatedTotal != null;
  const isCombinado = !useConsolidatedTotal && request.valueType === 'combinado';
  const valorHora = isCombinado ? 0 : request.value / HORAS_JORNADA_PADRAO;
  const totalHours = totalHoursWorked(request.workDays);
  const head = ['Data', 'Horário Chegada', 'Início Intervalo', 'Fim Intervalo', 'Horário Saída', 'Total Horas', 'Valor'];
  const body = request.workDays.map(day => {
    const tr = day.timeRecord;
    const hours = hoursWorkedInDay(tr);
    const minDay = minutesWorkedInDay(tr);
    const horasDia = minDay / 60;
    const valorDia = useConsolidatedTotal ? 0 : (isCombinado ? roundMoney(request.value) : roundMoney(horasDia * valorHora));
    const valorStr = useConsolidatedTotal ? '' : (valorDia > 0 ? valorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
    return [
      formatDateBR(day.date),
      tr?.arrival || '',
      tr?.breakStart || '',
      tr?.breakEnd || '',
      tr?.departure || '',
      hours,
      valorStr
    ];
  });
  const totalValor = useConsolidatedTotal
    ? roundMoney(request.consolidatedTotal!)
    : isCombinado
      ? roundMoney(request.value * (request.workDays?.length || 1))
      : roundMoney(
          request.workDays.reduce((sum, day) => sum + roundMoney((minutesWorkedInDay(day.timeRecord) / 60) * valorHora), 0)
        );
  body.push(['TOTAL', '', '', '', '', totalHours, totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);

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
  // Linhas de assinatura (Data e Assinatura apenas; CPF removido)
  const totalW = 190 - 20;
  const gap = 4;
  const w = (totalW - gap) / 2;
  const x1 = 20;
  const x2 = 20 + gap + w;
  const lineY = finalY + 2;
  doc.line(x1, lineY, x1 + w, lineY);
  doc.line(x2, lineY, x2 + w, lineY);
  doc.text('Data', x1 + w / 2, lineY + 4, { align: 'center' });
  doc.text('Assinatura', x2 + w / 2, lineY + 4, { align: 'center' });
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
    offsetY = ensureReciboFitsPage(doc, request, offsetY);
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
  let offsetY = ensureReciboFitsPage(doc, request, PAGE_TOP_MARGIN);
  buildIndividualPDF(doc, request, offsetY);
  doc.save(`recibo-pagamento-${request.code}.pdf`);
};

/** Retorna URL do PDF com um único recibo (1 cópia) para exibir em iframe. */
export const getSingleReciboPDFBlobUrl = (request: ExtraRequest): string => {
  const doc = new jsPDF();
  let offsetY = ensureReciboFitsPage(doc, request, PAGE_TOP_MARGIN);
  buildIndividualPDF(doc, request, offsetY);
  return URL.createObjectURL(doc.output('blob'));
};

/** Retorna URL do PDF individual (3 cópias, quantas couberem por página) para exibir em iframe. */
export const getIndividualPDFBlobUrl = (request: ExtraRequest): string => {
  const doc = new jsPDF();
  let offsetY = PAGE_TOP_MARGIN;
  for (let i = 0; i < 3; i++) {
    offsetY = ensureReciboFitsPage(doc, request, offsetY);
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
    offsetY = ensureReciboFitsPage(doc, request, offsetY);
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

/** Preenche o PDF em massa com layout fixo: linha de corte no meio da página, dois recibos por página (um em cima, um em baixo). */
function fillBulkRecibosFixedLayout(doc: jsPDF, approved: ExtraRequest[]): void {
  let i = 0;
  while (i < approved.length) {
    if (i > 0) doc.addPage();
    drawDashedDivider(doc, CUT_LINE_Y_MM);

    const reqTop = approved[i];
    const topHeight = estimateReciboHeightMm(reqTop);
    if (topHeight > TOP_HALF_MAX_HEIGHT_MM) {
      buildIndividualPDF(doc, reqTop, PAGE_TOP_MARGIN);
      i++;
      continue;
    }
    buildIndividualPDF(doc, reqTop, PAGE_TOP_MARGIN);
    i++;

    if (i >= approved.length) break;
    const reqBottom = approved[i];
    const bottomHeight = estimateReciboHeightMm(reqBottom);
    if (bottomHeight > BOTTOM_HALF_MAX_HEIGHT_MM) continue;
    buildIndividualPDF(doc, reqBottom, BOTTOM_HALF_START_Y);
    i++;
  }
}

/** Gera PDF com recibos em massa: dois recibos por página, linha de corte fixa no meio. */
export const getBulkRecibosPDFBlobUrl = (requests: ExtraRequest[]): string => {
  const doc = new jsPDF();
  const approved = requests.filter(r => r.status === 'APROVADO');
  if (approved.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhuma solicitação aprovada no período selecionado.', 20, 30);
    return URL.createObjectURL(doc.output('blob'));
  }
  fillBulkRecibosFixedLayout(doc, approved);
  return URL.createObjectURL(doc.output('blob'));
};

/** Gera e baixa PDF de recibos em massa: dois recibos por página, linha de corte fixa no meio. */
export const generateBulkRecibosPDF = (requests: ExtraRequest[], filename?: string) => {
  const approved = requests.filter(r => r.status === 'APROVADO');
  const doc = new jsPDF();
  if (approved.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhuma solicitação aprovada no período selecionado.', 20, 30);
    doc.save(filename || 'recibos-pagamento.pdf');
    return;
  }
  fillBulkRecibosFixedLayout(doc, approved);
  doc.save(filename || `recibos-pagamento-${new Date().getTime()}.pdf`);
};

/** Formata período para tabela: "01/07/2025 - 07/07/2025" */
function formatPeriodRange(workDays: ExtraRequest['workDays']): string {
  if (!workDays.length) return '';
  const first = formatDateBR(workDays[0].date);
  const last = formatDateBR(workDays[workDays.length - 1].date);
  return first === last ? first : `${first} - ${last}`;
}

/** Calcula o valor total trabalhado (igual ao RECIBO DE PAGAMENTO): consolidado = consolidatedTotal; combinado = valor × dias; por hora = soma por dia × valor/hora. */
function totalWorkedValue(request: ExtraRequest): number {
  if (request.consolidatedTotal != null) return roundMoney(request.consolidatedTotal);
  if (request.valueType === 'combinado') return roundMoney(request.value * (request.workDays?.length || 1));
  const valorHora = request.value / HORAS_JORNADA_PADRAO;
  let total = 0;
  for (const day of request.workDays) {
    const minDay = minutesWorkedInDay(day.timeRecord);
    total += roundMoney((minDay / 60) * valorHora);
  }
  return roundMoney(total);
}

/** Lista única: uma linha por extra; coluna Setor = todos os setores que o extra trabalhou (ordem alfabética). Subtotais por setor no final. */
function buildListBodyBySector(requests: ExtraRequest[]): {
  body: string[][];
  summaryRowIndices: Set<number>;
  spacerRowIndices: Set<number>;
} {
  const body: string[][] = [];
  const summaryRowIndices = new Set<number>();
  const spacerRowIndices = new Set<number>();
  const sectors = [...new Set(requests.map(r => r.sector))].sort((a, b) => a.localeCompare(b));
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
    const valorStr = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    body.push([
      periodStr,
      setorStr,
      first.extraName || '',
      first.valueType === 'combinado' ? 'Combinado' : 'Por Hora',
      valorStr
    ]);
  }

  for (const setor of sectors) {
    const totalSetor = subtotaisPorSetor.get(setor) ?? 0;
    body.push([`Subtotal (${setor})`, '', '', '', totalSetor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    summaryRowIndices.add(body.length - 1);
  }
  body.push(['TOTAL GERAL', '', '', '', totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
  summaryRowIndices.add(body.length - 1);

  return { body, summaryRowIndices, spacerRowIndices };
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

const LIST_TABLE_MARGIN_MM = 10;

/** Retorna URL do PDF de listagem para exibir em iframe (revogue com URL.revokeObjectURL quando não precisar mais). */
export const getListPDFBlobUrl = (requests: ExtraRequest[], title: string): string => {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(16);
  doc.text('RELATORIO CONTROLE DE EXTRAS', 148, 15, { align: 'center' });
  const { body, summaryRowIndices, spacerRowIndices } = buildListBodyBySector(requests);
  autoTable(doc, {
    startY: 22,
    margin: { left: LIST_TABLE_MARGIN_MM, right: LIST_TABLE_MARGIN_MM },
    head: [['Período', 'Setor', 'Nome Extra', 'Tipo de valor', 'Valor']],
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

  const { body, summaryRowIndices, spacerRowIndices } = buildListBodyBySector(requests);
  autoTable(doc, {
    startY: 22,
    margin: { left: LIST_TABLE_MARGIN_MM, right: LIST_TABLE_MARGIN_MM },
    head: [['Período', 'Setor', 'Nome Extra', 'Tipo de valor', 'Valor']],
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
      }
    }
  });
  addListPagination(doc);
  doc.save(`listagem-extras-${new Date().getTime()}.pdf`);
};
