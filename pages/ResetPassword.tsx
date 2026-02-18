import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Token de recuperação na URL: Supabase envia #access_token=...&type=recovery
    // Após PASSWORD_RECOVERY o AuthContext redireciona para #/reset-password (sessão já está ativa)
    const hash = window.location.hash.substring(1);
    const queryPart = hash.includes('?') ? hash.split('?')[1] : hash;
    const hashParams = new URLSearchParams(queryPart);
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'recovery') return; // Token válido na URL, Supabase vai definir a sessão

    // Sem token: verificar se é redirecionamento pós-recovery (sessão já existe) ou link expirado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return; // Sessão de recovery ativa, exibir formulário
      const isResetPasswordPath = hash.startsWith('/reset-password') || hash.startsWith('reset-password');
      if (isResetPasswordPath && !accessToken) {
        setError('Link de recuperação inválido ou expirado. Solicite um novo link na tela de login.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // Atualizar senha no Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        setError(updateError.message || 'Erro ao atualizar senha');
        setLoading(false);
        return;
      }

      // Fazer logout para que o usuário acesse com a nova senha na tela de login
      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      setError(error.message || 'Erro ao atualizar senha');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-emerald-400/10 text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Senha Atualizada!</h2>
            <p className="text-gray-600 mb-6">Sua senha foi atualizada com sucesso.</p>
            <p className="text-sm text-gray-500">Redirecionando para o login...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-black text-white tracking-tight">Redefinir Senha</h1>
          <p className="text-emerald-300 mt-2 font-medium">Crie uma nova senha para sua conta</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-emerald-400/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                Nova Senha
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
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

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Digite a senha novamente"
                  minLength={6}
                  className={`w-full px-5 py-4 pr-12 rounded-2xl bg-gray-50 border focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium ${error ? 'border-red-300' : 'border-gray-100'}`}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 uppercase tracking-widest text-sm"
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                disabled={loading}
              >
                Voltar ao login
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-emerald-400/50 text-xs font-bold uppercase tracking-widest mt-8">
          © 2024 Vivaz Cataratas Resort • TI & RH
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
