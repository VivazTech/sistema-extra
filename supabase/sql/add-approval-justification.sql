-- Justificativa obrigatória ao aprovar solicitações fora do saldo (aprovação do gerente).
ALTER TABLE extra_requests
  ADD COLUMN IF NOT EXISTS approval_justification TEXT;

COMMENT ON COLUMN extra_requests.approval_justification IS
  'Justificativa informada pelo gerente/admin ao aprovar solicitação fora do saldo disponível.';
