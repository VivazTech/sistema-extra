
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { useActionLog } from '../context/ActionLogContext';
import { SHIFTS } from '../constants';
import type { ExtraRequest } from '../types';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Quando definido, o modal abre em modo edição para esta solicitação (somente ADMIN). */
  initialRequest?: ExtraRequest | null;
}

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sectorNamesSet = (sectors: { name: string }[]) => new Set(sectors.map(s => s.name));
const getValidSectorNames = (extra: { sector?: string; sectors?: string[] }, validNames: Set<string>) => {
  const list = extra.sectors?.length ? extra.sectors : (extra.sector ? [extra.sector] : []);
  return list.filter((n): n is string => !!n && validNames.has(n));
};

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose, initialRequest = null }) => {
  const { sectors, requesters, reasons, shifts, extras, addRequest, updateRequest, getSaldoForWeek } = useExtras();
  const validSectorNames = useMemo(() => sectorNamesSet(sectors), [sectors]);
  const { logAction } = useActionLog();
  const isEditMode = !!initialRequest?.id;
  const { user } = useAuth();
  const todayStr = getTodayDateString();
  const shiftOptions = shifts.length > 0 ? shifts.map(s => s.name) : [...SHIFTS];
  const defaultShift = shiftOptions[0] || 'Manhã';

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    sector: '',
    role: '',
    workDays: [
      {
        date: todayStr,
        shift: defaultShift,
      },
    ],
    requester: '',
    reason: '',
    extraName: '',
    valueType: 'por_hora' as 'combinado' | 'por_hora',
    value: 0,
    observations: '',
    eventName: '' as string,
  });
  const isEventoReason = (formData.reason || '').toUpperCase() === 'EVENTO';
  const isTesteReason = (formData.reason || '').toUpperCase() === 'TESTE';

  const isLeaderWithSector = user?.role === 'LEADER' && user.sectors?.length;
  const leaderSector = isLeaderWithSector ? user.sectors![0] : null;
  const effectiveSector = formData.sector || leaderSector || '';
  const availableRoles = sectors.find(s => s.name === effectiveSector)?.roles || [];
  const isAdmin = user?.role === 'ADMIN';

  // Setores disponíveis no dropdown: admin vê todos; demais usuários só os setores vinculados a eles
  const availableSectors = useMemo(() => {
    if (isAdmin) return sectors;
    const userSectorNames = user?.sectors;
    if (!userSectorNames?.length) return sectors;
    return sectors.filter(s => userSectorNames.includes(s.name));
  }, [sectors, isAdmin, user?.sectors]);
  const availableRequesters = useMemo(() => {
    if (isAdmin) return requesters;
    const leaderName = user?.name;
    if (!leaderName) return requesters;
    const found = requesters.filter(r => r.name === leaderName);
    return found.length > 0 ? found : [{ id: 'current', name: leaderName }];
  }, [isAdmin, requesters, user?.name]);

  const selectedReason = useMemo(
    () => (formData.reason ? reasons.find((r) => r.name === formData.reason) : null),
    [reasons, formData.reason]
  );
  const maxValueForReason = selectedReason?.maxValue;
  const testeNeedsMaxValue = isTesteReason && maxValueForReason == null;
  // Extras do setor selecionado. Admin: qualquer extra do setor (e de outros). Não-admin: só extras cadastrados em setores daquele usuário.
  const availableExtras = useMemo(() => {
    if (!effectiveSector) return extras;
    const matchEffective = (e: typeof extras[0]) =>
      e.sectors?.includes(effectiveSector) || e.sector === effectiveSector;
    if (isAdmin) {
      return extras.filter(matchEffective);
    }
    const userSectors = user?.sectors;
    if (!userSectors?.length) return extras.filter(matchEffective);
    return extras.filter(e => {
      if (!matchEffective(e)) return false;
      const inUserSector = e.sectors?.some(s => userSectors.includes(s)) || (e.sector && userSectors.includes(e.sector));
      return inUserSector;
    });
  }, [extras, effectiveSector, isAdmin, user?.sectors]);

  // Calcular saldo disponível para a semana da primeira data selecionada
  const saldoDisponivel = useMemo(() => {
    if (!effectiveSector || !formData.workDays.length || !formData.workDays[0].date) {
      return null;
    }
    return getSaldoForWeek(effectiveSector, formData.workDays[0].date);
  }, [effectiveSector, formData.workDays, getSaldoForWeek]);

  const addDays = (dateStr: string, days: number) => {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleAddDay = () => {
    // EVENTO não desconta saldo: permitir até 7 dias sem limitar pelo saldo
    const maxDays = isEventoReason
      ? 7
      : (saldoDisponivel !== null && saldoDisponivel !== 'no-record' ? Math.min(saldoDisponivel, 7) : 7);
    
    if (formData.workDays.length >= maxDays) {
      if (saldoDisponivel !== null && saldoDisponivel !== 'no-record' && saldoDisponivel <= formData.workDays.length) {
        alert(`Você não pode adicionar mais dias. O saldo disponível é de ${saldoDisponivel} ${saldoDisponivel === 1 ? 'dia' : 'dias'}.`);
      } else {
        alert('Máximo de 7 dias por solicitação.');
      }
      return;
    }
    
    const lastDay = formData.workDays[formData.workDays.length - 1];
    const nextDate = lastDay?.date ? addDays(lastDay.date, 1) : new Date().toISOString().split('T')[0];
    const nextShift = lastDay?.shift || defaultShift;
    setFormData({
      ...formData,
      workDays: [...formData.workDays, { date: nextDate, shift: nextShift }],
    });
  };

  const handleRemoveDay = (idx: number) => {
    if (formData.workDays.length <= 1) return;
    setFormData({
      ...formData,
      workDays: formData.workDays.filter((_, i) => i !== idx),
    });
  };

  const handleUpdateDay = (idx: number, field: 'date' | 'shift', value: string) => {
    const normalizedValue = field === 'date' && !isAdmin && value < todayStr ? todayStr : value;
    const updated = [...formData.workDays];
    updated[idx] = { ...updated[idx], [field]: normalizedValue };
    setFormData({ ...formData, workDays: updated });
  };

  useEffect(() => {
    if (isOpen) {
      const initialShift = shiftOptions[0] || 'Manhã';
      if (initialRequest) {
        setFormData({
          sector: initialRequest.sector,
          role: initialRequest.role,
          workDays: initialRequest.workDays?.length
            ? initialRequest.workDays.map((d) => ({ date: d.date, shift: d.shift }))
            : [{ date: todayStr, shift: initialShift }],
          requester: initialRequest.requester,
          reason: initialRequest.reason,
          extraName: initialRequest.extraName,
          valueType: initialRequest.valueType ?? 'por_hora',
          value: initialRequest.value,
          observations: initialRequest.observations || '',
          eventName: initialRequest.eventName || '',
        });
      } else {
        setFormData(prev => ({
          ...prev,
          sector: leaderSector ?? '',
          role: '',
          workDays: [{ date: todayStr, shift: initialShift }],
          requester: user?.name ?? '',
          reason: '',
          extraName: '',
          valueType: 'por_hora',
          value: 0,
          observations: '',
          eventName: '',
        }));
      }
    }
  }, [isOpen, todayStr, shiftOptions.join(','), leaderSector, initialRequest?.id, user?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const hasInvalidDay = formData.workDays.some(d => !d.date || !d.shift);
    if (!formData.sector || !formData.role || !formData.extraName || !formData.value || hasInvalidDay) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (isEventoReason && !(formData.eventName || '').trim()) {
      alert('Para motivo EVENTO, informe o nome do evento.');
      return;
    }
    const selectedReasonConfig = reasons.find((r) => r.name === formData.reason);
    const reasonLimit = selectedReasonConfig?.maxValue;
    // Motivo TESTE exige valor máximo definido pelo admin no painel de Cadastros
    if (isTesteReason && (reasonLimit == null || reasonLimit === undefined)) {
      alert('O motivo TESTE exige um valor máximo definido pelo administrador. Configure em Cadastros > Motivos da Solicitação (Valor máx. em R$).');
      return;
    }
    if (reasonLimit != null && formData.value > reasonLimit) {
      alert(`O valor não pode ser maior que o limite do motivo (R$ ${reasonLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`);
      return;
    }
    if (!isAdmin && formData.workDays.some(d => d.date < todayStr)) {
      alert('Apenas administradores podem criar solicitações para datas passadas.');
      return;
    }

    try {
      setIsSaving(true);
      if (isEditMode && initialRequest) {
        await updateRequest(initialRequest.id, {
          sector: formData.sector,
          role: formData.role,
          requester: formData.requester,
          reason: formData.reason,
          extraName: formData.extraName,
          valueType: formData.valueType,
          value: formData.value,
          observations: formData.observations || undefined,
          eventName: isEventoReason ? (formData.eventName || undefined) : undefined,
          workDays: formData.workDays.map(d => ({ date: d.date, shift: d.shift })),
        });
        logAction('Solicitações > Editar solicitação', 'OK', { requestId: initialRequest.id, code: initialRequest.code });
        onClose();
        return;
      }
      // Validar se user.id é UUID válido
      if (!user?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
        alert('Erro: Usuário não autenticado corretamente. Por favor, faça login novamente.');
        return;
      }

      await addRequest({
        ...formData,
        valueType: isAdmin ? formData.valueType : 'combinado',
        leaderId: user.id,
        leaderName: user.name || 'Usuário'
      });
      logAction('Solicitações > Solicitar funcionário extra', 'Solicitação criada', { setor: formData.sector, extraName: formData.extraName });
      setFormData({
        sector: '',
        role: '',
        workDays: [{ date: todayStr, shift: defaultShift }],
        requester: '',
        reason: '',
        extraName: '',
        valueType: 'por_hora',
        value: 0,
        observations: '',
        eventName: '',
      });
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar solicitação';
      logAction('Solicitações > Solicitar funcionário extra', `Erro: ${msg}`);
      console.error('Erro ao salvar solicitação:', error);
      alert('Erro ao salvar solicitação. Verifique o console para mais detalhes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-900 text-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">{isEditMode ? 'Editar Solicitação' : 'Solicitar Funcionário Extra'}</h2>
            <p className="text-xs text-emerald-300 opacity-80">{isEditMode ? 'Altere os campos desejados e salve.' : 'Preencha todos os campos obrigatórios (*)'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Saldo de Extras Disponível */}
          {effectiveSector && formData.workDays.length > 0 && formData.workDays[0].date && saldoDisponivel !== null && (
            <div className={`rounded-xl p-4 border-2 ${
              saldoDisponivel === 'no-record'
                ? 'bg-gray-50 border-gray-200'
                : saldoDisponivel > 0 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : saldoDisponivel === 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {saldoDisponivel === 'no-record' ? (
                  <AlertCircle className="text-gray-500 mt-0.5" size={20} />
                ) : saldoDisponivel > 0 ? (
                  <CheckCircle className="text-emerald-600 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className={saldoDisponivel === 0 ? 'text-amber-600' : 'text-red-600'} size={20} />
                )}
                <div className="flex-1">
                  <h3 className={`font-bold text-sm mb-1 ${
                    saldoDisponivel === 'no-record'
                      ? 'text-gray-900'
                      : saldoDisponivel > 0 
                        ? 'text-emerald-900' 
                        : saldoDisponivel === 0
                          ? 'text-amber-900'
                          : 'text-red-900'
                  }`}>
                    Saldo de Extras Disponível
                  </h3>
                  <p className={`text-sm ${
                    saldoDisponivel === 'no-record'
                      ? 'text-gray-700'
                      : saldoDisponivel > 0 
                        ? 'text-emerald-700' 
                        : saldoDisponivel === 0
                          ? 'text-amber-700'
                          : 'text-red-700'
                  }`}>
                    {saldoDisponivel === 'no-record' ? (
                      <>Não há registro de saldo cadastrado para o setor <strong>{effectiveSector}</strong> nesta semana. Cadastre um registro em "Saldo de Extras" para acompanhar a disponibilidade.</>
                    ) : saldoDisponivel > 0 ? (
                      <>Você pode contratar <strong>{saldoDisponivel}</strong> {saldoDisponivel === 1 ? 'extra' : 'extras'} nesta semana para o setor <strong>{effectiveSector}</strong>.</>
                    ) : saldoDisponivel === 0 ? (
                      <>O saldo de extras está zerado para o setor <strong>{effectiveSector}</strong> nesta semana. A solicitação ainda pode ser feita, mas será necessário revisar o saldo.</>
                    ) : (
                      <>O saldo de extras está negativo (<strong>{saldoDisponivel}</strong>) para o setor <strong>{effectiveSector}</strong> nesta semana. A solicitação ainda pode ser feita, mas será necessário revisar o saldo.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Setor *</label>
              <select
                required
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.sector || leaderSector || ''}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value, role: '', extraName: '' })}
              >
                <option value="">Selecione o setor</option>
                {availableSectors.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              {!isAdmin && availableSectors.length > 0 && (
                <p className="text-xs text-gray-500">Setores vinculados ao seu usuário.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Função *</label>
              <select 
                required
                disabled={!formData.sector}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="">Selecione a função</option>
                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase">Dias de Trabalho *</label>
                <button
                  type="button"
                  onClick={handleAddDay}
                  disabled={
                    saldoDisponivel !== null && saldoDisponivel !== 'no-record'
                      ? formData.workDays.length >= Math.min(saldoDisponivel, 7)
                      : formData.workDays.length >= 7
                  }
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:text-gray-300"
                >
                  + Adicionar dia
                </button>
              </div>
              <div className="space-y-3">
                {formData.workDays.map((day, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dia {idx + 1}</label>
                      <input
                        required
                        type="date"
                        className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={day.date}
                        {...(isAdmin ? {} : { min: todayStr })}
                        onChange={(e) => handleUpdateDay(idx, 'date', e.target.value)}
                        title={isAdmin ? 'Administradores podem selecionar datas passadas' : 'Selecione a data de hoje ou futura'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turno</label>
                      <select
                        required
                        className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={day.shift}
                        onChange={(e) => handleUpdateDay(idx, 'shift', e.target.value)}
                      >
                        {shiftOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(idx)}
                        disabled={formData.workDays.length <= 1}
                        className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-red-600 disabled:text-gray-200"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
                {saldoDisponivel !== null && saldoDisponivel !== 'no-record' ? (
                  <>Você pode adicionar até <strong>{Math.min(saldoDisponivel, 7)}</strong> {Math.min(saldoDisponivel, 7) === 1 ? 'dia' : 'dias'} (saldo disponível: {saldoDisponivel}). Máximo de 7 dias por solicitação.</>
                ) : (
                  <>Máximo de 7 dias por solicitação.</>
                )}
                {!isAdmin && ' Apenas datas de hoje em diante.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nome do Extra *</label>
              <select 
                required
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.extraName}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    extraName: e.target.value
                  });
                }}
              >
                <option value="">Selecione o extra</option>
                {extras.length === 0 && (
                  <option value="" disabled>Nenhum extra cadastrado no banco</option>
                )}
                {formData.sector && availableExtras.length === 0 && extras.length > 0 && (
                  <option value="" disabled>Nenhum extra cadastrado para este setor</option>
                )}
                {formData.sector ? (
                  <>
                    {availableExtras.map(extra => {
                      const extraSectors = getValidSectorNames(extra, validSectorNames);
                      const label = extraSectors.length ? `${extra.fullName} (${extraSectors.join(', ')})` : extra.fullName;
                      return (
                        <option key={extra.id} value={extra.fullName}>
                          {label}
                        </option>
                      );
                    })}
                    {isAdmin && extras.filter(e => !availableExtras.some(a => a.id === e.id)).map(extra => {
                      const extraSectors = getValidSectorNames(extra, validSectorNames);
                      return (
                        <option key={extra.id} value={extra.fullName}>
                          {extra.fullName} ({extraSectors.length ? extraSectors.join(', ') : 'Sem setor'})
                        </option>
                      );
                    })}
                  </>
                ) : (
                  isAdmin
                    ? extras.map(extra => {
                        const extraSectors = getValidSectorNames(extra, validSectorNames);
                        return (
                          <option key={extra.id} value={extra.fullName}>
                            {extra.fullName} {extraSectors.length ? `(${extraSectors.join(', ')})` : '(Sem setor)'}
                          </option>
                        );
                      })
                    : null
                )}
              </select>
              {extras.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Nenhum extra cadastrado. Cadastre extras no "Banco de Extras" primeiro.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Valor (R$) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                {...(maxValueForReason != null && { max: maxValueForReason })}
                placeholder={maxValueForReason != null ? `Máx. ${maxValueForReason.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '0,00'}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.value ?? ''}
                onChange={(e) => {
                  let val = parseFloat(e.target.value);
                  if (maxValueForReason != null && !Number.isNaN(val) && val > maxValueForReason) {
                    val = maxValueForReason;
                  }
                  setFormData({ ...formData, value: Number.isNaN(val) ? 0 : val });
                }}
              />
              {maxValueForReason != null && (
                <p className="text-xs text-gray-500">
                  Limite para este motivo: R$ {maxValueForReason.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Demandante *</label>
            <select
              required
              disabled={!isAdmin}
              className={`w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none ${!isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              value={formData.requester}
              onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
              title={!isAdmin ? 'Apenas administradores podem alterar o demandante.' : undefined}
            >
              <option value="">Selecione o demandante</option>
              {availableRequesters.length === 0 && <option value="" disabled>Cadastre demandantes no painel</option>}
              {availableRequesters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            {!isAdmin && <p className="text-xs text-gray-500">O demandante é você (líder da solicitação).</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Motivo da Solicitação *</label>
            <select
              required
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.reason}
              onChange={(e) => {
                const reasonName = e.target.value;
                const reason = reasons.find((r) => r.name === reasonName);
                let newValue = formData.value ?? 0;
                if (reason?.maxValue != null && newValue > reason.maxValue) {
                  newValue = reason.maxValue;
                }
                setFormData({ ...formData, reason: reasonName, value: newValue });
              }}
            >
              <option value="">Selecione o motivo</option>
              {reasons.length === 0 && <option value="" disabled>Cadastre motivos no painel</option>}
              {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          {testeNeedsMaxValue && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              O motivo <strong>TESTE</strong> exige um valor máximo definido pelo administrador em <strong>Cadastros &gt; Motivos da Solicitação</strong> (campo Valor máx. em R$). Até lá, não será possível salvar a solicitação.
            </div>
          )}

          {isEventoReason && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nome do evento *</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex.: Festa de Confraternização"
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              />
            </div>
          )}

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving || testeNeedsMaxValue}
              className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              title={testeNeedsMaxValue ? 'Defina o valor máximo para o motivo TESTE em Cadastros' : undefined}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} /> Salvar Solicitação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestModal;
