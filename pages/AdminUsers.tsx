import React, { useState, useEffect } from 'react';
import { Plus, Save, Edit2, Trash2, X, UserPlus } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { ACCESS_ACTIONS, ACCESS_PAGES, ROLE_LABELS } from '../constants';
import { User, UserRole } from '../types';

const ROLE_ORDER: UserRole[] = ['ADMIN', 'MANAGER', 'LEADER', 'PORTARIA', 'VIEWER'];

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const AdminUsers: React.FC = () => {
  const { sectors, users, addUser, updateUser, deleteUser } = useExtras();
  const { user: currentUser } = useAuth();
  const { roleAccess, toggleRolePage, toggleRoleAction } = useAccess();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    ramal: '',
    whatsapp: '',
    password: '',
    role: 'VIEWER' as UserRole,
    sector: '',
    isRequester: false,
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        name: user.name,
        username: user.username,
        email: user.email || '',
        ramal: user.ramal || '',
        whatsapp: user.whatsapp || '',
        password: '',
        role: user.role,
        sector: user.sectors?.[0] || '',
        isRequester: user.isRequester || false,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        username: '',
        email: '',
        ramal: '',
        whatsapp: '',
        password: '',
        role: 'VIEWER',
        sector: '',
        isRequester: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      ramal: '',
      whatsapp: '',
      password: '',
      role: 'VIEWER',
      sector: '',
      isRequester: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.username) {
      alert('Nome e usuário são obrigatórios.');
      return;
    }

    if (!editingId && !formData.password) {
      alert('Senha é obrigatória para novos usuários.');
      return;
    }

    try {
      const userData: Partial<User> = {
        name: formData.name,
        username: formData.username,
        email: formData.email || undefined,
        ramal: formData.ramal || undefined,
        whatsapp: formData.whatsapp || undefined,
        role: formData.role,
        sectors: formData.sector ? [formData.sector] : undefined,
        isRequester: formData.isRequester,
        password: formData.password || undefined,
      };

      if (editingId) {
        await updateUser(editingId, userData);
      } else {
        await addUser(userData as User);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário. Verifique o console para mais detalhes.');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      alert('Você não pode deletar seu próprio usuário.');
      return;
    }

    if (confirm('Deseja realmente deletar este usuário?')) {
      try {
        await deleteUser(id);
      } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        alert('Erro ao deletar usuário.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md"
        >
          <UserPlus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Níveis de acesso por função</h2>
          <p className="text-sm text-gray-500">
            Defina o que cada perfil pode acessar e fazer no sistema.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ROLE_ORDER.map((role) => {
            const access = roleAccess[role];
            return (
            <div key={role} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Perfil</span>
                <span className="text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Acesso</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACCESS_PAGES.map((page) => (
                    <label key={page.key} className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        checked={access.pages.includes(page.key)}
                        onChange={() => toggleRolePage(role, page.key)}
                      />
                      <span>{page.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Pode fazer</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACCESS_ACTIONS.map((action) => (
                    <label key={action.key} className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        checked={access.actions.includes(action.key)}
                        onChange={() => toggleRoleAction(role, action.key)}
                      />
                      <span>{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )})}
        </div>
        <p className="text-xs text-gray-400">
          Alterações são aplicadas imediatamente e salvas neste navegador.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Ramal</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Perfil</th>
              <th className="px-6 py-4">Setor</th>
              <th className="px-6 py-4">Demandante</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user, index) => {
              const isEven = index % 2 === 0;
              const bgColor = isEven ? 'bg-white' : 'bg-gray-50';
              return (
                <tr key={user.id} className={`${bgColor} hover:bg-gray-100 transition-colors`}>
                  <td className="px-6 py-4 font-semibold">{user.name}</td>
                  <td className="px-6 py-4">{user.username}</td>
                  <td className="px-6 py-4">{user.email || '-'}</td>
                  <td className="px-6 py-4">{user.ramal || '-'}</td>
                  <td className="px-6 py-4">{user.whatsapp || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                      user.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'LEADER' ? 'bg-emerald-100 text-emerald-700' :
                      user.role === 'PORTARIA' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{user.sectors?.join(', ') || '-'}</td>
                  <td className="px-6 py-4">
                    {user.isRequester ? (
                      <span className="text-emerald-600 font-bold text-xs">✓ Sim</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Não</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <p>Nenhum usuário cadastrado.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-900 text-white rounded-t-2xl">
              <h2 className="text-xl font-bold">
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Usuário *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Ramal</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.ramal}
                    onChange={(e) => setFormData({ ...formData, ramal: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(45) 99999-9999"
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {editingId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Perfil *</label>
                  <select
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  >
                    <option value="VIEWER">Visualizador</option>
                    <option value="PORTARIA">Portaria</option>
                    <option value="LEADER">Líder</option>
                    <option value="MANAGER">Gerente</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Setor</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  >
                    <option value="">Selecione um setor</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="isRequester"
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  checked={formData.isRequester}
                  onChange={(e) => setFormData({ ...formData, isRequester: e.target.checked })}
                />
                <label htmlFor="isRequester" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Este usuário é um demandante? (será cadastrado também como demandante)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={20} /> {editingId ? 'Atualizar' : 'Criar'} Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
