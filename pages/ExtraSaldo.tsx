import React, { useMemo, useState } from 'react';
import { Save, Trash2, Edit2, Filter } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { ExtraSaldoInput } from '../types';
import { calculateExtraSaldo } from '../services/extraSaldoService';
import { formatDateBR } from '../utils/date';

const ExtraSaldo: React.FC = () => {
  const {
    sectors,
    extraSaldoRecords,
    extraSaldoSettings,
    addExtraSaldoRecord,
    updateExtraSaldoRecord,
    deleteExtraSaldoRecord,
    updateExtraSaldoSettings
  } = useExtras();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ setor: '', inicio: '', fim: '' });
  const [formData, setFormData] = useState({
    setor: '',
    periodoInicio: '',
    periodoFim: '',
    quadroAprovado: '',
    quadroEfetivo: '',
    folgas: '',
    domingos: '',
    demanda: '',
    atestado: ''
  });

  const toNumber = (value: string) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleSave = async () => {
    if (!formData.setor || !formData.periodoInicio || !formData.periodoFim) {
      alert('Setor e período são obrigatórios.');
      return;
    }
    const input: ExtraSaldoInput = {
      setor: formData.setor,
      periodoInicio: formData.periodoInicio,
      periodoFim: formData.periodoFim,
      quadroAprovado: toNumber(formData.quadroAprovado),
      quadroEfetivo: toNumber(formData.quadroEfetivo),
      folgas: toNumber(formData.folgas),
      domingos: toNumber(formData.domingos),
      demanda: toNumber(formData.demanda),
      atestado: toNumber(formData.atestado),
      extrasSolicitados: 0
    };

    const existing = editingId ? extraSaldoRecords.find(r => r.id === editingId) : null;
    const valorDiariaSnapshot = existing?.valorDiariaSnapshot ?? extraSaldoSettings.valorDiaria;

    try {
      calculateExtraSaldo(input, valorDiariaSnapshot);
    } catch (err: any) {
      alert(err?.message || 'Erro ao calcular o saldo.');
      return;
    }

    try {
      if (editingId) {
        await updateExtraSaldoRecord(editingId, input, valorDiariaSnapshot);
      } else {
        await addExtraSaldoRecord(input, valorDiariaSnapshot);
      }
    } catch (error: any) {
      alert(error?.message || 'Erro ao salvar no banco de dados.');
      return;
    }

    setEditingId(null);
    setFormData({
      setor: '',
      periodoInicio: '',
      periodoFim: '',
      quadroAprovado: '',
      quadroEfetivo: '',
      folgas: '',
      domingos: '',
      demanda: '',
      atestado: ''
    });
  };

  const handleEdit = (id: string) => {
    const record = extraSaldoRecords.find(r => r.id === id);
    if (!record) return;
    setEditingId(id);
    setFormData({
      setor: record.setor,
      periodoInicio: record.periodoInicio,
      periodoFim: record.periodoFim,
      quadroAprovado: String(record.quadroAprovado),
      quadroEfetivo: String(record.quadroEfetivo),
      folgas: String(record.folgas),
      domingos: String(record.domingos),
      demanda: String(record.demanda),
      atestado: String(record.atestado)
    });
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
        acc.valor += result.valor;
        acc.saldo += result.saldo;
        acc.saldoEmReais += result.saldoEmReais;
        return acc;
      },
      { valor: 0, saldo: 0, saldoEmReais: 0 }
    );
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Saldo de Extras</h1>
        <p className="text-gray-500">Cadastre períodos por setor e acompanhe saldo e custos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Setor *</label>
              <select
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.setor}
                onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
              >
                <option value="">Selecione o setor</option>
                {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Período início *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.periodoInicio}
                onChange={(e) => setFormData({ ...formData, periodoInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Período fim *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.periodoFim}
                onChange={(e) => setFormData({ ...formData, periodoFim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Quadro aprovado', 'quadroAprovado'],
              ['Quadro efetivo', 'quadroEfetivo'],
              ['Folgas', 'folgas'],
              ['Domingos', 'domingos'],
              ['Demanda', 'demanda'],
              ['Atestado', 'atestado']
            ].map(([label, key]) => (
              <div key={key}>
                <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={(formData as any)[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
            >
              <Save size={18} /> {editingId ? 'Atualizar' : 'Salvar'} período
            </button>
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
                <td className="px-4 py-6 text-center text-gray-400" colSpan={15}>
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
