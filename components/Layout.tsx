
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Monitor, 
  LogOut, 
  Menu, 
  X, 
  ClipboardList,
  Database,
  Calculator,
  Clock,
  FileText,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { AccessPageKey } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { user, logout, updatePassword } = useAuth();
  const { hasPageAccess } = useAccess();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', page: 'dashboard' as AccessPageKey },
    { icon: ClipboardList, label: 'Solicitações', path: '/solicitacoes', page: 'requests' as AccessPageKey },
    { icon: Clock, label: 'Portaria', path: '/portaria', page: 'portaria' as AccessPageKey },
    { icon: Monitor, label: 'Painel 24h', path: '/tv', page: 'tv' as AccessPageKey },
    { icon: FileText, label: 'Relatórios', path: '/relatorios', page: 'reports' as AccessPageKey },
    { icon: Users, label: 'Usuários', path: '/admin/usuarios', page: 'users' as AccessPageKey },
    { icon: Calculator, label: 'Saldo de Extras', path: '/admin/saldo-extras', page: 'saldo' as AccessPageKey },
    { icon: Database, label: 'Banco de Extras', path: '/admin/extras', page: 'extras' as AccessPageKey },
    { icon: Settings, label: 'Cadastros', path: '/admin/cadastros', page: 'catalogs' as AccessPageKey },
  ].filter(item => (user ? hasPageAccess(user.role, item.page) : false));

  const activeItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  if (!user) return <>{children}</>;

  // TV mode doesn't need layout
  if (location.pathname === '/tv') return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-emerald-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-lg tracking-tight">VIVAZ EXTRAS</h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-emerald-950 text-white flex flex-col shadow-xl min-h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-8 flex-shrink-0">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white">V</div>
            <div>
              <h1 className="font-bold text-sm tracking-widest uppercase">Vivaz Resort</h1>
              <p className="text-xs text-emerald-400">Controle de Extras</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${location.pathname === item.path ? 'bg-emerald-800 text-white' : 'text-emerald-300 hover:bg-emerald-900 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-emerald-900 flex-shrink-0 sticky bottom-0 bg-emerald-950">
          <div className="mb-4">
            <p className="text-xs text-emerald-500 uppercase font-bold tracking-tighter mb-1">Usuário</p>
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-[10px] bg-emerald-500 text-white inline-block px-1.5 py-0.5 rounded mt-1">{user.role}</p>
          </div>
          <button 
            onClick={() => { setPasswordError(''); setNewPassword(''); setConfirmPassword(''); setIsPasswordModalOpen(true); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-emerald-400 hover:text-white transition-colors"
          >
            <KeyRound size={18} />
            <span className="text-sm">Alterar senha</span>
          </button>
          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-emerald-400 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Modal Alterar minha senha */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Alterar minha senha</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500">Informe a nova senha. Não é necessário enviar email.</p>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Repita a nova senha"
              />
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setPasswordError('');
                  if (newPassword.length < 6) {
                    setPasswordError('A senha deve ter no mínimo 6 caracteres.');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError('As senhas não coincidem.');
                    return;
                  }
                  setPasswordLoading(true);
                  const result = await updatePassword(newPassword);
                  setPasswordLoading(false);
                  if (result.success) {
                    setNewPassword('');
                    setConfirmPassword('');
                    setIsPasswordModalOpen(false);
                    alert('Senha alterada com sucesso.');
                  } else {
                    setPasswordError(result.error || 'Erro ao alterar senha.');
                  }
                }}
                disabled={passwordLoading}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {passwordLoading ? 'Salvando...' : 'Alterar senha'}
              </button>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="py-2.5 px-4 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
