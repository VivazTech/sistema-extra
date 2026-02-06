
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  Search,
  X
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { RequestStatus } from '../types';
import { formatDateBR } from '../utils/date';

const Dashboard: React.FC = () => {
  const { requests } = useExtras();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequests = requests.filter(r => r.workDays.some(d => d.date === todayStr));

  const stats = [
    { label: 'Do Dia', value: todayRequests.length, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Solicitados', value: requests.filter(r => r.status === 'SOLICITADO').length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Aprovados', value: requests.filter(r => r.status === 'APROVADO').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Reprovados', value: requests.filter(r => r.status === 'REPROVADO').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.extraName?.toLowerCase().includes(q) ||
        r.sector?.toLowerCase().includes(q) ||
        r.role?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q) ||
        r.requester?.toLowerCase().includes(q) ||
        r.leaderName?.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const recentRequests = searchQuery.trim() ? filteredRequests.slice(0, 20) : filteredRequests.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Resumo Gerencial</h1>
        <p className="text-gray-500">Bem-vindo ao portal de controle de funcionários extras Vivaz Cataratas.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock size={20} className="text-emerald-600" />
                Solicitações Recentes
              </h2>
              <button
                onClick={() => navigate('/solicitacoes')}
                className="text-sm text-emerald-600 font-semibold hover:underline"
              >
                Ver todas
              </button>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, setor, função, status ou demandante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${searchQuery ? 'pr-10' : 'pr-4'}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
                  aria-label="Limpar busca"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                {searchQuery.trim() ? 'Nenhuma solicitação corresponde à busca.' : 'Nenhuma solicitação encontrada.'}
              </div>
            ) : (
              recentRequests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                      {req.extraName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{req.extraName}</p>
                      <p className="text-xs text-gray-500">{req.sector} • {req.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase
                      ${req.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' : ''}
                      ${req.status === 'SOLICITADO' ? 'bg-amber-100 text-amber-700' : ''}
                      ${req.status === 'REPROVADO' ? 'bg-red-100 text-red-700' : ''}
                      ${req.status === 'CANCELADO' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {req.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDateBR(req.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / Tips */}
        <div className="space-y-6">
          <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Dica de Gestão</h3>
              <p className="text-emerald-100 text-sm opacity-90 leading-relaxed">
                Mantenha os cadastros de setores, funções, demandantes e motivos atualizados para agilizar novas solicitações.
              </p>
              <button 
                onClick={() => navigate('/solicitacoes')}
                className="mt-4 flex items-center gap-2 text-sm font-bold bg-white text-emerald-900 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Nova Solicitação <ArrowUpRight size={16} />
              </button>
            </div>
            <Users size={80} className="absolute -bottom-4 -right-4 text-emerald-800 opacity-30" />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Setores mais ativos</h3>
            <div className="space-y-4">
              {['Restaurante', 'Governança', 'Lazer'].map((s, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{s}</span>
                    <span>{35 - (idx * 10)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${35 - (idx * 10)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
