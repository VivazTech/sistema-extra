
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtraRequest } from '../types';

export const generateIndividualPDF = (request: ExtraRequest) => {
  const doc = new jsPDF();

  const formatWorkDaysSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return 'N/A';
    const firstDate = new Date(workDays[0].date).toLocaleDateString('pt-BR');
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstDate} +${extraDays} dias` : firstDate;
  };

  const formatShiftSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return 'N/A';
    const firstShift = workDays[0].shift;
    const extraDays = workDays.length - 1;
    return extraDays > 0 ? `${firstShift} +${extraDays}` : firstShift;
  };
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(20, 83, 45); // Dark Green (Vivaz Theme)
  doc.text('VIVAZ CATARATAS RESORT', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('SOLICITAÇÃO DE FUNCIONÁRIO EXTRA', 105, 30, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Content
  doc.setFontSize(10);
  let y = 45;
  const col1 = 20;
  const col2 = 110;

  const addField = (label: string, value: string, xPos: number, yPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, xPos, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${value || 'N/A'}`, xPos + 35, yPos);
  };

  addField('ID', request.code, col1, y);
  addField('Status', request.status, col2, y);
  y += 10;
  
  addField('Setor', request.sector, col1, y);
  addField('Função', request.role, col2, y);
  y += 10;
  
  addField('Data', formatWorkDaysSummary(request.workDays), col1, y);
  addField('Turno', formatShiftSummary(request.workDays), col2, y);
  y += 10;
  
  addField('Líder', request.leaderName, col1, y);
  addField('Demandante', request.requester, col2, y);
  y += 10;
  
  addField('Motivo', request.reason, col1, y);
  y += 10;
  
  addField('Nome Extra', request.extraName, col1, y);
  addField('Valor (R$)', request.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), col2, y);
  y += 10;

  // Days/Shift Table
  y += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DIAS E TURNOS', 105, y, { align: 'center' });
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Data', 'Turno']],
    body: request.workDays.map(day => [
      new Date(day.date).toLocaleDateString('pt-BR'),
      day.shift
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // Portaria Table
  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE DE PONTO (PREENCHIMENTO MANUAL - PORTARIA)', 105, y, { align: 'center' });
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Horário de Chegada', 'Início Intervalo', 'Fim Intervalo', 'Horário de Saída']],
    body: [[' ', ' ', ' ', ' ']],
    theme: 'grid',
    styles: { minCellHeight: 20, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  
  doc.line(20, finalY, 90, finalY);
  doc.text('Assinatura do Funcionário Extra', 55, finalY + 5, { align: 'center' });

  doc.line(120, finalY, 190, finalY);
  doc.text('Assinatura do Líder Responsável', 155, finalY + 5, { align: 'center' });

  doc.text(`Impresso em: ${new Date().toLocaleString('pt-BR')}`, 105, 285, { align: 'center' });

  doc.save(`solicitacao-${request.code}.pdf`);
};

export const generateListPDF = (requests: ExtraRequest[], title: string) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const formatWorkDaysSummary = (workDays: ExtraRequest['workDays']) => {
    if (!workDays.length) return '';
    const firstDate = new Date(workDays[0].date).toLocaleDateString('pt-BR');
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
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 148, 22, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['ID', 'Data', 'Turno', 'Setor', 'Função', 'Nome Extra', 'Status', 'Valor']],
    body: requests.map(r => [
      r.code,
      formatWorkDaysSummary(r.workDays),
      formatShiftSummary(r.workDays),
      r.sector,
      r.role,
      r.extraName,
      r.status,
      r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 83, 45] }
  });

  doc.save(`listagem-extras-${new Date().getTime()}.pdf`);
};
