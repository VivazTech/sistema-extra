
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  BarChart3, 
  CheckCircle2, 
  Users, 
  AlertCircle, 
  UserCheck, 
  FileWarning, 
  Shield, 
  LayoutDashboard,
  Download,
  Calendar
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';

// Importar componentes de relatórios
import FrequencyReport from '../components/reports/FrequencyReport';
import PunctualityReport from '../components/reports/PunctualityReport';
import FinancialReport from '../components/reports/FinancialReport';
import SaldoUsageReport from '../components/reports/SaldoUsageReport';
import ApprovalReport from '../components/reports/ApprovalReport';
import DemandReport from '../components/reports/DemandReport';
import PerformanceReport from '../components/reports/PerformanceReport';
import ObservationsReport from '../components/reports/ObservationsReport';
import RequesterReport from '../components/reports/RequesterReport';
import IncompleteRecordsReport from '../components/reports/IncompleteRecordsReport';
import AuditReport from '../components/reports/AuditReport';
import ExecutiveDashboard from '../components/reports/ExecutiveDashboard';
import RecibosExtrasReport from '../components/reports/RecibosExtrasReport';

interface ReportTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType<{ startDate?: string; endDate?: string }>;
  roles: string[];
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recibos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportTabs: ReportTab[] = [
    { 
      id: 'recibos', 
      label: 'Recibos de Extras', 
      icon: FileText, 
      component: RecibosExtrasReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER']
    },
    { 
      id: 'executive', 
      label: 'Dashboard Executivo', 
      icon: LayoutDashboard, 
      component: ExecutiveDashboard,
      roles: ['ADMIN', 'MANAGER']
    },
    { 
      id: 'frequency', 
      label: 'Frequência e Faltas', 
      icon: TrendingDown, 
      component: FrequencyReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER']
    },
    { 
      id: 'punctuality', 
      label: 'Pontualidade', 
      icon: Clock, 
      component: PunctualityReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER']
    },
    { 
      id: 'financial', 
      label: 'Financeiro', 
      icon: DollarSign, 
      component: FinancialReport,
      roles: ['ADMIN', 'MANAGER']
    },
    { 
      id: 'saldo', 
      label: 'Utilização de Saldo', 
      icon: BarChart3, 
      component: SaldoUsageReport,
      roles: ['ADMIN', 'MANAGER']
    },
    { 
      id: 'approval', 
      label: 'Aprovações', 
      icon: CheckCircle2, 
      component: ApprovalReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER']
    },
    { 
      id: 'demand', 
      label: 'Demanda por Setor', 
      icon: Users, 
      component: DemandReport,
      roles: ['ADMIN', 'MANAGER']
    },
    { 
      id: 'performance', 
      label: 'Performance de Extras', 
      icon: UserCheck, 
      component: PerformanceReport,
      roles: ['ADMIN', 'MANAGER']
    },
    { 
      id: 'observations', 
      label: 'Observações', 
      icon: AlertCircle, 
      component: ObservationsReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER']
    },
    { 
      id: 'requester', 
      label: 'Por Solicitante', 
      icon: FileText, 
      component: RequesterReport,
      roles: ['ADMIN', 'MANAGER']
    },
    { 
      id: 'incomplete', 
      label: 'Registros Incompletos', 
      icon: FileWarning, 
      component: IncompleteRecordsReport,
      roles: ['ADMIN', 'MANAGER', 'LEADER']
    },
    { 
      id: 'audit', 
      label: 'Auditoria', 
      icon: Shield, 
      component: AuditReport,
      roles: ['ADMIN']
    },
  ];

  const availableTabs = reportTabs.filter(tab => 
    tab.roles.includes(user?.role || '')
  );

  useEffect(() => {
    const hasActive = availableTabs.some(tab => tab.id === activeTab);
    if (!hasActive && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const ActiveComponent = availableTabs.find(tab => tab.id === activeTab)?.component ?? availableTabs[0]?.component ?? RecibosExtrasReport;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500">Análises e estatísticas do sistema de controle de extras</p>
        </div>
        
        {/* Filtros de Período (oculto na sessão Recibos de Extras) */}
        {activeTab !== 'recibos' && (
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Data inicial"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Data final"
            />
          </div>
        )}
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-1 p-2">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
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

        {/* Report Content */}
        <div className="p-6">
          <React.Suspense fallback={<div className="text-center p-8 text-gray-500">Carregando...</div>}>
            <ActiveComponent startDate={startDate} endDate={endDate} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};

export default Reports;
