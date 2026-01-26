
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_USERS } from '../constants';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const isPortariaProfile = user?.role === 'PORTARIA' || user?.role === 'VIEWER';
      navigate(isPortariaProfile ? '/portaria' : '/');
    }
  }, [isAuthenticated, navigate, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username);
    if (!success) {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6 border-4 border-emerald-400/30">
            <span className="text-white text-4xl font-black">V</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Portal Vivaz Extras</h1>
          <p className="text-emerald-300 mt-2 font-medium">Controle de Funcionários Extras</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-emerald-400/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Usuário</label>
              <input 
                type="text" 
                required
                placeholder="Insira seu login"
                className={`w-full px-5 py-4 rounded-2xl bg-gray-50 border focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium ${error ? 'border-red-300' : 'border-gray-100'}`}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(false); }}
              />
              {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1">Usuário não encontrado. Tente 'admin', 'gerente' ou 'lider'.</p>}
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 uppercase tracking-widest text-sm"
            >
              Acessar Sistema
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
            <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Acesso rápido (Demos)</p>
            <div className="grid grid-cols-2 gap-2">
              {MOCK_USERS.map(u => (
                <button 
                  key={u.id}
                  onClick={() => setUsername(u.username)}
                  className="px-4 py-2 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 rounded-xl text-[10px] font-black uppercase transition-colors"
                >
                  {u.name.split(' ')[0]} ({u.role})
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-emerald-400/50 text-xs font-bold uppercase tracking-widest mt-8">
          © 2024 Vivaz Cataratas Resort • TI & RH
        </p>
      </div>
    </div>
  );
};

export default Login;
