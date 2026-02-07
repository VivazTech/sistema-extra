import React from 'react';
import { User as UserIcon, Mail, AtSign, Shield, Building2, Phone, MessageCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants';
import type { UserRole } from '../types';

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">Carregando perfil...</p>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[user.role as UserRole] || user.role;
  const fields: { icon: React.ElementType; label: string; value: string | undefined; emptyText?: string }[] = [
    { icon: UserIcon, label: 'Nome', value: user.name },
    { icon: AtSign, label: 'Usuário (login)', value: user.username },
    { icon: Shield, label: 'Função', value: roleLabel },
    { icon: Mail, label: 'E-mail', value: user.email, emptyText: 'Não informado' },
    { icon: Building2, label: 'Setores', value: user.sectors?.length ? user.sectors.join(', ') : undefined, emptyText: 'Nenhum setor vinculado' },
    { icon: Phone, label: 'Ramal', value: user.ramal, emptyText: 'Não informado' },
    { icon: MessageCircle, label: 'WhatsApp', value: user.whatsapp, emptyText: 'Não informado' },
    { icon: ClipboardList, label: 'É demandante', value: user.isRequester ? 'Sim' : 'Não', emptyText: '' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500">Informações da sua conta no sistema.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {fields.map(({ icon: Icon, label, value, emptyText }) => (
            <div key={label} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-600">
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-gray-900 font-medium mt-0.5">
                  {value && String(value).trim() ? value : (emptyText ?? '—')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
