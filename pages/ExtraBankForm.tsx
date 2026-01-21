import React, { useMemo, useState } from 'react';
import { useExtras } from '../context/ExtraContext';

const ExtraBankForm: React.FC = () => {
  const { sectors, addExtra } = useExtras();
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    cpf: '',
    isForeign: false,
    foreignDoc: '',
    ddiContact: '+55',
    contactNumber: '',
    ddiEmergency: '+55',
    emergencyContactNumber: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    sector: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [cepError, setCepError] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);

  const isAdult = useMemo(() => {
    if (!formData.birthDate) return false;
    const birth = new Date(`${formData.birthDate}T00:00:00`);
    const today = new Date();
    const adultDate = new Date(birth);
    adultDate.setFullYear(adultDate.getFullYear() + 18);
    return adultDate <= today;
  }, [formData.birthDate]);

  const maskCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const parts = [
      digits.slice(0, 3),
      digits.slice(3, 6),
      digits.slice(6, 9),
      digits.slice(9, 11)
    ].filter(Boolean);
    if (parts.length <= 3) {
      return parts.join('.');
    }
    return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
  };

  const isValidCpf = (cpfValue: string) => {
    const cpf = cpfValue.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += parseInt(cpf[i], 10) * (10 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== parseInt(cpf[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += parseInt(cpf[i], 10) * (11 - i);
    check = (sum * 10) % 11;
    if (check === 10) check = 0;
    return check === parseInt(cpf[10], 10);
  };

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${ddd}`;
    if (digits.length <= 7) return `(${ddd}) ${part1}`;
    return `(${ddd}) ${part1}-${part2}`;
  };

  const maskCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const fetchCep = async (cepValue: string) => {
    const cepDigits = cepValue.replace(/\D/g, '');
    if (cepDigits.length !== 8) return;
    setIsCepLoading(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      }));
    } catch {
      setCepError('Não foi possível buscar o CEP.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) {
      alert('É necessário ter 18 anos ou mais para se cadastrar.');
      return;
    }
    if (!formData.isForeign && !isValidCpf(formData.cpf)) {
      setCpfError('CPF inválido.');
      return;
    }
    if (formData.isForeign && !formData.foreignDoc) {
      alert('Informe o documento estrangeiro.');
      return;
    }
    if (
      !formData.fullName ||
      !formData.birthDate ||
      !formData.cpf ||
      !formData.contactNumber ||
      !formData.emergencyContactNumber ||
      !formData.cep ||
      !formData.street ||
      !formData.number ||
      !formData.complement ||
      !formData.neighborhood ||
      !formData.city ||
      !formData.state ||
      !formData.sector
    ) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    addExtra({
      id: Math.random().toString(36).substr(2, 9),
      fullName: formData.fullName,
      birthDate: formData.birthDate,
      cpf: formData.cpf,
      contact: `${formData.ddiContact} ${formData.contactNumber}`,
      address: `${formData.street}, ${formData.number} - ${formData.complement} - ${formData.neighborhood} - ${formData.city}/${formData.state} - CEP ${formData.cep}`,
      emergencyContact: `${formData.ddiEmergency} ${formData.emergencyContactNumber}`,
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
                required={!formData.isForeign}
                disabled={formData.isForeign}
                type="text"
                placeholder="000.000.000-00"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
                value={formData.cpf}
                onChange={(e) => {
                  const masked = maskCpf(e.target.value);
                  setFormData({ ...formData, cpf: masked });
                  setCpfError('');
                }}
              />
              {cpfError && !formData.isForeign && <p className="text-xs text-red-500 mt-1">{cpfError}</p>}
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  className="accent-emerald-600"
                  checked={formData.isForeign}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isForeign: e.target.checked,
                      cpf: e.target.checked ? '' : formData.cpf,
                      foreignDoc: e.target.checked ? formData.foreignDoc : ''
                    })
                  }
                />
                Sou estrangeiro, não tenho CPF
              </label>
              {formData.isForeign && (
                <input
                  required
                  type="text"
                  placeholder="Documento estrangeiro"
                  className="mt-2 w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.foreignDoc}
                  onChange={(e) => setFormData({ ...formData, foreignDoc: e.target.value })}
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Contato *</label>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <select
                required
                className="border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.ddiContact}
                onChange={(e) => setFormData({ ...formData, ddiContact: e.target.value })}
              >
                <option value="+55">BR +55</option>
                <option value="+54">AR +54</option>
                <option value="+595">PY +595</option>
                <option value="+598">UY +598</option>
                <option value="+1">US +1</option>
                <option value="+351">PT +351</option>
                <option value="+34">ES +34</option>
              </select>
              <input
                required
                type="text"
                placeholder="(XX) XXXXX-XXXX"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: maskPhone(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">CEP *</label>
            <input
              required
              type="text"
              placeholder="00000-000"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.cep}
              onChange={(e) => {
                const masked = maskCep(e.target.value);
                setFormData({ ...formData, cep: masked });
                setCepError('');
              }}
              onBlur={() => fetchCep(formData.cep)}
            />
            {isCepLoading && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
            {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Rua *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Número *</label>
              <input
                required
                type="text"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Complemento *</label>
              <input
                required
                type="text"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Bairro *</label>
              <input
                required
                type="text"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Cidade *</label>
              <input
                required
                type="text"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Estado *</label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Contato de Emergência *</label>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <select
                required
                className="border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.ddiEmergency}
                onChange={(e) => setFormData({ ...formData, ddiEmergency: e.target.value })}
              >
                <option value="+55">BR +55</option>
                <option value="+54">AR +54</option>
                <option value="+595">PY +595</option>
                <option value="+598">UY +598</option>
                <option value="+1">US +1</option>
                <option value="+351">PT +351</option>
                <option value="+34">ES +34</option>
              </select>
              <input
                required
                type="text"
                placeholder="(XX) XXXXX-XXXX"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.emergencyContactNumber}
                onChange={(e) => setFormData({ ...formData, emergencyContactNumber: maskPhone(e.target.value) })}
              />
            </div>
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
