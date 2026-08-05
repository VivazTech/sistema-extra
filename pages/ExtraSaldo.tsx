import React, { useMemo, useState } from 'react';
import { Save, Trash2, Edit2, Filter, Plus, Download, X, FileText, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useExtras } from '../context/ExtraContext';
import { ExtraSaldoInput, ExtraSaldoRecord, ExtraRequest } from '../types';
import { calculateExtraSaldo } from '../services/extraSaldoService';
import { formatDateBR } from '../utils/date';

type CadastroRow = {
  setor: string;
  quadroAprovado: string;
  quadroEfetivo: string;
  folgas: string;
  domingos: string;
  demanda: string;
  atestado: string;
};

type ExportFormat = 'csv' | 'pdf';

const emptyRow = (): CadastroRow => ({
  setor: '',
  quadroAprovado: '',
  quadroEfetivo: '',
  folgas: '',
  domingos: '',
  demanda: '',
  atestado: ''
});

/** Escapa valor para CSV. */
function csvEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const ExtraSaldo: React.FC = () => {
  const {
    sectors,
    requests,
    extraSaldoRecords,
    extraSaldoSettings,
    addExtraSaldoRecord,
    updateExtraSaldoRecord,
    deleteExtraSaldoRecord,
    updateExtraSaldoSettings
  } = useExtras();

  /** Conta dias de trabalho no período [inicio, fim] por setor. Opcional: filtrar por status. */
  const countWorkDaysInPeriod = (setor: string, inicio: string, fim: string, statusFilter?: 'APROVADO' | 'SOLICITADO') => {
    return requests.filter(r => {
      if (r.sector !== setor) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return (r.workDays || []).some(d => d.date >= inicio && d.date <= fim);
    }).reduce((acc, r) => {
      const daysInPeriod = (r.workDays || []).filter(d => d.date >= inicio && d.date <= fim).length;
      return acc + daysInPeriod;
    }, 0);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ setor: '', inicio: '', fim: '' });
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [cadastros, setCadastros] = useState<CadastroRow[]>(() => [emptyRow()]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const toNumber = (value: string) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleAddCadastro = () => {
    setCadastros(prev => [...prev, emptyRow()]);
  };

  const handleRemoveCadastro = (idx: number) => {
    if (cadastros.length <= 1) return;
    setCadastros(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateCadastro = (idx: number, field: keyof CadastroRow, value: string) => {
    setCadastros(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!periodoInicio || !periodoFim) {
      alert('Período início e fim são obrigatórios.');
      return;
    }

    if (editingId) {
      const row = cadastros[0];
      if (!row.setor) {
        alert('Setor é obrigatório.');
        return;
      }
      const input: ExtraSaldoInput = {
        setor: row.setor,
        periodoInicio,
        periodoFim,
        quadroAprovado: toNumber(row.quadroAprovado),
        quadroEfetivo: toNumber(row.quadroEfetivo),
        folgas: toNumber(row.quadroEfetivo),
        domingos: toNumber(row.domingos),
        demanda: toNumber(row.demanda),
        atestado: toNumber(row.atestado),
        extrasSolicitados: 0
      };
      const existing = extraSaldoRecords.find(r => r.id === editingId)!;
      const valorDiariaSnapshot = existing?.valorDiariaSnapshot ?? extraSaldoSettings.valorDiaria;
      try {
        calculateExtraSaldo(input, valorDiariaSnapshot);
      } catch (err: any) {
        alert(err?.message || 'Erro ao calcular o saldo.');
        return;
      }
      try {
        await updateExtraSaldoRecord(editingId, input, valorDiariaSnapshot);
      } catch (error: any) {
        alert(error?.message || 'Erro ao salvar no banco de dados.');
        return;
      }
      setEditingId(null);
      setCadastros([emptyRow()]);
      return;
    }

    const toSave = cadastros.filter(r => r.setor.trim());
    if (toSave.length === 0) {
      alert('Preencha pelo menos um setor para salvar.');
      return;
    }

    const valorDiariaSnapshot = extraSaldoSettings.valorDiaria;
    for (const row of toSave) {
      const input: ExtraSaldoInput = {
        setor: row.setor.trim(),
        periodoInicio,
        periodoFim,
        quadroAprovado: toNumber(row.quadroAprovado),
        quadroEfetivo: toNumber(row.quadroEfetivo),
        folgas: toNumber(row.quadroEfetivo),
        domingos: toNumber(row.domingos),
        demanda: toNumber(row.demanda),
        atestado: toNumber(row.atestado),
        extrasSolicitados: 0
      };
      try {
        calculateExtraSaldo(input, valorDiariaSnapshot);
      } catch (err: any) {
        alert(err?.message || 'Erro ao calcular o saldo.');
        return;
      }
    }

    try {
      for (const row of toSave) {
        const input: ExtraSaldoInput = {
          setor: row.setor.trim(),
          periodoInicio,
          periodoFim,
          quadroAprovado: toNumber(row.quadroAprovado),
          quadroEfetivo: toNumber(row.quadroEfetivo),
          folgas: toNumber(row.quadroEfetivo),
          domingos: toNumber(row.domingos),
          demanda: toNumber(row.demanda),
          atestado: toNumber(row.atestado),
          extrasSolicitados: 0
        };
        await addExtraSaldoRecord(input, valorDiariaSnapshot);
      }
    } catch (error: any) {
      alert(error?.message || 'Erro ao salvar no banco de dados.');
      return;
    }

    setCadastros([emptyRow()]);
  };

  const handleEdit = (id: string) => {
    const record = extraSaldoRecords.find(r => r.id === id);
    if (!record) return;
    setEditingId(id);
    setPeriodoInicio(record.periodoInicio);
    setPeriodoFim(record.periodoFim);
    setCadastros([{
      setor: record.setor,
      quadroAprovado: String(record.quadroAprovado),
      quadroEfetivo: String(record.quadroEfetivo),
      folgas: String(record.folgas),
      domingos: String(record.domingos),
      demanda: String(record.demanda),
      atestado: String(record.atestado)
    }]);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCadastros([emptyRow()]);
  };

  const filteredRecords = useMemo(() => {
    return extraSaldoRecords.filter(record => {
      if (filters.setor && record.setor !== filters.setor) return false;
      if (filters.inicio && record.periodoInicio < filters.inicio) return false;
      if (filters.fim && record.periodoFim > filters.fim) return false;
      return true;
    });
  }, [extraSaldoRecords, filters]);

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        const result = calculateExtraSaldo(record, record.valorDiariaSnapshot);
        const aprovado = countWorkDaysInPeriod(record.setor, record.periodoInicio, record.periodoFim, 'APROVADO');
        acc.valor += result.valor;
        acc.saldo += result.saldo;
        acc.saldoEmReais += result.saldoEmReais;
        acc.solicitado += countWorkDaysInPeriod(record.setor, record.periodoInicio, record.periodoFim);
        acc.aprovado += aprovado;
        acc.estouro += Math.max(0, aprovado - result.totalDiarias);
        return acc;
      },
      { valor: 0, saldo: 0, saldoEmReais: 0, solicitado: 0, aprovado: 0, estouro: 0 }
    );
  }, [filteredRecords, requests]);

  /** Justificativas de aprovação vinculadas ao setor/período do registro de saldo. */
  const getJustificationsForRecord = (record: ExtraSaldoRecord) => {
    const related = requests.filter((r: ExtraRequest) => {
      if (r.sector !== record.setor) return false;
      if (!r.approvalJustification?.trim()) return false;
      return (r.workDays || []).some(d => d.date >= record.periodoInicio && d.date <= record.periodoFim);
    });
    const justificativas = related
      .map(r => r.approvalJustification!.trim())
      .filter(Boolean);
    const autores = related
      .map(r => (r.approvedBy || '').trim())
      .filter(Boolean);
    return {
      justificativas: Array.from(new Set(justificativas)).join(' | '),
      autores: Array.from(new Set(autores)).join(' | '),
    };
  };

  const exportHeaders = [
    'Setor',
    'Período início',
    'Período fim',
    'Quadro aprovado',
    'Quadro efetivo',
    'Folgas',
    'Domingos',
    'Demanda',
    'Atestado',
    'Aberto',
    'Vagas/dia',
    'Total diárias',
    'Solicitado',
    'Dias aprovados',
    'Estouro',
    'Saldo',
    'Valor',
    'Saldo R$',
    'Justificativas',
    'Quem escreveu a justificativa',
  ];

  const buildExportRows = (list: ExtraSaldoRecord[]) =>
    list.map((record) => {
      const result = calculateExtraSaldo(record, record.valorDiariaSnapshot);
      const solicitado = countWorkDaysInPeriod(record.setor, record.periodoInicio, record.periodoFim);
      const aprovado = countWorkDaysInPeriod(record.setor, record.periodoInicio, record.periodoFim, 'APROVADO');
      const estouro = Math.max(0, aprovado - result.totalDiarias);
      const { justificativas, autores } = getJustificationsForRecord(record);
      return [
        record.setor,
        formatDateBR(record.periodoInicio),
        formatDateBR(record.periodoFim),
        String(record.quadroAprovado),
        String(record.quadroEfetivo),
        String(record.folgas),
        String(record.domingos),
        String(record.demanda),
        String(record.atestado),
        String(result.quadroAberto),
        String(result.vagasDiarias),
        String(result.totalDiarias),
        String(solicitado),
        String(aprovado),
        estouro > 0 ? String(estouro) : '',
        String(result.saldo),
        result.valor.toFixed(2),
        result.saldoEmReais.toFixed(2),
        justificativas,
        autores,
      ];
    });

  const exportFileBaseName = () => {
    const setorLabel = (filters.setor || 'todos').replace(/\s+/g, '-');
    return `saldo-extras-${setorLabel}-${filters.inicio || 'inicio'}-${filters.fim || 'fim'}`;
  };

  const handleExportCSV = () => {
    const rows = buildExportRows(filteredRecords).map((row) =>
      row.map((cell) => csvEscape(cell)).join(',')
    );
    const csv = [exportHeaders.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileBaseName()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const setorLabel = filters.setor || 'Todos os setores';
    const periodoLabel = `${filters.inicio ? formatDateBR(filters.inicio) : 'início'} até ${filters.fim ? formatDateBR(filters.fim) : 'hoje'}`;

    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.text('Relatório de Saldo de Extras', 148, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Setor: ${setorLabel}  |  Período filtro: ${periodoLabel}  |  Total: ${filteredRecords.length}`, 148, 18, { align: 'center' });

    autoTable(doc, {
      startY: 22,
      margin: { left: 6, right: 6 },
      head: [exportHeaders],
      body: buildExportRows(filteredRecords),
      styles: { fontSize: 5.5, cellPadding: 1, overflow: 'linebreak' },
      headStyles: { fillColor: [5, 150, 105], fontSize: 5.5, cellPadding: 1 },
      columnStyles: {
        18: { cellWidth: 35 },
        19: { cellWidth: 28 },
      },
    });

    const totalPages = doc.getNumberOfPages();
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`${i} / ${totalPages}`, 290, 205, { align: 'right' });
    }

    doc.save(`${exportFileBaseName()}.pdf`);
  };

  const handleConfirmExport = () => {
    if (!exportFormat) return;
    if (filteredRecords.length === 0) {
      alert('Nenhum registro para exportar com os filtros atuais.');
      return;
    }
    if (exportFormat === 'csv') handleExportCSV();
    else handleExportPDF();
    setExportFormat(null);
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Saldo de Extras</h1>
        <p className="text-gray-500">Cadastre períodos por setor e acompanhe saldo e custos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {/* Período único para todos os cadastros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Período início *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Período fim *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de cadastros (setor + números) */}
          <div className="space-y-4">
            {cadastros.map((row, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Cadastro {cadastros.length > 1 ? idx + 1 : ''}</span>
                  {!editingId && cadastros.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCadastro(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover cadastro"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Setor *</label>
                    <select
                      className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={row.setor}
                      onChange={(e) => handleUpdateCadastro(idx, 'setor', e.target.value)}
                    >
                      <option value="">Selecione o setor</option>
                      {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  {[
                    ['Quadro aprovado', 'quadroAprovado'],
                    ['Quadro efetivo', 'quadroEfetivo'],
                    ['Domingos', 'domingos'],
                    ['Demanda', 'demanda'],
                    ['Atestado', 'atestado']
                  ].map(([label, key]) => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        value={row[key as keyof CadastroRow]}
                        onChange={(e) => handleUpdateCadastro(idx, key as keyof CadastroRow, e.target.value)}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Folgas <span className="text-gray-400 font-normal">(= Quadro efetivo)</span></label>
                    <input
                      type="number"
                      min={0}
                      readOnly
                      tabIndex={-1}
                      className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-100 text-gray-600 cursor-default"
                      value={row.quadroEfetivo}
                    />
                  </div>
                </div>
              </div>
            ))}

            {!editingId && (
              <button
                type="button"
                onClick={handleAddCadastro}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Adicionar cadastro
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
            >
              <Save size={18} /> {editingId ? 'Atualizar' : cadastros.filter(r => r.setor.trim()).length > 1 ? 'Salvar todos' : 'Salvar'} período
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="py-3 px-6 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Valor da diária (config)</label>
            <input
              type="number"
              min={0}
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={extraSaldoSettings.valorDiaria}
              onChange={(e) => updateExtraSaldoSettings({ valorDiaria: Number(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-gray-400 mt-1">Default: 130. Salvo como snapshot em cada registro.</p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter size={16} />
              <span className="text-sm font-bold uppercase">Filtros</span>
            </div>
            <select
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filters.setor}
              onChange={(e) => setFilters({ ...filters, setor: e.target.value })}
            >
              <option value="">Todos os setores</option>
              {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filters.inicio}
              onChange={(e) => setFilters({ ...filters, inicio: e.target.value })}
            />
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filters.fim}
              onChange={(e) => setFilters({ ...filters, fim: e.target.value })}
            />
            <button
              type="button"
              onClick={() => {
                setExportFormat(null);
                setIsExportModalOpen(true);
              }}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              title="Exportar saldo de extras filtrado em CSV ou PDF"
            >
              <Download size={18} />
              Exportar relatório
            </button>
          </div>
        </div>
      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Exportar Saldo de Extras</h2>
              <button
                type="button"
                onClick={() => {
                  setExportFormat(null);
                  setIsExportModalOpen(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Escolha o formato do relatório com os filtros já selecionados.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  exportFormat === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 hover:border-emerald-300 text-gray-700'
                }`}
              >
                <FileSpreadsheet size={28} />
                <span className="font-semibold text-sm">CSV</span>
                <span className="text-xs text-gray-500">Planilha (.csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 hover:border-emerald-300 text-gray-700'
                }`}
              >
                <FileText size={28} />
                <span className="font-semibold text-sm">PDF</span>
                <span className="text-xs text-gray-500">Documento (.pdf)</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setExportFormat(null);
                  setIsExportModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                disabled={!exportFormat}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Baixar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div
          className="overflow-x-scroll overflow-y-auto max-h-[min(70vh,calc(100vh-16rem))] [scrollbar-gutter:stable] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-400/80 [&::-webkit-scrollbar-track]:bg-gray-100"
          title="Role horizontalmente para ver todas as colunas"
        >
        <table className="min-w-max w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold tracking-wider sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Setor</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Período</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Aprovado</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Efetivo</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Folgas</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Domingos</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Demanda</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Atestado</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Aberto</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Vagas/dia</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Total diárias</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50" title="Dias solicitados no período (todas as solicitações)">Solicitado</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50" title="Dias aprovados de fato no período">Aprovado</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50" title="Estouro = Aprovado além do total de diárias (aprovado − total diárias)">Estouro</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Saldo</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Valor</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50">Saldo R$</th>
              <th className="px-4 py-3 whitespace-nowrap bg-gray-50 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.map(record => {
              const result = calculateExtraSaldo(record, record.valorDiariaSnapshot);
              const saldoClass = result.saldo < 0 ? 'text-red-600' : 'text-emerald-600';
              const solicitado = countWorkDaysInPeriod(record.setor, record.periodoInicio, record.periodoFim);
              const aprovado = countWorkDaysInPeriod(record.setor, record.periodoInicio, record.periodoFim, 'APROVADO');
              const estouro = Math.max(0, aprovado - result.totalDiarias);
              return (
                <tr key={record.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{record.setor}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateBR(record.periodoInicio)} → {formatDateBR(record.periodoFim)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.quadroAprovado}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.quadroEfetivo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.folgas}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.domingos}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.demanda}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.atestado}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{result.quadroAberto}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{result.vagasDiarias}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{result.totalDiarias}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{solicitado}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{aprovado}</td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${estouro > 0 ? 'text-red-600' : 'text-gray-400'}`}>{estouro > 0 ? estouro : '—'}</td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${saldoClass}`}>{result.saldo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{result.valor.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${saldoClass}`}>{result.saldoEmReais.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(record.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Deseja excluir este registro?')) return;
                          try {
                            await deleteExtraSaldoRecord(record.id);
                          } catch (error: any) {
                            alert(error?.message || 'Erro ao excluir no banco de dados.');
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-400" colSpan={18}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
          {filteredRecords.length > 0 && (
            <tfoot className="bg-gray-50 text-gray-700 font-bold">
              <tr>
                <td className="px-4 py-3" colSpan={8}>Totais</td>
                <td className="px-4 py-3" colSpan={3}></td>
                <td className="px-4 py-3">{totals.solicitado}</td>
                <td className="px-4 py-3">{totals.aprovado}</td>
                <td className={`px-4 py-3 ${totals.estouro > 0 ? 'text-red-600' : ''}`}>{totals.estouro > 0 ? totals.estouro : '—'}</td>
                <td className="px-4 py-3">{totals.saldo}</td>
                <td className="px-4 py-3">{totals.valor.toFixed(2)}</td>
                <td className="px-4 py-3">{totals.saldoEmReais.toFixed(2)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
};

export default ExtraSaldo;
