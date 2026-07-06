/**
 * Fluxo de recuperação de senha com HashRouter + Supabase.
 *
 * O Supabase redireciona para: https://app.com/#access_token=...&type=recovery
 * O HashRouter espera:         https://app.com/#/reset-password?access_token=...
 *
 * Esta função deve rodar antes do React montar (index.tsx).
 */

function getRawHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#/, '');
}

/** Hash contém tokens de recuperação de senha do Supabase */
export function isPasswordRecoveryHash(): boolean {
  const raw = getRawHash();
  if (!raw.includes('type=recovery')) return false;

  if (raw.includes('access_token=')) return true;

  const queryPart = raw.includes('?') ? raw.split('?').slice(1).join('?') : '';
  return queryPart.includes('access_token=');
}

/** URL de redirect usada em resetPasswordForEmail */
export function getPasswordResetRedirectUrl(): string {
  const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${String(appUrl).replace(/\/$/, '')}/#/reset-password`;
}

/**
 * Reescreve #access_token=...&type=recovery → #/reset-password?access_token=...
 * para o HashRouter reconhecer a rota antes do Supabase/React processarem a sessão.
 */
export function bootstrapPasswordRecoveryRoute(): void {
  if (typeof window === 'undefined') return;

  const raw = getRawHash();
  if (!raw || raw.startsWith('/reset-password')) return;
  if (!isPasswordRecoveryHash()) return;

  const { pathname, search } = window.location;
  window.location.replace(`${pathname}${search}#/reset-password?${raw}`);
}
