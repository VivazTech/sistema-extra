/**
 * Página de teste: consulta direta em extra_requests até 09/02.
 * Acesse via: /#/test-extra-requests-old
 * Não aparece no menu; serve para validar se o Supabase retorna registros antigos.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Database, Loader, CheckCircle, XCircle } from 'lucide-react';

const LIMITE_DATA = '2026-02-09'; // até 09/02 (inclusive)

interface Row {
  id: string;
  code: string | null;
  created_at: string | null;
  extra_name: string | null;
  status: string | null;
  sector_id: string | null;
  value: number | null;
}

const TestExtraRequestsOld: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setRows([]);
      setTotalCount(null);

      try {
        // Consulta direta: created_at <= fim do dia 09/02, ordenado do mais antigo ao mais recente
        const endOfDay = `${LIMITE_DATA}T23:59:59.999Z`;
        const { data, error: qError } = await supabase
          .from('extra_requests')
          .select('id, code, created_at, extra_name, status, sector_id, value')
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: true });

        if (cancelled) return;
        if (qError) {
          setError(qError.message);
          setLoading(false);
          return;
        }

        const list = (data ?? []) as Row[];
        setRows(list);
        setTotalCount(list.length);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Erro ao consultar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-6 h-6 text-gray-600" />
        <h1 className="text-xl font-bold text-gray-800">Teste: extra_requests até 09/02</h1>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Consulta direta na tabela <code className="bg-gray-100 px-1 rounded">extra_requests</code> com{' '}
        <code className="bg-gray-100 px-1 rounded">created_at &lt;= {LIMITE_DATA} 23:59:59</code> (ordenado do mais antigo ao mais recente).
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded mb-4">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && totalCount !== null && (
        <>
          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded mb-4">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">
              Total de linhas retornadas: <strong>{totalCount}</strong>
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-gray-500">Nenhum registro encontrado com created_at até 09/02.</p>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">code</th>
                    <th className="text-left p-2">created_at</th>
                    <th className="text-left p-2">extra_name</th>
                    <th className="text-left p-2">status</th>
                    <th className="text-left p-2">value</th>
                    <th className="text-left p-2">id (truncado)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.code ?? '—'}</td>
                      <td className="p-2">{r.created_at ?? '—'}</td>
                      <td className="p-2">{r.extra_name ?? '—'}</td>
                      <td className="p-2">{r.status ?? '—'}</td>
                      <td className="p-2">{r.value ?? '—'}</td>
                      <td className="p-2 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TestExtraRequestsOld;
