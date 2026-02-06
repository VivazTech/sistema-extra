import React, { useState, useEffect } from 'react';
import { Plus, Save, Edit2, Trash2, X, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { ACCESS_ACTIONS, ACCESS_PAGES, ROLE_LABELS } from '../constants';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';

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
  const { user: currentUser, resetPassword } = useAuth();
  const { roleAccess, toggleRolePage, toggleRoleAction } = useAccess();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);

  // Verificar se é ADMIN
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Se não for ADMIN, não renderizar nada
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return null;
  }
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
    
    // Verificar se é ADMIN
    if (currentUser?.role !== 'ADMIN') {
      alert('Apenas administradores podem criar ou editar usuários.');
      return;
    }
    
    if (!formData.name || !formData.username) {
      alert('Nome e usuário são obrigatórios.');
      return;
    }

    if (!editingId && !formData.password) {
      alert('Senha é obrigatória para novos usuários.');
      return;
    }

    if (!editingId && !formData.email) {
      alert('Email é obrigatório para novos usuários.');
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
        if (formData.email) {
          alert(
            `Usuário criado. Se a confirmação de email estiver habilitada no Supabase, ` +
            `foi enviado um email de confirmação para ${formData.email}.`
          );
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      const message = error instanceof Error ? error.message : 'Erro ao salvar usuário. Verifique o console para mais detalhes.';
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    // Verificar se é ADMIN
    if (currentUser?.role !== 'ADMIN') {
      alert('Apenas administradores podem deletar usuários.');
      return;
    }

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

  const handleOpenResetPasswordModal = (user: User) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Apenas administradores podem redefinir senhas.');
      return;
    }
    setUserToResetPassword(user);
    setAdminNewPassword('');
    setAdminConfirmPassword('');
    setAdminPasswordError('');
  };

  const handleSubmitAdminSetPassword = async () => {
    if (!userToResetPassword) return;
    setAdminPasswordError('');
    if (adminNewPassword.length < 6) {
      setAdminPasswordError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordError('As senhas não coincidem.');
      return;
    }
    setAdminPasswordLoading(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setAdminPasswordError('Sessão expirada. Faça login novamente.');
        setAdminPasswordLoading(false);
        return;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...(supabaseAnonKey ? { 'apikey': supabaseAnonKey } : {}),
        },
        body: JSON.stringify({
          user_id: userToResetPassword.id,
          new_password: adminNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setAdminPasswordError(
            'Função de redefinição não disponível. Faça o deploy da Edge Function "admin-set-password" no Supabase ou use "Enviar email" na tela de login.'
          );
        } else {
          setAdminPasswordError(data?.error || `Erro ${res.status}`);
        }
        setAdminPasswordLoading(false);
        return;
      }
      setUserToResetPassword(null);
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      alert(`Senha de ${userToResetPassword.name} alterada com sucesso.`);
    } catch (err: any) {
      setAdminPasswordError(err?.message || 'Erro de conexão. Verifique se a Edge Function está publicada.');
    } finally {
      setAdminPasswordLoading(false);
    }
  };

  const handleSendPasswordEmail = async () => {
    if (!userToResetPassword?.email) {
      alert('Este usuário não possui email cadastrado.');
      return;
    }
    setAdminPasswordLoading(true);
    try {
      const result = await resetPassword(userToResetPassword.email);
      if (result.success) {
        alert(`Email de recuperação enviado para ${userToResetPassword.email}`);
        setUserToResetPassword(null);
      } else {
        setAdminPasswordError(result.error || 'Erro ao enviar email');
      }
    } catch (error) {
      setAdminPasswordError('Erro ao enviar email de recuperação.');
    } finally {
      setAdminPasswordLoading(false);
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
                  {ACCESS_PAGES.filter(page => page.key !== 'test').map((page) => (
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
                      {user.email && (
                        <button
                          onClick={() => handleOpenResetPasswordModal(user)}
                          disabled={resettingPassword === user.id}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Redefinir Senha"
                        >
                          <KeyRound size={16} />
                        </button>
                      )}
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
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Email {!editingId && '*'}
                  </label>
                  <input
                    type="email"
                    required={!editingId}
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

      {/* Modal Redefinir senha (admin define nova senha no sistema, sem email) */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Redefinir senha</h3>
              <button
                onClick={() => { setUserToResetPassword(null); setAdminPasswordError(''); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Definir nova senha para <strong>{userToResetPassword.name}</strong> (sem enviar email).
            </p>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nova senha</label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminNewPassword}
                  onChange={(e) => { setAdminNewPassword(e.target.value); setAdminPasswordError(''); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                  title={showAdminPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showAdminConfirmPassword ? 'text' : 'password'}
                  value={adminConfirmPassword}
                  onChange={(e) => { setAdminConfirmPassword(e.target.value); setAdminPasswordError(''); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Repita a nova senha"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                  title={showAdminConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showAdminConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {adminPasswordError && <p className="text-sm text-red-600">{adminPasswordError}</p>}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubmitAdminSetPassword}
                disabled={adminPasswordLoading}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {adminPasswordLoading ? 'Salvando...' : 'Definir nova senha'}
              </button>
              {userToResetPassword.email && (
                <button
                  type="button"
                  onClick={handleSendPasswordEmail}
                  disabled={adminPasswordLoading}
                  className="w-full py-2.5 text-emerald-600 border border-emerald-600 font-bold rounded-xl hover:bg-emerald-50 disabled:opacity-50"
                >
                  Enviar email de recuperação
                </button>
              )}
              <button
                onClick={() => { setUserToResetPassword(null); setAdminPasswordError(''); }}
                className="w-full py-2.5 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
