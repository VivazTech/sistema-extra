import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Filter
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useAuth } from '../context/AuthContext';
import type { ExtraRequest } from '../types';

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
import { SECTOR_FILTER_OPTIONS } from '../components/ExportFormatModal';

interface ReportTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType<{ startDate?: string; endDate?: string; sector?: string }>;
  roles: string[];
}

/** Escapa valor para CSV (aspas se contiver vírgula ou quebra de linha). */
function csvEscape(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Formata data ISO para exibição em CSV. */
function formatDateCSV(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

const Reports: React.FC = () => {
  const { user, requests } = useExtras();
  const [activeTab, setActiveTab] = useState('recibos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('VIVAZ');

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

  // Solicitações filtradas por período e setor (para exportar) - setor usa VIVAZ/AQUAMANIA como Baixar Recibos
  const requestsForExport = useMemo(() => {
    let list = requests;
    if (startDate || endDate) {
      list = list.filter(req => {
        const hasWorkDayInRange = req.workDays.some(day => {
          const dayDate = new Date(day.date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          return (!start || dayDate >= start) && (!end || dayDate <= end);
        });
        return hasWorkDayInRange;
      });
    }
    if (selectedSector === 'VIVAZ') {
      list = list.filter(req => req.sector.toLowerCase() !== 'aquamania');
    } else if (selectedSector === 'AQUAMANIA') {
      list = list.filter(req => req.sector.toLowerCase() === 'aquamania');
    }
    return list;
  }, [requests, startDate, endDate, selectedSector]);

  const handleExportCSV = () => {
    const headers = [
      'Código', 'Setor', 'Função', 'Nome do Extra', 'Líder', 'Solicitante', 'Motivo',
      'Valor (R$)', 'Status', 'Qtd. dias', 'Datas dos dias', 'Criado em', 'Observações'
    ];
    const rows = requestsForExport.map((req: ExtraRequest) => {
      const dates = req.workDays.map(d => formatDateCSV(d.date)).join('; ');
      return [
        csvEscape(req.code),
        csvEscape(req.sector),
        csvEscape(req.role),
        csvEscape(req.extraName),
        csvEscape(req.leaderName),
        csvEscape(req.requester),
        csvEscape(req.reason),
        req.value != null ? String(req.value) : '',
        csvEscape(req.status),
        String(req.workDays?.length ?? 0),
        csvEscape(dates),
        formatDateCSV(req.createdAt),
        csvEscape(req.observations)
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sectorLabel = selectedSector || 'todos';
    a.download = `relatorio-extras-${sectorLabel.replace(/\s+/g, '-')}-${startDate || 'inicio'}-${endDate || 'fim'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500">Análises e estatísticas do sistema de controle de extras</p>
        </div>
        
        {/* Filtros: Setor e Período (período oculto na sessão Recibos de Extras) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              title="Filtrar relatórios por setor (VIVAZ ou AQUAMANIA)"
            >
              {SECTOR_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {activeTab !== 'recibos' && (
            <>
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
            </>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            title="Exportar solicitações (período e setor selecionados) em CSV"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
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
            <ActiveComponent startDate={startDate} endDate={endDate} sector={selectedSector || undefined} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};

export default Reports;
