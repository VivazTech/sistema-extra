/** Fuso do negócio (Vivaz Cataratas / Foz do Iguaçu). */
export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

/**
 * Data civil de hoje em Brasília (YYYY-MM-DD).
 * Não usar `toISOString().split('T')[0]`: após 21h no Brasil o UTC já é o dia seguinte.
 */
export function todayDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** YYYY-MM-DD a partir dos componentes locais do Date (não UTC). */
export function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  // Expecting YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(`${dateStr}T00:00:00`);
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Normaliza qualquer string de data para YYYY-MM-DD para comparação segura (evita inconsistência entre DATE do Postgres e input type="date"). */
export function toDateOnlyString(dateStr?: string | Date | null): string {
  if (dateStr == null) return '';
  if (dateStr instanceof Date) {
    const iso = dateStr.toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
  }
  if (typeof dateStr !== 'string') return '';
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const iso = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}

export function formatDateBR(date?: Date | string | null): string {
  const d = date instanceof Date ? date : parseISODate(date || undefined);
  if (!d) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTimeBR(date?: Date | string | null): string {
  const d = date instanceof Date ? date : new Date(date || '');
  if (!d || Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Formato completo: dd/mm/yyyy hh:mm:ss (para logs). */
export function formatDateTimeWithSeconds(date?: Date | string | null): string {
  const d = date instanceof Date ? date : new Date(date || '');
  if (!d || Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

