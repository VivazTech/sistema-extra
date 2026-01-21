
import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { SHIFTS } from '../constants';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose }) => {
  const { sectors, requesters, reasons, addRequest } = useExtras();
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
    urgency: false,
    observations: '',
    contact: ''
  });

  const availableRoles = sectors.find(s => s.name === formData.sector)?.roles || [];

  const addDays = (dateStr: string, days: number) => {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleAddDay = () => {
    if (formData.workDays.length >= 7) return;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasInvalidDay = formData.workDays.some(d => !d.date || !d.shift);
    if (!formData.sector || !formData.role || !formData.extraName || !formData.value || hasInvalidDay) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    addRequest({
      ...formData,
      leaderId: user?.id || 'unknown',
      leaderName: user?.name || 'unknown'
    });
    
    onClose();
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Setor *</label>
              <select 
                required
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value, role: '' })}
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
                  disabled={formData.workDays.length >= 7}
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
              <p className="text-[10px] text-gray-400">Máximo de 7 dias por solicitação.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nome do Extra *</label>
              <input 
                required
                type="text"
                placeholder="Nome completo do funcionário"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.extraName}
                onChange={(e) => setFormData({ ...formData, extraName: e.target.value })}
              />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="text-xs font-bold text-gray-500 uppercase">Contato/Doc (Opcional)</label>
              <input 
                type="text"
                placeholder="Telefone ou CPF"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Motivo da Contratação *</label>
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

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                className="w-5 h-5 accent-amber-600 rounded"
                checked={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.checked })}
              />
              <div className="flex-1">
                <span className="font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle size={16} /> Solicitação de Urgência
                </span>
                <p className="text-xs text-amber-700 mt-0.5">
                  Marcando esta opção, a solicitação será aprovada automaticamente.
                </p>
              </div>
            </label>
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
