import { supabase } from './supabase';
import { ActionLog } from '../types';

export interface ActionLogFilters {
  userId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  limit?: number;
}

/** Registra uma ação no log (usuário, data/hora, onde clicou, retorno). */
export async function logAction(
  userId: string,
  userName: string,
  actionWhere: string,
  result: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('action_logs').insert({
      user_id: userId,
      user_name: userName,
      action_where: actionWhere,
      result: result,
      details: details ?? null,
    });
  } catch (err) {
    console.error('[actionLog] Falha ao registrar log:', err);
  }
}

/** Lista logs (apenas admins). Filtros opcionais por usuário e intervalo de datas. */
export async function fetchActionLogs(filters: ActionLogFilters = {}): Promise<ActionLog[]> {
  const { userId, dateFrom, dateTo, limit = 500 } = filters;
  let query = supabase
    .from('action_logs')
    .select('id, user_id, user_name, created_at, action_where, result, details')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`);
  if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error('[actionLog] Erro ao buscar logs:', error);
    return [];
  }
  return (data ?? []) as ActionLog[];
}
