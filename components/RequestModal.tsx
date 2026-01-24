
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { SHIFTS } from '../constants';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose }) => {
  const { sectors, requesters, reasons, extras, addRequest, getSaldoForWeek } = useExtras();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    sector: '',
    role: '',
    workDays: [
      {
        date: new Date().toISOString().split('T')[0],
        shift: 'Manhã' as any,
      },
    ],
    requester: '',
    reason: '',
    extraName: '',
    value: 0,
    observations: ''
  });

  const availableRoles = sectors.find(s => s.name === formData.sector)?.roles || [];
  // Mostrar todos os extras do banco, mas priorizar os do setor selecionado
  const availableExtras = formData.sector 
    ? extras.filter(e => e.sector === formData.sector)
    : extras;

  // Calcular saldo disponível para a semana da primeira data selecionada
  const saldoDisponivel = useMemo(() => {
    if (!formData.sector || !formData.workDays.length || !formData.workDays[0].date) {
      return null;
    }
    return getSaldoForWeek(formData.sector, formData.workDays[0].date);
  }, [formData.sector, formData.workDays, getSaldoForWeek]);

  const addDays = (dateStr: string, days: number) => {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleAddDay = () => {
    // Verificar limite baseado no saldo disponível
    const maxDays = saldoDisponivel !== null && saldoDisponivel !== 'no-record' 
      ? Math.min(saldoDisponivel, 7) 
      : 7;
    
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
    const nextShift = lastDay?.shift || 'Manhã';
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
    const updated = [...formData.workDays];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, workDays: updated });
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        sector: '',
        role: '',
        workDays: [
          {
            date: new Date().toISOString().split('T')[0],
            shift: 'Manhã' as any,
          },
        ],
      }));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasInvalidDay = formData.workDays.some(d => !d.date || !d.shift);
    if (!formData.sector || !formData.role || !formData.extraName || !formData.value || hasInvalidDay) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    try {
      // Validar se user.id é UUID válido
      if (!user?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
        alert('Erro: Usuário não autenticado corretamente. Por favor, faça login novamente.');
        return;
      }

      await addRequest({
        ...formData,
        leaderId: user.id,
        leaderName: user.name || 'Usuário'
      });
      
      // Limpar formulário
      setFormData({
        sector: '',
        role: '',
        workDays: [{
          date: new Date().toISOString().split('T')[0],
          shift: 'Manhã' as any,
        }],
        requester: '',
        reason: '',
        extraName: '',
        value: 0,
        observations: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar solicitação:', error);
      alert('Erro ao salvar solicitação. Verifique o console para mais detalhes.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-900 text-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">Solicitar Funcionário Extra</h2>
            <p className="text-xs text-emerald-300 opacity-80">Preencha todos os campos obrigatórios (*)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Saldo de Extras Disponível */}
          {formData.sector && formData.workDays.length > 0 && formData.workDays[0].date && saldoDisponivel !== null && (
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
                      <>Não há registro de saldo cadastrado para o setor <strong>{formData.sector}</strong> nesta semana. Cadastre um registro em "Saldo de Extras" para acompanhar a disponibilidade.</>
                    ) : saldoDisponivel > 0 ? (
                      <>Você pode contratar <strong>{saldoDisponivel}</strong> {saldoDisponivel === 1 ? 'extra' : 'extras'} nesta semana para o setor <strong>{formData.sector}</strong>.</>
                    ) : saldoDisponivel === 0 ? (
                      <>O saldo de extras está zerado para o setor <strong>{formData.sector}</strong> nesta semana. A solicitação ainda pode ser feita, mas será necessário revisar o saldo.</>
                    ) : (
                      <>O saldo de extras está negativo (<strong>{saldoDisponivel}</strong>) para o setor <strong>{formData.sector}</strong> nesta semana. A solicitação ainda pode ser feita, mas será necessário revisar o saldo.</>
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
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value, role: '', extraName: '' })}
              >
                <option value="">Selecione o setor</option>
                {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
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
                        onChange={(e) => handleUpdateDay(idx, 'date', e.target.value)}
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
                        {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  // Se tem setor selecionado, mostrar primeiro os do setor, depois os outros
                  <>
                    {availableExtras.map(extra => (
                      <option key={extra.id} value={extra.fullName}>
                        {extra.fullName} {extra.sector !== formData.sector ? `(${extra.sector})` : ''}
                      </option>
                    ))}
                    {extras.filter(e => e.sector !== formData.sector).map(extra => (
                      <option key={extra.id} value={extra.fullName}>
                        {extra.fullName} ({extra.sector})
                      </option>
                    ))}
                  </>
                ) : (
                  // Se não tem setor, mostrar todos agrupados
                  extras.map(extra => (
                    <option key={extra.id} value={extra.fullName}>
                      {extra.fullName} {extra.sector ? `(${extra.sector})` : ''}
                    </option>
                  ))
                )}
              </select>
              {extras.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Nenhum extra cadastrado. Cadastre extras no "Banco de Extras" primeiro.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Valor Combinado (R$) *</label>
              <input 
                required
                type="number"
                step="0.01"
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Demandante *</label>
            <select 
              required
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.requester}
              onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
            >
              <option value="">Selecione o demandante</option>
              {requesters.length === 0 && <option value="" disabled>Cadastre demandantes no painel</option>}
              {requesters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Motivo da Solicitação *</label>
            <select 
              required
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            >
              <option value="">Selecione o motivo</option>
              {reasons.length === 0 && <option value="" disabled>Cadastre motivos no painel</option>}
              {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
            >
              <Save size={20} /> Salvar Solicitação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestModal;
