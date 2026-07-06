/**
 * Mensagens de erro seguras para exibição ao usuário.
 * Expõe apenas códigos rastreáveis (ex.: PGRST301), nunca detalhes técnicos de banco/API.
 */

/** Erros de negócio explícitos — mensagem já legível, sem código técnico. */
const BUSINESS_ERROR_MESSAGES = new Set([
  'Apenas administradores podem criar solicitações para datas passadas.',
  'ID do líder inválido. Por favor, faça login novamente.',
  'A solicitação precisa ter pelo menos 1 dia de trabalho.',
  'Existem dias repetidos na solicitação. Ajuste as datas para continuar.',
  'Solicitação criada mas não foi possível buscar os dados completos',
  'Setor não encontrado. Verifique o setor selecionado e tente novamente.',
  'A justificativa é obrigatória para aprovar solicitações fora do saldo.',
]);

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

export function extractErrorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as SupabaseLikeError;
    if (typeof e.code === 'string' && e.code.trim()) {
      return e.code.trim();
    }
    if (typeof e.status === 'number' && Number.isFinite(e.status)) {
      return `HTTP_${e.status}`;
    }
  }
  if (error instanceof Error && error.name && error.name !== 'Error') {
    return error.name;
  }
  return 'DESCONHECIDO';
}

function isBusinessError(error: unknown): error is Error {
  return error instanceof Error && BUSINESS_ERROR_MESSAGES.has(error.message.trim());
}

/** Serializa erro completo apenas para console/logs (Vercel, Supabase). */
export function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (error && typeof error === 'object') {
    const e = error as SupabaseLikeError;
    return {
      code: e.code ?? null,
      message: e.message ?? null,
      details: e.details ?? null,
      hint: e.hint ?? null,
      status: e.status ?? null,
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { raw: String(error) };
}

export interface SafeErrorDisplay {
  /** Texto para alert/toast — sem detalhes técnicos. */
  userMessage: string;
  /** Código para busca em logs (null se erro de negócio). */
  code: string | null;
}

/**
 * Converte erro em mensagem segura para o usuário.
 * @param error Erro capturado
 * @param action Descrição curta da ação (ex.: "salvar a solicitação")
 */
export function formatUserErrorMessage(error: unknown, action = 'concluir a operação'): SafeErrorDisplay {
  if (isBusinessError(error)) {
    return { userMessage: error.message, code: null };
  }

  const code = extractErrorCode(error);
  return {
    userMessage: `Não foi possível ${action}. Código: ${code}. Tente novamente ou envie este código ao suporte.`,
    code,
  };
}

/** Registra erro completo no console para diagnóstico (Vercel/Supabase). */
export function logErrorForSupport(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  const code = extractErrorCode(error);
  console.error(`[${context}] Erro código=${code}`, {
    ...serializeErrorForLog(error),
    ...meta,
  });
}
