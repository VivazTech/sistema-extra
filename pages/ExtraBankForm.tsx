import React, { useMemo, useState } from 'react';
import { useExtras } from '../context/ExtraContext';
import { lettersAndNumbers, lettersOnlyName } from '../utils/personName';

const ExtraBankForm: React.FC = () => {
  const { sectors, addExtra, checkCpfExists } = useExtras();
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
    sectors: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [cepError, setCepError] = useState('');
  const [contactError, setContactError] = useState('');
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

  const maskPhone = (value: string, ddi: string = '+55') => {
    const maxDigits: Record<string, number> = {
      '+55': 11,
      '+54': 10,
      '+595': 10,
      '+598': 10,
      '+1': 10,
      '+351': 9,
      '+34': 9,
    };
    const digits = value.replace(/\D/g, '').slice(0, maxDigits[ddi] ?? 15);
    if (!digits) return '';

    switch (ddi) {
      case '+55': // Brasil
        const ddd = digits.slice(0, 2);
        const part1 = digits.slice(2, 7);
        const part2 = digits.slice(7, 11);
        if (digits.length <= 2) return `(${ddd}`;
        if (digits.length <= 7) return `(${ddd}) ${part1}`;
        return `(${ddd}) ${part1}-${part2}`;
      
      case '+54': // Argentina
        const area = digits.slice(0, 2);
        const num1 = digits.slice(2, 6);
        const num2 = digits.slice(6, 10);
        if (digits.length <= 2) return `${area}`;
        if (digits.length <= 6) return `${area} ${num1}`;
        return `${area} ${num1}-${num2}`;
      
      case '+595': // Paraguai
        const parArea = digits.slice(0, 2);
        const parNum1 = digits.slice(2, 6);
        const parNum2 = digits.slice(6, 10);
        if (digits.length <= 2) return `${parArea}`;
        if (digits.length <= 6) return `${parArea} ${parNum1}`;
        return `${parArea} ${parNum1}-${parNum2}`;
      
      case '+598': // Uruguai
        const uyArea = digits.slice(0, 2);
        const uyNum1 = digits.slice(2, 6);
        const uyNum2 = digits.slice(6, 10);
        if (digits.length <= 2) return `${uyArea}`;
        if (digits.length <= 6) return `${uyArea} ${uyNum1}`;
        return `${uyArea} ${uyNum1}-${uyNum2}`;
      
      case '+1': // EUA/Canadá
        const usArea = digits.slice(0, 3);
        const usNum1 = digits.slice(3, 6);
        const usNum2 = digits.slice(6, 10);
        if (digits.length <= 3) return `(${usArea}`;
        if (digits.length <= 6) return `(${usArea}) ${usNum1}`;
        return `(${usArea}) ${usNum1}-${usNum2}`;
      
      case '+351': // Portugal
        const ptNum1 = digits.slice(0, 3);
        const ptNum2 = digits.slice(3, 6);
        const ptNum3 = digits.slice(6, 9);
        if (digits.length <= 3) return `${ptNum1}`;
        if (digits.length <= 6) return `${ptNum1} ${ptNum2}`;
        return `${ptNum1} ${ptNum2} ${ptNum3}`;
      
      case '+34': // Espanha
        const esNum1 = digits.slice(0, 3);
        const esNum2 = digits.slice(3, 6);
        const esNum3 = digits.slice(6, 9);
        if (digits.length <= 3) return `${esNum1}`;
        if (digits.length <= 6) return `${esNum1} ${esNum2}`;
        return `${esNum1} ${esNum2} ${esNum3}`;
      
      default:
        return digits;
    }
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

  // Função para normalizar CPF (remover formatação)
  const normalizeCpf = (cpf: string) => {
    return cpf.replace(/\D/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) {
      alert('É necessário ter 18 anos ou mais para se cadastrar.');
      return;
    }
    if (!formData.isForeign && !isValidCpf(formData.cpf)) {
      setCpfError('CPF inválido.');
      return;
    }

    // Verificar CPF duplicado no banco (fonte de verdade)
    const cpfToCheck = formData.isForeign ? formData.foreignDoc : formData.cpf;
    if (cpfToCheck) {
      const exists = await checkCpfExists(cpfToCheck);
      if (exists) {
        setCpfError('Este CPF já está cadastrado no banco de extras.');
        return;
      }
    }

    if (formData.isForeign && !formData.foreignDoc) {
      alert('Informe o documento estrangeiro.');
      return;
    }
    
    // Validar se contatos são diferentes
    if (formData.contactNumber && formData.emergencyContactNumber) {
      const contactDigits = formData.contactNumber.replace(/\D/g, '');
      const emergencyDigits = formData.emergencyContactNumber.replace(/\D/g, '');
      if (contactDigits === emergencyDigits && formData.ddiContact === formData.ddiEmergency) {
        setContactError('O contato e o contato de emergência não podem ser iguais.');
        return;
      }
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
      formData.sectors.length === 0
    ) {
      alert('Preencha todos os campos obrigatórios e selecione ao menos um setor.');
      return;
    }
    try {
      await addExtra({
        id: Math.random().toString(36).substr(2, 9),
        fullName: lettersOnlyName(formData.fullName).trim(),
        birthDate: formData.birthDate,
        cpf: formData.isForeign ? formData.foreignDoc : formData.cpf,
        contact: `${formData.ddiContact} ${formData.contactNumber}`,
        address: `${formData.street}, ${formData.number} - ${formData.complement} - ${formData.neighborhood} - ${formData.city}/${formData.state} - CEP ${formData.cep}`,
        emergencyContact: `${formData.ddiEmergency} ${formData.emergencyContactNumber}`,
        sector: formData.sectors[0] || '',
        sectors: formData.sectors,
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar. Tente novamente.';
      if (msg.includes('CPF já está cadastrado')) {
        setCpfError(msg);
      } else {
        alert(msg);
      }
    }
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
              inputMode="text"
              autoComplete="name"
              placeholder="Somente letras"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: lettersOnlyName(e.target.value) })}
            />
            <p className="text-xs text-gray-400 mt-1">Não use números, CPF ou data de nascimento.</p>
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
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                placeholder="000.000.000-00"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
                value={formData.cpf}
                onChange={(e) => {
                  const allowed = e.target.value.replace(/[^0-9.-]/g, '');
                  setFormData({ ...formData, cpf: maskCpf(allowed) });
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
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Documento estrangeiro"
                  className="mt-2 w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.foreignDoc}
                  onChange={(e) => {
                    setFormData({ ...formData, foreignDoc: e.target.value.replace(/\D/g, '') });
                    setCpfError('');
                  }}
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
                onChange={(e) => {
                  const newDdi = e.target.value;
                  // Reaplicar máscara com novo DDI
                  const currentDigits = formData.contactNumber.replace(/\D/g, '');
                  setFormData({ 
                    ...formData, 
                    ddiContact: newDdi,
                    contactNumber: maskPhone(currentDigits, newDdi)
                  });
                  setContactError('');
                }}
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
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={15}
                placeholder={formData.ddiContact === '+55' ? '(XX) XXXXX-XXXX' : 
                            formData.ddiContact === '+1' ? '(XXX) XXX-XXXX' :
                            formData.ddiContact === '+351' ? 'XXX XXX XXX' :
                            formData.ddiContact === '+34' ? 'XXX XXX XXX' :
                            'XX XXXX-XXXX'}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.contactNumber}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    contactNumber: maskPhone(e.target.value.replace(/\D/g, ''), formData.ddiContact),
                  });
                  setContactError('');
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
                  setFormData({
                    ...formData,
                    contactNumber: maskPhone(pasted, formData.ddiContact),
                  });
                  setContactError('');
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">CEP *</label>
            <input
              required
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
              placeholder="00000-000"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.cep}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, cep: maskCep(digitsOnly) });
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
              autoComplete="address-line1"
              placeholder="Somente letras"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: lettersOnlyName(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Número *</label>
              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Somente números"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Complemento *</label>
              <input
                required
                type="text"
                placeholder="Letras e números"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: lettersAndNumbers(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Bairro *</label>
              <input
                required
                type="text"
                autoComplete="address-level3"
                placeholder="Somente letras"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: lettersOnlyName(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Cidade *</label>
              <input
                required
                type="text"
                autoComplete="address-level2"
                placeholder="Somente letras"
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: lettersOnlyName(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Estado *</label>
            <input
              required
              type="text"
              autoComplete="address-level1"
              maxLength={2}
              placeholder="UF"
              className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
              value={formData.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  state: lettersOnlyName(e.target.value).replace(/\s/g, '').toUpperCase().slice(0, 2),
                })
              }
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Contato de Emergência *</label>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <select
                required
                className="border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.ddiEmergency}
                onChange={(e) => {
                  const newDdi = e.target.value;
                  // Reaplicar máscara com novo DDI
                  const currentDigits = formData.emergencyContactNumber.replace(/\D/g, '');
                  setFormData({ 
                    ...formData, 
                    ddiEmergency: newDdi,
                    emergencyContactNumber: maskPhone(currentDigits, newDdi)
                  });
                  setContactError('');
                }}
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
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={15}
                placeholder={formData.ddiEmergency === '+55' ? '(XX) XXXXX-XXXX' : 
                            formData.ddiEmergency === '+1' ? '(XXX) XXX-XXXX' :
                            formData.ddiEmergency === '+351' ? 'XXX XXX XXX' :
                            formData.ddiEmergency === '+34' ? 'XXX XXX XXX' :
                            'XX XXXX-XXXX'}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.emergencyContactNumber}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    emergencyContactNumber: maskPhone(e.target.value.replace(/\D/g, ''), formData.ddiEmergency),
                  });
                  setContactError('');
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
                  setFormData({
                    ...formData,
                    emergencyContactNumber: maskPhone(pasted, formData.ddiEmergency),
                  });
                  setContactError('');
                }}
              />
            </div>
            {contactError && <p className="text-xs text-red-500 mt-1">{contactError}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Setores *</label>
            <p className="text-xs text-gray-500 mb-2">Selecione até 2 setores em que o extra pode atuar.</p>
            <div className="flex flex-wrap gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50 max-h-56 overflow-y-auto">
              {sectors.map(s => {
                const selected = formData.sectors.includes(s.name);
                const atLimit = formData.sectors.length >= 2 && !selected;
                return (
                <label key={s.id} className={`flex items-center gap-2 ${atLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    checked={selected}
                    disabled={atLimit}
                    onChange={() => {
                      setFormData(prev => {
                        if (prev.sectors.includes(s.name)) {
                          return { ...prev, sectors: prev.sectors.filter(sec => sec !== s.name) };
                        }
                        if (prev.sectors.length >= 2) return prev;
                        return { ...prev, sectors: [...prev.sectors, s.name] };
                      });
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">{s.name}</span>
                </label>
                );
              })}
            </div>
            {formData.sectors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Selecione ao menos um setor.</p>
            )}
            {formData.sectors.length >= 2 && (
              <p className="text-xs text-gray-500 mt-1">Máximo de 2 setores selecionados.</p>
            )}
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
