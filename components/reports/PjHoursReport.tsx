import React, { useEffect, useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatWorkedHours } from '../../utils/pjHours';
import { formatDateBR } from '../../utils/date';

function csvEscape(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type Row = {
  work_date: string;
  arrival: string | null;
  break_start: string | null;
  break_end: string | null;
  departure: string | null;
  employee_name: string;
  sector_name: string;
};

interface Props {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

const PjHoursReport: React.FC<Props> = ({ startDate, endDate, sector }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pj_time_records')
          .select(
            `
            work_date,
            arrival,
            break_start,
            break_end,
            departure,
            pj_employees (
              name,
              active,
              sectors ( name )
            )
          `
          )
          .order('work_date', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const list: Row[] = (data || [])
          .filter((r: any) => r.pj_employees && r.pj_employees.active !== false)
          .map((r: any) => ({
            work_date: r.work_date,
            arrival: r.arrival,
            break_start: r.break_start,
            break_end: r.break_end,
            departure: r.departure,
            employee_name: r.pj_employees?.name || '—',
            sector_name: r.pj_employees?.sectors?.name || '—',
          }));

        let filtered = list;
        if (startDate) {
          filtered = filtered.filter((x) => x.work_date >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter((x) => x.work_date <= endDate);
        }
        if (sector === 'VIVAZ') {
          filtered = filtered.filter((x) => x.sector_name.toLowerCase() !== 'aquamania');
        } else if (sector === 'AQUAMANIA') {
          filtered = filtered.filter((x) => x.sector_name.toLowerCase() === 'aquamania');
        }

        setRows(filtered);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, sector]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dc = b.work_date.localeCompare(a.work_date);
      if (dc !== 0) return dc;
      return a.employee_name.localeCompare(b.employee_name, 'pt-BR');
    });
  }, [rows]);

  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Nome',
      'Setor',
      'Entrada',
      'Saída intervalo',
      'Volta intervalo',
      'Saída final',
      'Total trabalhado',
    ];
    const lines = sorted.map((r) => {
      const total = formatWorkedHours(
        r.arrival || undefined,
        r.break_start || undefined,
        r.break_end || undefined,
        r.departure || undefined
      );
      const dateDisp = formatDateBR(new Date(`${r.work_date}T12:00:00`));
      return [
        csvEscape(dateDisp),
        csvEscape(r.employee_name),
        csvEscape(r.sector_name),
        csvEscape(r.arrival || ''),
        csvEscape(r.break_start || ''),
        csvEscape(r.break_end || ''),
        csvEscape(r.departure || ''),
        csvEscape(total),
      ].join(',');
    });
    const csv = [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ponto-pj-${startDate || 'inicio'}-${endDate || 'fim'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-8">Carregando registros PJ…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Ponto — Funcionários PJ</h2>
          <p className="text-sm text-gray-500">
            Lista por dia: entrada, intervalo, volta do intervalo, saída final e total de horas (sem valores financeiros).
          </p>
        </div>
        {sorted.length > 0 && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            title="Baixar esta tabela em CSV (UTF-8)"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum registro no período.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Setor</th>
                <th className="px-3 py-2">Entrada</th>
                <th className="px-3 py-2">Saída intervalo</th>
                <th className="px-3 py-2">Volta intervalo</th>
                <th className="px-3 py-2">Saída final</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((r, i) => (
                <tr key={`${r.work_date}-${r.employee_name}-${i}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateBR(new Date(`${r.work_date}T12:00:00`))}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.employee_name}</td>
                  <td className="px-3 py-2">{r.sector_name}</td>
                  <td className="px-3 py-2 font-mono">{r.arrival || '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.break_start || '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.break_end || '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.departure || '—'}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-violet-700">
                    {formatWorkedHours(r.arrival || undefined, r.break_start || undefined, r.break_end || undefined, r.departure || undefined)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PjHoursReport;
