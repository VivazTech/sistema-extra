import React, { useMemo, useState } from 'react';
import { Save, Trash2, Edit2, Filter, Plus } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { ExtraSaldoInput } from '../types';
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

const emptyRow = (): CadastroRow => ({
  setor: '',
  quadroAprovado: '',
  quadroEfetivo: '',
  folgas: '',
  domingos: '',
  demanda: '',
  atestado: ''
});

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
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3">Setor</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Aprovado</th>
              <th className="px-4 py-3">Efetivo</th>
              <th className="px-4 py-3">Folgas</th>
              <th className="px-4 py-3">Domingos</th>
              <th className="px-4 py-3">Demanda</th>
              <th className="px-4 py-3">Atestado</th>
              <th className="px-4 py-3">Aberto</th>
              <th className="px-4 py-3">Vagas/dia</th>
              <th className="px-4 py-3">Total diárias</th>
              <th className="px-4 py-3" title="Dias solicitados no período (todas as solicitações)">Solicitado</th>
              <th className="px-4 py-3" title="Dias aprovados de fato no período">Aprovado</th>
              <th className="px-4 py-3" title="Estouro = Aprovado além do total de diárias (aprovado − total diárias)">Estouro</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Saldo R$</th>
              <th className="px-4 py-3 text-center">Ações</th>
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
                  <td className="px-4 py-3 font-semibold">{record.setor}</td>
                  <td className="px-4 py-3">{formatDateBR(record.periodoInicio)} → {formatDateBR(record.periodoFim)}</td>
                  <td className="px-4 py-3">{record.quadroAprovado}</td>
                  <td className="px-4 py-3">{record.quadroEfetivo}</td>
                  <td className="px-4 py-3">{record.folgas}</td>
                  <td className="px-4 py-3">{record.domingos}</td>
                  <td className="px-4 py-3">{record.demanda}</td>
                  <td className="px-4 py-3">{record.atestado}</td>
                  <td className="px-4 py-3">{result.quadroAberto}</td>
                  <td className="px-4 py-3">{result.vagasDiarias}</td>
                  <td className="px-4 py-3">{result.totalDiarias}</td>
                  <td className="px-4 py-3">{solicitado}</td>
                  <td className="px-4 py-3 font-medium">{aprovado}</td>
                  <td className={`px-4 py-3 font-bold ${estouro > 0 ? 'text-red-600' : 'text-gray-400'}`}>{estouro > 0 ? estouro : '—'}</td>
                  <td className={`px-4 py-3 font-bold ${saldoClass}`}>{result.saldo}</td>
                  <td className="px-4 py-3">{result.valor.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-bold ${saldoClass}`}>{result.saldoEmReais.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
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
  );
};

export default ExtraSaldo;
