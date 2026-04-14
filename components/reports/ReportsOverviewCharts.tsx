import React, { useMemo, useState } from 'react';
import { useExtras } from '../../context/ExtraContext';
import { filterBySector, catalogSectorMatchesFilter } from '../ExportFormatModal';
import { totalWorkedValue } from '../../services/excelService';
import { toDateOnlyString } from '../../utils/date';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Copy,
  Check,
} from 'lucide-react';

interface ReportsOverviewChartsProps {
  startDate?: string;
  endDate?: string;
  sector?: string;
  event?: string;
}

const ReportsOverviewCharts: React.FC<ReportsOverviewChartsProps> = ({
  startDate,
  endDate,
  sector: sectorFilter,
  event: eventFilter,
}) => {
  const { requests, sectors, getSaldoForWeek } = useExtras();
  const [copiedResumo, setCopiedResumo] = useState(false);
  const formatDateLabel = (date?: string) => {
    if (!date) return '';
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('pt-BR');
  };
  const periodoLabel = `${startDate ? formatDateLabel(startDate) : 'início'} até ${
    endDate ? formatDateLabel(endDate) : 'hoje'
  }`;

  const filteredRequests = useMemo(() => {
    let list = requests;
    const startKey = startDate ? toDateOnlyString(startDate) : undefined;
    const endKey = endDate ? toDateOnlyString(endDate) : undefined;

    if (startKey || endKey) {
      list = list
        .map((req) => ({
          ...req,
          // Recorta os dias pelo período para todos os gráficos usarem a mesma base.
          workDays: (req.workDays || []).filter((day) => {
            const dayKey = toDateOnlyString(day.date);
            if (!dayKey) return false;
            return (!startKey || dayKey >= startKey) && (!endKey || dayKey <= endKey);
          }),
        }))
        .filter((req) => req.workDays.length > 0);
    }
    if (sectorFilter) list = filterBySector(list, sectorFilter);
    if (eventFilter) {
      list = list.filter((req) => (req.eventName || '').trim() === eventFilter);
    }
    return list;
  }, [requests, startDate, endDate, sectorFilter, eventFilter]);

  const approvedRequests = filteredRequests.filter((r) => r.status === 'APROVADO');

  const totalGasto = useMemo(() => {
    return approvedRequests.reduce((sum, req) => sum + totalWorkedValue(req), 0);
  }, [approvedRequests]);

  const qtdExtrasAprovados = approvedRequests.length;

  const custoPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    approvedRequests.forEach((req) => {
      const cost = totalWorkedValue(req);
      map[req.sector] = (map[req.sector] || 0) + cost;
    });
    return Object.entries(map)
      .map(([name, custo]) => ({ name, custo: parseFloat(custo.toFixed(2)) }))
      .sort((a, b) => b.custo - a.custo);
  }, [approvedRequests]);

  const comparacaoMeses = useMemo(() => {
    const months: { [key: string]: { custo: number; extras: number } } = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months[monthKey] = { mes: monthKey, custo: 0, extras: 0 };
    }
    approvedRequests.forEach((req) => {
      const costReq = totalWorkedValue(req);
      const daysCount = req.workDays.length || 1;
      const costPerDay = costReq / daysCount;
      req.workDays.forEach((day) => {
        const date = new Date(day.date);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (months[monthKey]) {
          months[monthKey].custo += costPerDay;
          months[monthKey].extras += 1;
        }
      });
    });
    return Object.values(months);
  }, [approvedRequests]);

  const setoresUltrapassaramSaldo = useMemo(() => {
    const sectorsToShow = sectorFilter
      ? sectors.filter((s) => catalogSectorMatchesFilter(s.name, sectorFilter))
      : sectors;

    const today = new Date().toISOString().split('T')[0];
    return sectorsToShow
      .map((sector) => {
        const remaining = getSaldoForWeek(sector.name, today);
        if (
          remaining === 'no-record' ||
          remaining === null ||
          typeof remaining !== 'number' ||
          remaining >= 0
        ) {
          return null;
        }
        return {
          setor: sector.name,
          ultrapassouDias: Math.abs(remaining),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.ultrapassouDias - a.ultrapassouDias || a.setor.localeCompare(b.setor, 'pt-BR'));
  }, [sectors, getSaldoForWeek, sectorFilter]);

  const resumoSetoresAcimaSaldo = useMemo(() => {
    if (setoresUltrapassaramSaldo.length === 0) {
      return ['Resumo semanal de setores', `Período: ${periodoLabel}`, 'Nenhum setor ultrapassou o saldo no filtro selecionado.'].join('\n');
    }
    const linhas = [
      'Resumo semanal de setores',
      `Período: ${periodoLabel}`,
      ...setoresUltrapassaramSaldo.map(
        (item) =>
          `${item.setor}: Excedeu ${item.ultrapassouDias} ${item.ultrapassouDias === 1 ? 'solicitação' : 'solicitações'}`
      ),
    ];
    return linhas.join('\n');
  }, [setoresUltrapassaramSaldo, periodoLabel]);

  const handleCopyResumo = async () => {
    try {
      await navigator.clipboard.writeText(resumoSetoresAcimaSaldo);
      setCopiedResumo(true);
      setTimeout(() => setCopiedResumo(false), 1800);
    } catch (err) {
      console.error('Erro ao copiar resumo:', err);
      alert('Não foi possível copiar o resumo. Copie manualmente.');
    }
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Resumo com filtros (período, setor e evento)</h2>
        <p className="text-sm text-gray-500">
          Período: {periodoLabel} · Setor: {sectorFilter || 'todos'} · Evento: {eventFilter || 'todos'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Total gasto (período)</span>
            <DollarSign className="text-emerald-600" size={22} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalGasto)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Extras aprovados</span>
            <Users className="text-blue-600" size={22} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{qtdExtrasAprovados}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Setores no período</span>
            <BarChart3 className="text-purple-600" size={22} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{custoPorSetor.length}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Setores acima do saldo</span>
            <AlertTriangle className="text-amber-600" size={22} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{setoresUltrapassaramSaldo.length}</div>
        </div>
      </div>

      {/* Indicadores: setores que ultrapassaram o saldo */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-amber-600" size={20} />
          <h3 className="font-bold text-amber-900">Setores que ultrapassaram o saldo</h3>
        </div>
        <p className="text-sm text-amber-900 mb-3">
          Período dos dados: <span className="font-semibold">{periodoLabel}</span>
        </p>
        {setoresUltrapassaramSaldo.length === 0 ? (
          <div className="bg-white rounded-lg p-4 border border-amber-100 text-sm text-gray-700">
            Nenhum setor ultrapassou o saldo no filtro selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {setoresUltrapassaramSaldo.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-4 border border-amber-100 flex justify-between items-center"
              >
                <span className="font-medium text-gray-900">{item.setor}</span>
                <span className="text-amber-700 font-bold">
                  +{item.ultrapassouDias} dia{item.ultrapassouDias !== 1 ? 's' : ''} acima do saldo
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 bg-white border border-amber-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h4 className="font-semibold text-amber-900">Resumo do gráfico</h4>
            <button
              type="button"
              onClick={handleCopyResumo}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                copiedResumo
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
              title="Copiar resumo"
            >
              {copiedResumo ? <Check size={14} /> : <Copy size={14} />}
              {copiedResumo ? 'Copiado!' : 'Copiar resumo'}
            </button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{resumoSetoresAcimaSaldo}</pre>
        </div>
      </div>

      {/* Gráfico: comparação de meses */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-emerald-600" size={20} />
          <h3 className="text-lg font-bold text-gray-900">Comparação de meses (últimos 6 meses)</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparacaoMeses}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => [formatCurrency(value), 'Custo']} />
            <Legend />
            <Line
              type="monotone"
              dataKey="custo"
              stroke="#059669"
              name="Custo (R$)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico: valor total gasto por setor (com filtro de período) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold text-gray-900">Valor total gasto por setor (período selecionado)</h3>
        </div>
        {custoPorSetor.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Nenhum dado no período/setor selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={custoPorSetor} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Custo']} />
              <Bar dataKey="custo" fill="#2563eb" name="Custo (R$)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico: comparação de gasto por setor (barras verticais alternativo) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Comparativo de gastos por setor (período)</h3>
        {custoPorSetor.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Nenhum dado no período/setor selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={custoPorSetor}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-25} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Custo']} />
              <Bar dataKey="custo" fill="#059669" name="Custo (R$)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ReportsOverviewCharts;
