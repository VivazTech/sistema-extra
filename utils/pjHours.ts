/** Converte "HH:MM" para minutos desde meia-noite. */
export function parseHHMM(s: string | undefined | null): number | null {
  if (s == null || String(s).trim() === '') return null;
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Total trabalhado = (saída - entrada) - (volta intervalo - saída intervalo).
 * Retorna string tipo "8h15min" ou "—" se incompleto.
 */
export function formatWorkedHours(arrival?: string, breakStart?: string, breakEnd?: string, departure?: string): string {
  const a = parseHHMM(arrival);
  const d = parseHHMM(departure);
  if (a === null || d === null || d <= a) return '—';
  let total = d - a;
  const bs = parseHHMM(breakStart);
  const be = parseHHMM(breakEnd);
  if (bs !== null && be !== null && be > bs) {
    total -= be - bs;
  }
  if (total < 0) return '—';
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh}h${String(mm).padStart(2, '0')}min`;
}
