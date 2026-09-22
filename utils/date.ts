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

/** Máscara digitável DD/MM/AAAA (evita date picker nativo problemático em alguns Androids). */
export function maskBirthDateBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA válido em YYYY-MM-DD; retorna null se incompleto/inválido. */
export function birthDateBRToISO(br: string): string | null {
  const match = (br || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Converte YYYY-MM-DD (ou já BR) para DD/MM/AAAA. */
export function birthDateISOToBR(iso: string): string {
  const s = (iso || '').trim();
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

