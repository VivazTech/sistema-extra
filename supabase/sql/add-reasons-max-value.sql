-- Valor máximo (R$) por motivo da solicitação. Admin define nos Cadastros; o modal de solicitação exibe o limite no campo Valor Combinado.
ALTER TABLE reasons ADD COLUMN IF NOT EXISTS max_value NUMERIC(10,2) DEFAULT NULL;
COMMENT ON COLUMN reasons.max_value IS 'Valor máximo em R$ permitido para solicitações com este motivo. NULL = sem limite.';
