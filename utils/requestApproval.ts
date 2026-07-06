import type { ExtraRequest } from '../types';

/** Solicitação fora do saldo (não EVENTO) que exige aprovação do gerente com justificativa. */
export function requiresSaldoApprovalJustification(
  req: Pick<ExtraRequest, 'needsManagerApproval' | 'reason'>
): boolean {
  return (
    !!req.needsManagerApproval &&
    (req.reason || '').toUpperCase().trim() !== 'EVENTO'
  );
}
