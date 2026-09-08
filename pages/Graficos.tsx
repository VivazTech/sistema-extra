import React, { Suspense, useEffect, useState } from 'react';
import {
  Calendar,
  Filter,
  BarChart3,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle2,
  Users,
  UserCheck,
  AlertCircle,
  FileText,
  Shield,
  LayoutDashboard,
} from 'lucide-react';
import { SECTOR_FILTER_OPTIONS } from '../components/ExportFormatModal';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import { DatabaseLoading } from '../components/LoadingLottie';

const ReportsOverviewCharts = React.lazy(() => import('../components/reports/ReportsOverviewCharts'));
const FrequencyReport = React.lazy(() => import('../components/reports/FrequencyReport'));
const PunctualityReport = React.lazy(() => import('../components/reports/PunctualityReport'));
const FinancialReport = React.lazy(() => import('../components/reports/FinancialReport'));
const SaldoUsageReport = React.lazy(() => import('../components/reports/SaldoUsageReport'));
const ApprovalReport = React.lazy(() => import('../components/reports/ApprovalReport'));
const DemandReport = React.lazy(() => import('../components/reports/DemandReport'));
const PerformanceReport = React.lazy(() => import('../components/reports/PerformanceReport'));
const ObservationsReport = React.lazy(() => import('../components/reports/ObservationsReport'));
const RequesterReport = React.lazy(() => import('../components/reports/RequesterReport'));
const AuditReport = React.lazy(() => import('../components/reports/AuditReport'));
const ExecutiveDashboard = React.lazy(() => import('../components/reports/ExecutiveDashboard'));

interface ChartTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType<{ startDate?: string; endDate?: string; sector?: string; event?: string }>;
  roles: string[];
}

const Graficos: React.FC = () => {
  const { events } = useExtras();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('VIVAZ');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('resumo-graficos');

  const chartTabs: ChartTab[] = [
    {
      id: 'resumo-graficos',
      label: 'Resumo e Gráficos',
      icon: BarChart3,
      component: ReportsOverviewCharts,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'executive',
      label: 'Dashboard Executivo',
      icon: LayoutDashboard,
      component: ExecutiveDashboard,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'frequency',
      label: 'Frequência e Faltas',
      icon: TrendingDown,
      component: FrequencyReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER'],
    },
    {
      id: 'punctuality',
      label: 'Pontualidade',
      icon: Clock,
      component: PunctualityReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER'],
    },
    {
      id: 'financial',
      label: 'Financeiro',
      icon: DollarSign,
      component: FinancialReport,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'saldo',
      label: 'Utilização de Saldo',
      icon: BarChart3,
      component: SaldoUsageReport,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'approval',
      label: 'Aprovações',
      icon: CheckCircle2,
      component: ApprovalReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER'],
    },
    {
      id: 'demand',
      label: 'Demanda por Setor',
      icon: Users,
      component: DemandReport,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'performance',
      label: 'Performance de Extras',
      icon: UserCheck,
      component: PerformanceReport,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'observations',
      label: 'Observações',
      icon: AlertCircle,
      component: ObservationsReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER'],
    },
    {
      id: 'requester',
      label: 'Por Solicitante',
      icon: FileText,
      component: RequesterReport,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'audit',
      label: 'Auditoria',
      icon: Shield,
      component: AuditReport,
      roles: ['ADMIN'],
    },
  ];

  const availableTabs = chartTabs.filter((tab) => tab.roles.includes(user?.role || ''));

  useEffect(() => {
    const hasActive = availableTabs.some((tab) => tab.id === activeTab);
    if (!hasActive && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const ActiveComponent =
    availableTabs.find((tab) => tab.id === activeTab)?.component ??
    availableTabs[0]?.component ??
    ReportsOverviewCharts;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} className="text-emerald-600" />
            Gráficos
          </h1>
          <p className="text-gray-500 mt-1">
            Análises, estatísticas e indicadores do sistema de controle de extras
          </p>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <Filter size={18} className="text-gray-400 shrink-0" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              title="Filtrar por setor"
            >
              {SECTOR_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              title="Filtrar por evento"
            >
              <option value="">Todos os eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.name}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <Calendar size={18} className="text-gray-400 shrink-0" />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full min-w-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Data inicial"
              />
              <span className="text-gray-400 shrink-0 text-sm">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Data final"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-1 p-2">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <Suspense fallback={<DatabaseLoading message="Carregando gráficos..." minHeight="min-h-[40vh]" />}>
            <ActiveComponent
              startDate={startDate || undefined}
              endDate={endDate || undefined}
              sector={selectedSector}
              event={selectedEvent || undefined}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Graficos;
