// ============================================
// CONFIGURAÇÃO DO SUPABASE CLIENT
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Função para testar conexão
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('sectors').select('count').limit(1);
    return { success: !error, error, data };
  } catch (err) {
    return { success: false, error: err, data: null };
  }
};
