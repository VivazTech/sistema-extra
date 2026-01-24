import React, { useMemo, useState } from 'react';
import { Copy, Trash2, Users, Plus, X, Save } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';

const ExtraBank: React.FC = () => {
  const { extras, sectors, deleteExtra, addExtra } = useExtras();
  const link = useMemo(() => `${window.location.origin}/#/banco-extras`, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    cpf: '',
    contact: '',
    emergencyContact: '',
    address: '',
    sector: '',
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copiado!');
    } catch {
      alert(`Link: ${link}`);
    }
  };

  const grouped = useMemo(() => {
    return sectors.map(sector => ({
      sector: sector.name,
      extras: extras.filter(e => e.sector === sector.name)
    })).filter(g => g.extras.length > 0);
  }, [extras, sectors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.sector) {
      alert('Preencha pelo menos o nome e o setor.');
      return;
    }

    addExtra({
      id: Math.random().toString(36).substr(2, 9),
      fullName: formData.fullName,
      birthDate: formData.birthDate || '',
      cpf: formData.cpf || '',
      contact: formData.contact || '',
      address: formData.address || '',
      emergencyContact: formData.emergencyContact || '',
      sector: formData.sector,
      createdAt: new Date().toISOString(),
    });

    // Limpar formulário
    setFormData({
      fullName: '',
      birthDate: '',
      cpf: '',
      contact: '',
      emergencyContact: '',
      address: '',
      sector: '',
    });
    setIsModalOpen(false);
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
            onClick={() => setIsModalOpen(true)}
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
      </header>

      {extras.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          Nenhum extra cadastrado ainda.
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
                    </div>
                    <button
                      onClick={() => deleteExtra(extra.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
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
                <h2 className="text-xl font-bold">Cadastrar Novo Extra</h2>
                <p className="text-xs text-emerald-300 opacity-80">Preencha os dados do funcionário extra</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-emerald-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Nome completo do extra"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Data de Nascimento</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">CPF</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Contato</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Telefone ou WhatsApp"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Contato de Emergência</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Telefone de emergência"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Setor *</label>
                  <select
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  >
                    <option value="">Selecione o setor</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Endereço</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
