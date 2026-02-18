-- Tipo de valor na solicitação: 'combinado' = valor fixo total (independente das horas); 'por_hora' = cálculo por horas trabalhadas.
ALTER TABLE extra_requests ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'por_hora' CHECK (value_type IN ('combinado', 'por_hora'));
COMMENT ON COLUMN extra_requests.value_type IS 'combinado = valor fixo total no recibo; por_hora = valor de referência para cálculo por horas (valor/7h20).';
