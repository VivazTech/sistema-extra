export function parseISODate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  // Expecting YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(`${dateStr}T00:00:00`);
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
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

