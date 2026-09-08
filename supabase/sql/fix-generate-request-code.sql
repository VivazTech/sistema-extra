-- Corrige geração de código EXT-AAAA-NNNN (erro 23505 = unique violation).
--
-- Causa real após EXT-AAAA-9999:
--   LPAD(seq::text, 4, '0') no Postgres TRUNCA strings longas.
--   Ex.: LPAD('10000', 4, '0') = '1000' → tenta EXT-AAAA-1000 (já existe) → 23505.
--
-- Também serializa inserts concorrentes com advisory lock.

CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER AS $$
DECLARE
  year_num INTEGER;
  seq_num INTEGER;
  seq_text TEXT;
BEGIN
  year_num := EXTRACT(YEAR FROM NOW())::INTEGER;

  PERFORM pg_advisory_xact_lock(87201405, year_num);

  SELECT COALESCE(
    MAX(
      CAST(
        substring(code from ('^EXT-' || year_num::text || '-([0-9]+)$'))
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO seq_num
  FROM extra_requests
  WHERE code ~ ('^EXT-' || year_num::text || '-[0-9]+$');

  -- Nunca truncar: padding mínimo 4, mas cresce para 5+ dígitos após 9999
  seq_text := LPAD(seq_num::TEXT, GREATEST(4, LENGTH(seq_num::TEXT)), '0');
  NEW.code := 'EXT-' || year_num || '-' || seq_text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
