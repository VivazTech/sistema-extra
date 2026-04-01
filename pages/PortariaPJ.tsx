import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Search,
  LogIn,
  LogOut,
  Coffee,
  Check,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUpDown,
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { TimeRecord } from '../types';
import { supabase } from '../services/supabase';
import { formatDateBR } from '../utils/date';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PortariaPJ: React.FC = () => {
  const { pjEmployees, sectors, updatePjTimeRecord } = useExtras();
  const { user } = useAuth();
  const adminCanEditTimes = user?.role === 'ADMIN';
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'recent'>('alphabetical');
  const [workDate, setWorkDate] = useState(() => toLocalDateStr(new Date()));
  const [recordsByEmp, setRecordsByEmp] = useState<Record<string, TimeRecord>>({});
  const [timeDraft, setTimeDraft] = useState<Record<string, Partial<TimeRecord>>>({});
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadDayRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('pj_time_records')
        .select('*')
        .eq('work_date', workDate);
      if (error) throw error;
      const next: Record<string, TimeRecord> = {};
      (data || []).forEach((row: any) => {
        next[row.pj_employee_id] = {
          arrival: row.arrival || undefined,
          breakStart: row.break_start || undefined,
          breakEnd: row.break_end || undefined,
          departure: row.departure || undefined,
          observations: row.observations || undefined,
        };
      });
      setRecordsByEmp(next);
      setTimeDraft({});
    } catch (e) {
      console.error(e);
      setRecordsByEmp({});
    } finally {
      setLoadingRecords(false);
    }
  }, [workDate]);

  useEffect(() => {
    void loadDayRecords();
  }, [loadDayRecords]);

  const filtered = useMemo(() => {
    let list = [...pjEmployees];
    if (selectedSector !== 'TODOS') {
      list = list.filter((e) => e.sector === selectedSector);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.sector || '').toLowerCase().includes(q)
      );
    }
    if (sortOrder === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } else {
      list.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
    }
    return list;
  }, [pjEmployees, selectedSector, searchTerm, sortOrder]);

  const getDisplayTime = (empId: string, field: keyof TimeRecord): string => {
    const draft = timeDraft[empId];
    const saved = recordsByEmp[empId];
    const v = draft?.[field] ?? saved?.[field];
    return v != null ? String(v) : '';
  };

  const getCurrentTime = () => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  };

  const setDraftField = (empId: string, field: keyof TimeRecord, value: string) => {
    setTimeDraft((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const buildMergedRecord = (empId: string): TimeRecord => {
    const saved = recordsByEmp[empId] || {};
    const draft = timeDraft[empId] || {};
    return {
      arrival: draft.arrival ?? saved.arrival,
      breakStart: draft.breakStart ?? saved.breakStart,
      breakEnd: draft.breakEnd ?? saved.breakEnd,
      departure: draft.departure ?? saved.departure,
      observations: draft.observations ?? saved.observations,
    };
  };

  const handleRegister = async (
    empId: string,
    field: 'arrival' | 'breakStart' | 'breakEnd' | 'departure'
  ) => {
    const display = getDisplayTime(empId, field).trim();
    const value = display || getCurrentTime();
    const merged = buildMergedRecord(empId);
    const updated: TimeRecord = { ...merged, [field]: value };
    setSavingKey(`${empId}-${field}`);
    try {
      await updatePjTimeRecord(empId, workDate, updated, user?.name || 'Portaria');
      setRecordsByEmp((prev) => ({ ...prev, [empId]: updated }));
      setTimeDraft((prev) => {
        const next = { ...prev };
        if (next[empId]) {
          const { [field]: _, ...rest } = next[empId];
          next[empId] = rest as Partial<TimeRecord>;
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar horário. Tente novamente.');
    } finally {
      setSavingKey(null);
    }
  };

  /** Horário já preenchido não pode ser alterado por portaria/líder; ADMIN pode reeditar. */
  const isLocked = (empId: string, field: keyof TimeRecord) => {
    if (adminCanEditTimes) return false;
    const v = getDisplayTime(empId, field);
    return v !== '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-gray-900 space-y-6 p-6">
        <header className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-violet-600" size={28} />
              Portaria PJ — Registro de Ponto
            </h1>
            <p className="text-gray-500 mt-1">
              Funcionários PJ (sem vínculo com valores de extras). Apenas controle de horário.
            </p>
            {adminCanEditTimes && (
              <p className="text-xs text-violet-700 font-medium mt-2">
                Perfil administrador: você pode alterar qualquer horário já registrado — ajuste o campo e clique em Registrar.
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-violet-600">
              {formatDateBR(new Date()).slice(0, 5)}
            </div>
            <div className="text-xs text-gray-500 uppercase font-bold">
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date())}
            </div>
          </div>
        </header>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por nome ou setor..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ArrowUpDown size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Ordenar:</span>
              <button
                type="button"
                onClick={() => setSortOrder('alphabetical')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                  sortOrder === 'alphabetical'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ArrowUpAZ size={16} />
                Alfabética
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('recent')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                  sortOrder === 'recent'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ArrowDownAZ size={16} />
                Nome (Z–A)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
              Data do ponto
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </label>
            <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
              Setor
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-[180px] focus:ring-2 focus:ring-violet-500 outline-none bg-white"
              >
                <option value="TODOS">Todos</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {loadingRecords && (
              <span className="text-xs text-violet-600 font-medium">Carregando horários…</span>
            )}
          </div>
        </div>

        {pjEmployees.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900">
            <p className="font-bold">Nenhum funcionário PJ cadastrado.</p>
            <p className="text-sm mt-2">
              Cadastre em <strong>Cadastros</strong> → Funcionários PJ (nome e setor).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((emp) => {
              const tr = recordsByEmp[emp.id] || {};
              const complete =
                !!(tr.arrival && tr.breakStart && tr.breakEnd && tr.departure);
              return (
                <div
                  key={emp.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    complete ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-100'
                  }`}
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{emp.name}</h3>
                      <p className="text-xs text-gray-500 uppercase font-bold">{emp.sector || '—'}</p>
                    </div>
                    {complete && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Check size={14} /> Dia completo
                      </span>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(
                      [
                        { key: 'arrival' as const, label: 'Entrada', icon: LogIn },
                        { key: 'breakStart' as const, label: 'Saída intervalo', icon: Coffee },
                        { key: 'breakEnd' as const, label: 'Volta intervalo', icon: Coffee },
                        { key: 'departure' as const, label: 'Saída final', icon: LogOut },
                      ] as const
                    ).map(({ key, label, icon: Icon }) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Icon size={14} /> {label}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm disabled:bg-gray-100"
                            value={getDisplayTime(emp.id, key)}
                            onChange={(e) => setDraftField(emp.id, key, e.target.value)}
                            disabled={isLocked(emp.id, key)}
                          />
                          <button
                            type="button"
                            disabled={isLocked(emp.id, key) || savingKey === `${emp.id}-${key}`}
                            onClick={() => handleRegister(emp.id, key)}
                            className="px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {adminCanEditTimes && getDisplayTime(emp.id, key) ? 'Salvar' : 'Registrar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortariaPJ;
