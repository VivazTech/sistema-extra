-- Inserir Motivos da Solicitação
-- Execute este SQL no Supabase SQL Editor

-- Inserir motivos (usando ON CONFLICT para evitar duplicatas)
INSERT INTO reasons (name, active) VALUES
  ('ATESTADO', true),
  ('EVENTO', true),
  ('FALTA', true),
  ('FOLGA', true),
  ('QUADRO INCOMPLETO', true),
  ('TESTE', true),
  ('FÉRIAS', true)
ON CONFLICT (name) DO UPDATE SET active = true;

-- Verificar motivos inseridos
SELECT id, name, active, created_at 
FROM reasons 
WHERE name IN (
  'ATESTADO',
  'EVENTO',
  'FALTA',
  'FOLGA',
  'QUADRO INCOMPLETO',
  'TESTE',
  'FÉRIAS'
)
ORDER BY name;
