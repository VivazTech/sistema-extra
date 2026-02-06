import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { Eye, EyeOff, Mail, X, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const { login, resetPassword, isAuthenticated, user } = useAuth();
  const { getFirstAccessiblePath } = useAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const target = user ? getFirstAccessiblePath(user.role) : '/';
      navigate(target);
    }
  }, [getFirstAccessiblePath, isAuthenticated, navigate, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || 'Erro ao fazer login');
        setLoading(false);
      } else {
        // Se o login foi bem-sucedido, o loading será gerenciado pelo AuthContext
        // e o usuário será redirecionado pelo useEffect
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setForgotPasswordLoading(true);

    if (!forgotPasswordEmail) {
      setForgotPasswordMessage('Por favor, informe seu email');
      setForgotPasswordLoading(false);
      return;
    }

    const result = await resetPassword(forgotPasswordEmail);
    
    if (result.success) {
      setForgotPasswordMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setForgotPasswordEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordMessage('');
      }, 3000);
    } else {
      setForgotPasswordMessage(result.error || 'Erro ao enviar email de recuperação');
    }
    
    setForgotPasswordLoading(false);
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

        {!showForgotPassword ? (
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
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Insira sua senha"
                    className={`w-full px-5 py-4 pr-12 rounded-2xl bg-gray-50 border focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium ${error ? 'border-red-300' : 'border-gray-100'}`}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="flex-shrink-0 text-red-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-800 text-sm font-bold">Não foi possível entrar</p>
                    <p className="text-red-600 text-sm mt-0.5">
                      {error.includes('incorretos') ? 'Usuário ou senha incorretos. Verifique e tente novamente.' : error}
                    </p>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 uppercase tracking-widest text-sm"
              >
                {loading ? 'Entrando...' : 'Acessar Sistema'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-emerald-400/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-800">Recuperar Senha</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setForgotPasswordMessage('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                  Email cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="email" 
                    required
                    placeholder="seu@email.com"
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                    value={forgotPasswordEmail}
                    onChange={(e) => { setForgotPasswordEmail(e.target.value); setForgotPasswordMessage(''); }}
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                  Enviaremos um link de recuperação para seu email
                </p>
              </div>

              {forgotPasswordMessage && (
                <div className={`rounded-xl p-3 ${forgotPasswordMessage.includes('enviado') ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm font-medium ${forgotPasswordMessage.includes('enviado') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {forgotPasswordMessage}
                  </p>
                </div>
              )}

              <button 
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 uppercase tracking-widest text-sm"
              >
                {forgotPasswordLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordMessage('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={forgotPasswordLoading}
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="text-center text-emerald-400/50 text-xs font-bold uppercase tracking-widest mt-8">
          © 2024 Vivaz Cataratas Resort • TI & RH
        </p>
      </div>
    </div>
  );
};

export default Login;
