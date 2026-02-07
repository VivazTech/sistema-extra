-- Nome do evento quando o motivo da solicitação é EVENTO. Solicitações com motivo EVENTO não descontam saldo e precisam de aprovação do gerente.
ALTER TABLE extra_requests ADD COLUMN IF NOT EXISTS event_name TEXT DEFAULT NULL;
COMMENT ON COLUMN extra_requests.event_name IS 'Nome do evento quando reason_name = EVENTO.';
