import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtraContext';
import { fetchActionLogs, ActionLogFilters } from '../services/actionLogService';
import { ActionLog } from '../types';
import { formatDateTimeWithSeconds } from '../utils/date';

const Logs: React.FC = () => {
  const { user } = useAuth();
  const { users } = useExtras();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    const filters: ActionLogFilters = { limit: 500 };
    if (filterUserId) filters.userId = filterUserId;
    if (filterDateFrom) filters.dateFrom = filterDateFrom;
    if (filterDateTo) filters.dateTo = filterDateTo;
    try {
      const data = await fetchActionLogs(filters);
      setLogs(data);
    } catch (e) {
      setError('Não foi possível carregar os logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadLogs();
  }, [user?.role, navigate, filterUserId, filterDateFrom, filterDateTo]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-emerald-600" size={28} />
          Logs de ação
        </h1>
        <button
          type="button"
          onClick={() => loadLogs()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <Filter size={18} />
          <span className="font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuário</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data até</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum registro de ação encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Data e hora</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Onde clicou / Ação</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Retorno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.user_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTimeWithSeconds(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.action_where}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate" title={log.result}>
                      {log.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
