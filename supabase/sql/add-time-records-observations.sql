-- Observação da portaria por dia (registro de ponto), para anotar acontecimentos relevantes.
ALTER TABLE time_records ADD COLUMN IF NOT EXISTS observations TEXT DEFAULT NULL;
COMMENT ON COLUMN time_records.observations IS 'Observação da portaria sobre o dia (acontecimentos relevantes).';
