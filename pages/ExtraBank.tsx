import React, { useMemo, useState, useEffect } from 'react';
import { Copy, Trash2, Users, Plus, X, Save, Search, ArrowUpDown, Pencil } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import type { ExtraPerson } from '../types';

const ExtraBank: React.FC = () => {
  const { extras, sectors, deleteExtra, addExtra, updateExtra, checkCpfExists } = useExtras();
  const link = useMemo(() => `${window.location.origin}/#/banco-extras`, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'recent'>('alphabetical');
  const [selectedSector, setSelectedSector] = useState('TODOS');
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
    address: ''
  });
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

  // Função para normalizar CPF (remover formatação)
  const normalizeCpf = (cpf: string) => {
    return cpf.replace(/\D/g, '');
  };


  // Validar contatos em tempo real
  const validateContacts = () => {
    if (formData.contactNumber && formData.emergencyContactNumber) {
      const contactDigits = formData.contactNumber.replace(/\D/g, '');
      const emergencyDigits = formData.emergencyContactNumber.replace(/\D/g, '');
      if (contactDigits === emergencyDigits && formData.ddiContact === formData.ddiEmergency) {
        setContactError('O contato e o contato de emergência não podem ser iguais.');
        return false;
      }
    }
    setContactError('');
    return true;
  };

  // Validar contatos em tempo real quando os campos mudarem
  useEffect(() => {
    validateContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contactNumber, formData.emergencyContactNumber, formData.ddiContact, formData.ddiEmergency]);

  // Validar CPF duplicado em tempo real (verificação no banco - fonte de verdade)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const cpfToCheck = formData.isForeign ? formData.foreignDoc : formData.cpf;
      if (!cpfToCheck) {
        if (!cancelled) setCpfError('');
        return;
      }
      const cpfDigits = normalizeCpf(cpfToCheck);
      if (formData.isForeign) {
        const exists = await checkCpfExists(formData.foreignDoc, editingExtraId || undefined);
        if (!cancelled) setCpfError(exists ? 'Este documento já está cadastrado no banco de extras.' : '');
      } else if (cpfDigits.length === 11) {
        if (!isValidCpf(formData.cpf)) {
          if (!cancelled) setCpfError('CPF inválido.');
          return;
        }
        const exists = await checkCpfExists(cpfToCheck, editingExtraId || undefined);
        if (!cancelled) setCpfError(exists ? 'Este CPF já está cadastrado no banco de extras.' : '');
      } else if (cpfDigits.length > 0) {
        if (!cancelled) setCpfError('');
      } else {
        if (!cancelled) setCpfError('');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [formData.cpf, formData.foreignDoc, formData.isForeign, editingExtraId, checkCpfExists]);

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
    const digits = value.replace(/\D/g, '');
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copiado!');
    } catch {
      alert(`Link: ${link}`);
    }
  };

  const parseContact = (value: string): { ddi: string; number: string } => {
    if (!value || !value.trim()) return { ddi: '+55', number: '' };
    const match = value.trim().match(/^(\+\d+)\s+(.*)$/);
    if (match) return { ddi: match[1], number: match[2].trim() };
    return { ddi: '+55', number: value.trim() };
  };

  const openForEdit = (extra: ExtraPerson) => {
    const contactParsed = parseContact(extra.contact);
    const emergencyParsed = parseContact(extra.emergencyContact);
    const cpfDigits = normalizeCpf(extra.cpf || '');
    const isForeign = cpfDigits.length !== 11;
    setFormData({
      fullName: extra.fullName,
      birthDate: extra.birthDate || '',
      cpf: isForeign ? '' : maskCpf(extra.cpf || ''),
      isForeign,
      foreignDoc: isForeign ? (extra.cpf || '') : '',
      ddiContact: contactParsed.ddi,
      contactNumber: contactParsed.number,
      ddiEmergency: emergencyParsed.ddi,
      emergencyContactNumber: emergencyParsed.number,
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      sectors: extra.sectors?.length ? [...extra.sectors] : (extra.sector ? [extra.sector] : []),
      address: extra.address || '',
    });
    setCpfError('');
    setCepError('');
    setContactError('');
    setEditingExtraId(extra.id);
    setIsModalOpen(true);
  };

  const toggleSector = (sectorName: string) => {
    setFormData(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sectorName)
        ? prev.sectors.filter(s => s !== sectorName)
        : [...prev.sectors, sectorName],
    }));
  };

  const resetFormAndClose = () => {
    setFormData({
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
      sectors: [],
      address: '',
    });
    setCpfError('');
    setCepError('');
    setContactError('');
    setEditingExtraId(null);
    setIsModalOpen(false);
  };

  const filteredExtras = useMemo(() => {
    let filtered = extras;

    if (selectedSector !== 'TODOS') {
      filtered = filtered.filter(extra =>
        extra.sectors?.includes(selectedSector) || extra.sector === selectedSector
      );
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(extra =>
        extra.fullName.toLowerCase().includes(query) ||
        extra.cpf.toLowerCase().includes(query) ||
        extra.contact.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered];
    if (sortOrder === 'alphabetical') {
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return sorted;
  }, [extras, searchTerm, selectedSector, sortOrder]);

  const grouped = useMemo(() => {
    return sectors.map(sector => ({
      sector: sector.name,
      extras: filteredExtras.filter(e =>
        e.sectors?.includes(sector.name) || e.sector === sector.name
      ),
    })).filter(g => g.extras.length > 0);
  }, [filteredExtras, sectors]);

  // Validar contatos em tempo real quando os campos mudarem
  useEffect(() => {
    validateContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contactNumber, formData.emergencyContactNumber, formData.ddiContact, formData.ddiEmergency]);

  // Validar CPF duplicado em tempo real (verificação no banco - fonte de verdade)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const cpfToCheck = formData.isForeign ? formData.foreignDoc : formData.cpf;
      if (!cpfToCheck) {
        if (!cancelled) setCpfError('');
        return;
      }
      const cpfDigits = normalizeCpf(cpfToCheck);
      if (formData.isForeign) {
        const exists = await checkCpfExists(formData.foreignDoc, editingExtraId || undefined);
        if (!cancelled) setCpfError(exists ? 'Este documento já está cadastrado no banco de extras.' : '');
      } else if (cpfDigits.length === 11) {
        if (!isValidCpf(formData.cpf)) {
          if (!cancelled) setCpfError('CPF inválido.');
          return;
        }
        const exists = await checkCpfExists(cpfToCheck, editingExtraId || undefined);
        if (!cancelled) setCpfError(exists ? 'Este CPF já está cadastrado no banco de extras.' : '');
      } else if (cpfDigits.length > 0) {
        if (!cancelled) setCpfError('');
      } else {
        if (!cancelled) setCpfError('');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [formData.cpf, formData.foreignDoc, formData.isForeign, editingExtraId, checkCpfExists]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || formData.sectors.length === 0) {
      alert('Preencha pelo menos o nome e selecione ao menos um setor.');
      return;
    }

    if (formData.birthDate && !isAdult) {
      alert('É necessário ter 18 anos ou mais para se cadastrar.');
      return;
    }

    if (!formData.isForeign && formData.cpf && !isValidCpf(formData.cpf)) {
      setCpfError('CPF inválido.');
      return;
    }

    // Verificar CPF duplicado no banco (fonte de verdade)
    const cpfToCheck = formData.isForeign ? formData.foreignDoc : formData.cpf;
    if (cpfToCheck) {
      const exists = await checkCpfExists(cpfToCheck, editingExtraId || undefined);
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

    // Montar endereço se preenchido
    let address = '';
    if (formData.cep || formData.street || formData.number || formData.complement || 
        formData.neighborhood || formData.city || formData.state) {
      const parts = [];
      if (formData.street) parts.push(formData.street);
      if (formData.number) parts.push(formData.number);
      if (formData.complement) parts.push(formData.complement);
      if (formData.neighborhood) parts.push(formData.neighborhood);
      if (formData.city || formData.state) {
        parts.push(`${formData.city || ''}${formData.city && formData.state ? '/' : ''}${formData.state || ''}`);
      }
      if (formData.cep) parts.push(`CEP ${formData.cep}`);
      address = parts.join(' - ');
    }

    const contactStr = formData.contactNumber ? `${formData.ddiContact} ${formData.contactNumber}` : '';
    const emergencyStr = formData.emergencyContactNumber ? `${formData.ddiEmergency} ${formData.emergencyContactNumber}` : '';
    const addressStr = editingExtraId ? (formData.address || '') : address;

    if (editingExtraId) {
      const extraToUpdate: ExtraPerson = {
        id: editingExtraId,
        fullName: formData.fullName,
        birthDate: formData.birthDate || '',
        cpf: formData.isForeign ? formData.foreignDoc : (formData.cpf || ''),
        contact: contactStr,
        address: addressStr,
        emergencyContact: emergencyStr,
        sector: formData.sectors[0] || '',
        sectors: formData.sectors,
        createdAt: '', // não alterado na atualização
      };
      try {
        await updateExtra(extraToUpdate);
        resetFormAndClose();
        alert('Alterações salvas com sucesso.');
      } catch (err) {
        console.error('Erro ao salvar extra:', err);
        const msg = err instanceof Error ? err.message : 'Erro ao salvar alterações. Tente novamente.';
        if (msg.includes('CPF já está cadastrado')) {
          setCpfError(msg);
        } else {
          alert(msg);
        }
      }
      return;
    }

    try {
      await addExtra({
        id: Math.random().toString(36).substr(2, 9),
        fullName: formData.fullName,
        birthDate: formData.birthDate || '',
        cpf: formData.isForeign ? formData.foreignDoc : (formData.cpf || ''),
        contact: contactStr,
        address: addressStr,
        emergencyContact: emergencyStr,
        sector: formData.sectors[0] || '',
        sectors: formData.sectors,
        createdAt: new Date().toISOString(),
      });
      resetFormAndClose();
    } catch (err) {
      console.error('Erro ao cadastrar extra:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar. Tente novamente.';
      if (msg.includes('CPF já está cadastrado')) {
        setCpfError(msg);
      } else {
        alert(msg);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banco de Extras</h1>
            <p className="text-gray-500 mt-1">Compartilhe o link abaixo com os extras para cadastro ou cadastre diretamente.</p>
          </div>
          <button
            onClick={() => {
              setEditingExtraId(null);
              setFormData({
                fullName: '', birthDate: '', cpf: '', isForeign: false, foreignDoc: '',
                ddiContact: '+55', contactNumber: '', ddiEmergency: '+55', emergencyContactNumber: '',
                cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', sectors: [], address: '',
              });
              setCpfError(''); setCepError(''); setContactError('');
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md"
          >
            <Plus size={18} /> Cadastrar Extra
          </button>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
          />
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm"
          >
            <Copy size={16} /> Copiar link
          </button>
        </div>
        <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por nome, CPF ou contato..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={18} className="text-gray-400" />
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'alphabetical' | 'recent')}
              >
                <option value="alphabetical">Ordem alfabética</option>
                <option value="recent">Mais recentes</option>
              </select>
            </div>
            <div>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="TODOS">Todos os setores</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.name}>{sector.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {filteredExtras.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          {extras.length === 0 ? 'Nenhum extra cadastrado ainda.' : 'Nenhum extra encontrado com os filtros atuais.'}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.sector} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-emerald-900 mb-4">{group.sector}</h2>
              <div className="space-y-2">
                {group.extras.map(extra => (
                  <div key={extra.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{extra.fullName}</p>
                      <p className="text-xs text-gray-500">{extra.contact} • {extra.cpf}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {(extra.sectors?.length ? extra.sectors : [extra.sector]).filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openForEdit(extra)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteExtra(extra.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-900 text-white rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold">{editingExtraId ? 'Editar Extra' : 'Cadastrar Novo Extra'}</h2>
                <p className="text-xs text-emerald-300 opacity-80">{editingExtraId ? 'Altere os dados do funcionário extra' : 'Preencha os dados do funcionário extra'}</p>
              </div>
              <button 
                onClick={resetFormAndClose} 
                className="p-2 hover:bg-emerald-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                  <label className="text-xs font-bold text-gray-500 uppercase">Data de Nascimento</label>
                  <input
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
                  <label className="text-xs font-bold text-gray-500 uppercase">CPF</label>
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
                      onChange={(e) => {
                        setFormData({ ...formData, foreignDoc: e.target.value });
                        setCpfError('');
                      }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Contato</label>
                <div className="grid grid-cols-[110px_1fr] gap-3">
                  <select
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
                    type="text"
                    placeholder={formData.ddiContact === '+55' ? '(XX) XXXXX-XXXX' : 
                                formData.ddiContact === '+1' ? '(XXX) XXX-XXXX' :
                                formData.ddiContact === '+351' ? 'XXX XXX XXX' :
                                formData.ddiContact === '+34' ? 'XXX XXX XXX' :
                                'XX XXXX-XXXX'}
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, contactNumber: maskPhone(e.target.value, formData.ddiContact) });
                      setContactError('');
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Contato de Emergência</label>
                <div className="grid grid-cols-[110px_1fr] gap-3">
                  <select
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
                    type="text"
                    placeholder={formData.ddiEmergency === '+55' ? '(XX) XXXXX-XXXX' : 
                                formData.ddiEmergency === '+1' ? '(XXX) XXX-XXXX' :
                                formData.ddiEmergency === '+351' ? 'XXX XXX XXX' :
                                formData.ddiEmergency === '+34' ? 'XXX XXX XXX' :
                                'XX XXXX-XXXX'}
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.emergencyContactNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, emergencyContactNumber: maskPhone(e.target.value, formData.ddiEmergency) });
                      setContactError('');
                    }}
                  />
                </div>
                {contactError && <p className="text-xs text-red-500 mt-1">{contactError}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Setores *</label>
                <p className="text-xs text-gray-500 mb-2">Selecione um ou mais setores em que o extra pode atuar.</p>
                <div className="flex flex-wrap gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                  {sectors.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        checked={formData.sectors.includes(s.name)}
                        onChange={() => toggleSector(s.name)}
                      />
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    </label>
                  ))}
                </div>
                {formData.sectors.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Selecione ao menos um setor.</p>
                )}
              </div>

              {/* Seção de Endereço (Opcional) */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Endereço (Opcional)</h3>
                
                {editingExtraId ? (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Endereço completo</label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Rua, número, bairro, cidade..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                ) : (
                <>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">CEP</label>
                  <input
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
                  <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Complemento</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                </>
                )}
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={resetFormAndClose}
                  className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={20} /> Salvar Extra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtraBank;
