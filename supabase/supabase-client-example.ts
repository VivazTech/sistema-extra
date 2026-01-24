// ============================================
// EXEMPLO DE CONFIGURAÇÃO DO SUPABASE CLIENT
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================

// Instalar dependências:
// npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // Gerado automaticamente pelo Supabase CLI

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Criar cliente do Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ============================================
// EXEMPLOS DE USO
// ============================================

// 1. AUTENTICAÇÃO
export const authService = {
  // Login com username (sem senha por enquanto)
  async login(username: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('active', true)
      .single();

    if (error || !data) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    // Buscar setores do usuário (se for manager)
    let sectors: string[] = [];
    if (data.role === 'MANAGER') {
      const { data: userSectors } = await supabase
        .from('user_sectors')
        .select('sectors(name)')
        .eq('user_id', data.id);

      sectors = userSectors?.map((us: any) => us.sectors.name) || [];
    }

    return {
      success: true,
      user: {
        ...data,
        sectors,
      },
    };
  },

  // Logout
  async logout() {
    await supabase.auth.signOut();
  },
};

// 2. SOLICITAÇÕES DE EXTRAS
export const requestsService = {
  // Buscar todas as solicitações
  async getAll(filters?: {
    status?: string;
    sector?: string;
    date?: string;
  }) {
    let query = supabase
      .from('extra_requests')
      .select(`
        *,
        sectors(name),
        users!extra_requests_leader_id_fkey(name),
        work_days(*, time_records(*))
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.sector) {
      query = query.eq('sector_id', filters.sector);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Criar nova solicitação
  async create(request: {
    sector_id: string;
    role_name: string;
    leader_id: string;
    leader_name: string;
    requester_id?: string;
    requester_name: string;
    reason_id?: string;
    reason_name: string;
    extra_name: string;
    extra_person_id?: string;
    value: number;
    work_days: Array<{
      work_date: string;
      shift: 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada';
      value?: number;
    }>;
    urgency?: boolean;
    observations?: string;
    contact?: string;
  }) {
    // Inserir solicitação
    const { data: requestData, error: requestError } = await supabase
      .from('extra_requests')
      .insert({
        sector_id: request.sector_id,
        role_name: request.role_name,
        leader_id: request.leader_id,
        leader_name: request.leader_name,
        requester_id: request.requester_id,
        requester_name: request.requester_name,
        reason_id: request.reason_id,
        reason_name: request.reason_name,
        extra_name: request.extra_name,
        extra_person_id: request.extra_person_id,
        value: request.value,
        urgency: request.urgency || false,
        observations: request.observations,
        contact: request.contact,
        status: request.urgency ? 'APROVADO' : 'SOLICITADO',
      })
      .select()
      .single();

    if (requestError || !requestData) {
      return { data: null, error: requestError };
    }

    // Inserir dias de trabalho
    const workDaysData = request.work_days.map(day => ({
      request_id: requestData.id,
      work_date: day.work_date,
      shift: day.shift,
      value: day.value || request.value,
    }));

    const { error: workDaysError } = await supabase
      .from('work_days')
      .insert(workDaysData);

    if (workDaysError) {
      return { data: null, error: workDaysError };
    }

    // Buscar solicitação completa
    const { data: fullRequest, error: fetchError } = await supabase
      .from('extra_requests')
      .select(`
        *,
        sectors(name),
        work_days(*)
      `)
      .eq('id', requestData.id)
      .single();

    return { data: fullRequest, error: fetchError };
  },

  // Atualizar status da solicitação
  async updateStatus(
    id: string,
    status: 'APROVADO' | 'REPROVADO' | 'CANCELADO',
    reason?: string,
    approved_by?: string
  ) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'APROVADO') {
      updateData.approved_by = approved_by;
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'REPROVADO') {
      updateData.rejection_reason = reason;
    } else if (status === 'CANCELADO') {
      updateData.cancellation_reason = reason;
    }

    const { data, error } = await supabase
      .from('extra_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },
};

// 3. REGISTRO DE PONTO
export const timeRecordsService = {
  // Atualizar registro de ponto
  async updateTimeRecord(
    work_day_id: string,
    timeRecord: {
      arrival?: string;
      break_start?: string;
      break_end?: string;
      departure?: string;
    },
    registered_by: string
  ) {
    // Verificar se já existe registro
    const { data: existing } = await supabase
      .from('time_records')
      .select('id')
      .eq('work_day_id', work_day_id)
      .single();

    if (existing) {
      // Atualizar
      const { data, error } = await supabase
        .from('time_records')
        .update({
          ...timeRecord,
          registered_by,
          updated_at: new Date().toISOString(),
        })
        .eq('work_day_id', work_day_id)
        .select()
        .single();

      return { data, error };
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('time_records')
        .insert({
          work_day_id,
          ...timeRecord,
          registered_by,
        })
        .select()
        .single();

      return { data, error };
    }
  },

  // Buscar registros do dia
  async getDailyRecords(date: string) {
    const { data, error } = await supabase
      .from('work_days')
      .select(`
        *,
        time_records(*),
        extra_requests!inner(
          id,
          code,
          extra_name,
          status,
          sectors(name)
        )
      `)
      .eq('work_date', date)
      .eq('extra_requests.status', 'APROVADO');

    return { data, error };
  },
};

// 4. SETORES E FUNÇÕES
export const sectorsService = {
  // Buscar todos os setores
  async getAll() {
    const { data, error } = await supabase
      .from('sectors')
      .select(`
        *,
        sector_roles(*)
      `)
      .eq('active', true)
      .order('name');

    return { data, error };
  },

  // Buscar funções de um setor
  async getRoles(sectorId: string) {
    const { data, error } = await supabase
      .from('sector_roles')
      .select('*')
      .eq('sector_id', sectorId)
      .eq('active', true)
      .order('role_name');

    return { data, error };
  },
};

// 5. CATÁLOGOS (Solicitantes e Motivos)
export const catalogsService = {
  // Buscar solicitantes
  async getRequesters() {
    const { data, error } = await supabase
      .from('requesters')
      .select('*')
      .eq('active', true)
      .order('name');

    return { data, error };
  },

  // Buscar motivos
  async getReasons() {
    const { data, error } = await supabase
      .from('reasons')
      .select('*')
      .eq('active', true)
      .order('name');

    return { data, error };
  },
};

// 6. BANCO DE EXTRAS
export const extraPersonsService = {
  // Buscar todos os extras
  async getAll() {
    const { data, error } = await supabase
      .from('extra_persons')
      .select(`
        *,
        sectors(name)
      `)
      .eq('active', true)
      .order('full_name');

    return { data, error };
  },

  // Criar novo extra
  async create(extra: {
    full_name: string;
    birth_date?: string;
    cpf?: string;
    contact?: string;
    address?: string;
    emergency_contact?: string;
    sector_id?: string;
  }) {
    const { data, error } = await supabase
      .from('extra_persons')
      .insert(extra)
      .select()
      .single();

    return { data, error };
  },
};

// 7. SALDO DE EXTRAS
export const saldoService = {
  // Buscar configuração de saldo
  async getSettings() {
    const { data, error } = await supabase
      .from('extra_saldo_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return { data, error };
  },

  // Buscar registros de saldo
  async getRecords(sectorId?: string) {
    let query = supabase
      .from('extra_saldo_records')
      .select(`
        *,
        sectors(name)
      `)
      .order('periodo_inicio', { ascending: false });

    if (sectorId) {
      query = query.eq('sector_id', sectorId);
    }

    const { data, error } = await query;
    return { data, error };
  },
};

// ============================================
// EXPORT DEFAULT
// ============================================
export default supabase;
