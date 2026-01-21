import React, { useMemo, useState } from 'react';
import { useExtras } from '../context/ExtraContext';

const ExtraBankForm: React.FC = () => {
  const { sectors, addExtra } = useExtras();
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    cpf: '',
    contact: '',
    address: '',
    emergencyContact: '',
    sector: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const isAdult = useMemo(() => {
    if (!formData.birthDate) return false;
    const birth = new Date(`${formData.birthDate}T00:00:00`);
    const today = new Date();
    const adultDate = new Date(birth);
    adultDate.setFullYear(adultDate.getFullYear() + 18);
    return adultDate <= today;
  }, [formData.birthDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) {
      alert('É necessário ter 18 anos ou mais para se cadastrar.');
      return;
    }
    if (!formData.fullName || !formData.birthDate || !formData.cpf || !formData.contact || !formData.address || !formData.emergencyContact || !formData.sector) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    addExtra({
      id: Math.random().toString(36).substr(2, 9),
      fullName: formData.fullName,
      birthDate: formData.birthDate,
      cpf: formData.cpf,
      contact: formData.contact,
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      sector: formData.sector,
      createdAt: new Date().toISOString()
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 max-w-md text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-emerald-900">Cadastro enviado</h1>
          <p className="text-gray-500 mt-3">Obrigado! Seus dados foram recebidos e já estão disponíveis para seleção.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-900">Banco de Extras</h1>
          <p className="text-sm text-gray-500">Preencha seus dados para entrar no banco de extras do Vivaz Cataratas.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Data de Nascimento *</label>
              <input
                required
                type="date"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
              {formData.birthDate && !isAdult && (
                <p className="text-xs text-red-500 mt-1">Apenas maiores de 18 anos.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">CPF *</label>
              <input
                required
                type="text"
                placeholder="000.000.000-00"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Contato *</label>
            <input
              required
              type="text"
              placeholder="Telefone ou WhatsApp"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Endereço *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Contato de Emergência *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Setor *</label>
            <select
              required
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
            >
              <option value="">Selecione o setor</option>
              {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
          >
            Enviar cadastro
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExtraBankForm;
