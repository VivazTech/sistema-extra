
import React, { useState } from 'react';
import { supabase, testConnection } from '../services/supabase';
import { CheckCircle, XCircle, Loader, Database, Users, Building, Clock, FileText } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
  error?: any;
}

const TestSupabase: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
    console.log(`[TEST] ${result.name}:`, result.status === 'success' ? '✅' : '❌', result.message, result.data || result.error);
  };

  const clearResults = () => {
    setResults([]);
    console.clear();
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    console.log('🚀 Iniciando testes de conexão com Supabase...');
    console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada');

    // Teste 1: Conexão Básica
    addResult({ name: 'Conexão Básica', status: 'pending', message: 'Testando...' });
    try {
      const connectionTest = await testConnection();
      if (connectionTest.success) {
        addResult({ 
          name: 'Conexão Básica', 
          status: 'success', 
          message: 'Conexão estabelecida com sucesso!',
          data: connectionTest.data
        });
      } else {
        addResult({ 
          name: 'Conexão Básica', 
          status: 'error', 
          message: 'Falha na conexão',
          error: connectionTest.error
        });
        setIsRunning(false);
        return;
      }
    } catch (error: any) {
      addResult({ 
        name: 'Conexão Básica', 
        status: 'error', 
        message: 'Erro ao conectar',
        error: error.message
      });
      setIsRunning(false);
      return;
    }

    // Teste 2: Buscar Setores
    addResult({ name: 'Buscar Setores', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      addResult({ 
        name: 'Buscar Setores', 
        status: 'success', 
        message: `${data?.length || 0} setores encontrados`,
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Setores', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 3: Buscar Funções por Setor
    addResult({ name: 'Buscar Funções', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('sector_roles')
        .select('*, sectors(name)')
        .eq('active', true)
        .limit(10);

      if (error) throw error;
      addResult({ 
        name: 'Buscar Funções', 
        status: 'success', 
        message: `${data?.length || 0} funções encontradas`,
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Funções', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 4: Buscar Usuários
    addResult({ name: 'Buscar Usuários', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      addResult({ 
        name: 'Buscar Usuários', 
        status: 'success', 
        message: `${data?.length || 0} usuários encontrados`,
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Usuários', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 5: Buscar Solicitantes
    addResult({ name: 'Buscar Solicitantes', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('requesters')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      addResult({ 
        name: 'Buscar Solicitantes', 
        status: 'success', 
        message: `${data?.length || 0} solicitantes encontrados`,
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Solicitantes', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 6: Buscar Motivos
    addResult({ name: 'Buscar Motivos', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('reasons')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      addResult({ 
        name: 'Buscar Motivos', 
        status: 'success', 
        message: `${data?.length || 0} motivos encontrados`,
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Motivos', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 7: Buscar Solicitações
    addResult({ name: 'Buscar Solicitações', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('extra_requests')
        .select('*, sectors(name), users!extra_requests_leader_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      addResult({ 
        name: 'Buscar Solicitações', 
        status: 'success', 
        message: `${data?.length || 0} solicitações encontradas`,
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Solicitações', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 8: Criar Solicitação de Teste
    addResult({ name: 'Criar Solicitação (Teste)', status: 'pending', message: 'Testando...' });
    try {
      // Buscar primeiro setor e usuário
      const { data: sectors } = await supabase.from('sectors').select('id').limit(1).single();
      const { data: users } = await supabase.from('users').select('id, name').limit(1).single();
      const { data: requesters } = await supabase.from('requesters').select('id, name').limit(1).single();
      const { data: reasons } = await supabase.from('reasons').select('id, name').limit(1).single();

      if (!sectors || !users || !requesters || !reasons) {
        throw new Error('Dados iniciais não encontrados');
      }

      // Criar solicitação de teste
      const { data: newRequest, error: insertError } = await supabase
        .from('extra_requests')
        .insert({
          sector_id: sectors.id,
          role_name: 'Teste',
          leader_id: users.id,
          leader_name: users.name,
          requester_id: requesters.id,
          requester_name: requesters.name,
          reason_id: reasons.id,
          reason_name: reasons.name,
          extra_name: 'TESTE - ' + new Date().toLocaleTimeString(),
          value: 130.00,
          status: 'SOLICITADO',
          urgency: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Criar dia de trabalho de teste
      const { error: workDayError } = await supabase
        .from('work_days')
        .insert({
          request_id: newRequest.id,
          work_date: new Date().toISOString().split('T')[0],
          shift: 'Manhã',
          value: 130.00,
        });

      if (workDayError) throw workDayError;

      addResult({ 
        name: 'Criar Solicitação (Teste)', 
        status: 'success', 
        message: 'Solicitação de teste criada com sucesso!',
        data: { request: newRequest }
      });
    } catch (error: any) {
      addResult({ 
        name: 'Criar Solicitação (Teste)', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 9: Buscar Configurações
    addResult({ name: 'Buscar Configurações', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('extra_saldo_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      addResult({ 
        name: 'Buscar Configurações', 
        status: 'success', 
        message: 'Configurações encontradas',
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Buscar Configurações', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    // Teste 10: Testar Views
    addResult({ name: 'Testar Views', status: 'pending', message: 'Testando...' });
    try {
      const { data, error } = await supabase
        .from('vw_extra_requests_full')
        .select('*')
        .limit(3);

      if (error) throw error;
      addResult({ 
        name: 'Testar Views', 
        status: 'success', 
        message: 'Views funcionando corretamente',
        data: data
      });
    } catch (error: any) {
      addResult({ 
        name: 'Testar Views', 
        status: 'error', 
        message: error.message,
        error: error
      });
    }

    setIsRunning(false);
    console.log('✅ Todos os testes concluídos!');
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const pendingCount = results.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="text-emerald-600" size={28} />
          Teste de Conexão - Supabase
        </h1>
        <p className="text-gray-500 mt-1">
          Página de testes para verificar a conexão e funcionalidades do banco de dados
        </p>
      </header>

      {/* Informações de Ambiente */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4">Variáveis de Ambiente</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-600 w-32">VITE_SUPABASE_URL:</span>
            <span className={import.meta.env.VITE_SUPABASE_URL ? 'text-emerald-600 font-mono' : 'text-red-600'}>
              {import.meta.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-600 w-32">VITE_SUPABASE_ANON_KEY:</span>
            <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-emerald-600 font-mono' : 'text-red-600'}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada'}
            </span>
          </div>
          {import.meta.env.VITE_SUPABASE_URL && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-600 text-xs">URL:</span>
              <p className="text-xs font-mono text-gray-500 break-all">{import.meta.env.VITE_SUPABASE_URL}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex gap-4">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader className="animate-spin" size={20} />
              Executando testes...
            </>
          ) : (
            <>
              <Database size={20} />
              Executar Todos os Testes
            </>
          )}
        </button>
        <button
          onClick={clearResults}
          disabled={isRunning}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all disabled:opacity-50"
        >
          Limpar Resultados
        </button>
      </div>

      {/* Resumo */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Resumo dos Testes</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="text-3xl font-black text-emerald-600">{successCount}</div>
              <div className="text-sm text-gray-600 font-bold">Sucessos</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-3xl font-black text-red-600">{errorCount}</div>
              <div className="text-sm text-gray-600 font-bold">Erros</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <div className="text-3xl font-black text-amber-600">{pendingCount}</div>
              <div className="text-sm text-gray-600 font-bold">Pendentes</div>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
              result.status === 'success' ? 'border-emerald-200' :
              result.status === 'error' ? 'border-red-200' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {result.status === 'success' && <CheckCircle className="text-emerald-600" size={24} />}
                {result.status === 'error' && <XCircle className="text-red-600" size={24} />}
                {result.status === 'pending' && <Loader className="text-amber-600 animate-spin" size={24} />}
                <h3 className="font-bold text-gray-900 text-lg">{result.name}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                result.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                result.status === 'error' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {result.status}
              </span>
            </div>
            
            <p className={`text-sm mb-3 ${
              result.status === 'success' ? 'text-emerald-700' :
              result.status === 'error' ? 'text-red-700' :
              'text-amber-700'
            }`}>
              {result.message}
            </p>

            {/* Dados */}
            {result.data && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-bold text-gray-600 hover:text-gray-900">
                  Ver dados ({typeof result.data === 'object' ? JSON.stringify(result.data).length : result.data.length} caracteres)
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}

            {/* Erro */}
            {result.error && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-bold text-red-600 hover:text-red-900">
                  Ver erro
                </summary>
                <pre className="mt-2 p-4 bg-red-50 rounded-lg text-xs overflow-auto max-h-64 text-red-800">
                  {JSON.stringify(result.error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Instruções */}
      {results.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-blue-900 mb-2">📋 Instruções</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Clique em "Executar Todos os Testes" para iniciar</li>
            <li>Os resultados aparecerão abaixo com status de sucesso ou erro</li>
            <li>Abra o Console do navegador (F12) para ver logs detalhados</li>
            <li>Clique em "Ver dados" ou "Ver erro" para expandir detalhes</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestSupabase;
