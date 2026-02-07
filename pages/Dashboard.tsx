
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
  X,
  Calculator
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { RequestStatus } from '../types';
import { formatDateBR } from '../utils/date';

const Dashboard: React.FC = () => {
  const { requests, sectors, getSaldoForWeek } = useExtras();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const sectorsToShow = useMemo(() => {
    if (user?.sectors?.length) return user.sectors;
    return sectors.map((s) => s.name);
  }, [user?.sectors, sectors]);

  // Recalcula quando requests mudam (ex.: após apagar solicitações), para refletir saldo atual
  const saldoBySector = useMemo(() => {
    return sectorsToShow.map((setor) => {
      const saldo = getSaldoForWeek(setor, todayStr);
      return { setor, saldo };
    });
  }, [sectorsToShow, todayStr, getSaldoForWeek, requests]);

  const todayRequests = requests.filter(r => r.workDays.some(d => d.date === todayStr));

  // Setores mais ativos: porcentagem de solicitações nos últimos 7 dias (atualiza com requests)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const requestsLast7Days = useMemo(() => {
    return requests.filter((r) => {
      const hasWorkDayInLast7 = r.workDays.some((d) => d.date >= sevenDaysAgoStr && d.date <= todayStr);
      return hasWorkDayInLast7;
    });
  }, [requests, sevenDaysAgoStr, todayStr]);

  const setoresMaisAtivos = useMemo(() => {
    const total = requestsLast7Days.length;
    if (total === 0) return [];
    const bySector: Record<string, number> = {};
    requestsLast7Days.forEach((r) => {
      bySector[r.sector] = (bySector[r.sector] || 0) + 1;
    });
    return Object.entries(bySector)
      .map(([setor, count]) => ({
        setor,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [requestsLast7Days]);

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

          {/* Setores mais ativos (últimos 7 dias) - atualiza com base em requests */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" />
              Setores mais ativos
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Porcentagem de solicitações nos últimos 7 dias. Atualiza automaticamente ao alterar ou apagar solicitações.
            </p>
            <div className="space-y-4">
              {setoresMaisAtivos.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma solicitação nos últimos 7 dias.</p>
              ) : (
                setoresMaisAtivos.map(({ setor, count, percent }) => (
                  <div key={setor}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-semibold text-gray-900">{setor}</span>
                      <span className="font-bold text-emerald-600">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{count} {count === 1 ? 'solicitação' : 'solicitações'}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-emerald-600" />
              Saldo dos setores
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Saldo disponível desta semana (extras que ainda podem ser aprovados).
            </p>
            <div className="space-y-4">
              {saldoBySector.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum setor vinculado ou cadastrado.</p>
              ) : (
                saldoBySector.map(({ setor, saldo }) => (
                  <div key={setor}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-semibold text-gray-900">{setor}</span>
                      <span className={`font-bold ${
                        saldo === 'no-record' ? 'text-gray-400' :
                        typeof saldo === 'number' && saldo >= 0 ? 'text-emerald-600' :
                        'text-amber-600'
                      }`}>
                        {saldo === 'no-record' ? 'Sem registro' : typeof saldo === 'number' ? `${saldo} ${saldo === 1 ? 'dia' : 'dias'}` : '-'}
                      </span>
                    </div>
                    {saldo !== 'no-record' && typeof saldo === 'number' && (
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${saldo >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, saldo * 15))}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => navigate('/admin/saldo-extras')}
              className="mt-4 text-sm font-semibold text-emerald-600 hover:underline"
            >
              Ver Saldo de Extras →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
