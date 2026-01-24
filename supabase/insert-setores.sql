-- Inserir Setores do Sistema
-- Execute este SQL no Supabase SQL Editor

-- Inserir setores (usando ON CONFLICT para evitar duplicatas)
INSERT INTO sectors (name, active) VALUES
  ('GOVERNANÇA', true),
  ('ZELADORIA', true),
  ('LAVANDERIA', true),
  ('FRIGOBAR', true),
  ('COZINHA', true),
  ('COZINHA - COPA LANCHE', true),
  ('COZINHA - LEGUMERIA', true),
  ('COZINHA - PORCIONAMENTO', true),
  ('COPA - CAFÉ DA MANHÃ', true),
  ('CONFEITARIA', true),
  ('PADARIA', true),
  ('RESTAURANTE ALLEGRO', true),
  ('RESTAURANTE TERRAZA', true),
  ('PISCINA - BAR GAIA', true),
  ('RECEPÇÃO', true),
  ('MENSAGERIA', true),
  ('MANUTENÇÃO', true),
  ('PORTARIA', true),
  ('RECREAÇÃO', true),
  ('RH/DP', true),
  ('AUDITORIA E QUALIDADE', true),
  ('COMPRAS', true),
  ('ALMOXARIFADO', true),
  ('EVENTOS', true),
  ('RESERVAS', true),
  ('COMERCIAL', true),
  ('MARKETING', true),
  ('FINANCEIRO', true),
  ('CONTROLE', true),
  ('SPA', true),
  ('AQUAMANIA', true)
ON CONFLICT (name) DO UPDATE SET active = true;

-- Verificar setores inseridos
SELECT id, name, active, created_at 
FROM sectors 
WHERE name IN (
  'GOVERNANÇA',
  'ZELADORIA',
  'LAVANDERIA',
  'FRIGOBAR',
  'COZINHA',
  'COZINHA - COPA LANCHE',
  'COZINHA - LEGUMERIA',
  'COZINHA - PORCIONAMENTO',
  'COPA - CAFÉ DA MANHÃ',
  'CONFEITARIA',
  'PADARIA',
  'RESTAURANTE ALLEGRO',
  'RESTAURANTE TERRAZA',
  'PISCINA - BAR GAIA',
  'RECEPÇÃO',
  'MENSAGERIA',
  'MANUTENÇÃO',
  'PORTARIA',
  'RECREAÇÃO',
  'RH/DP',
  'AUDITORIA E QUALIDADE',
  'COMPRAS',
  'ALMOXARIFADO',
  'EVENTOS',
  'RESERVAS',
  'COMERCIAL',
  'MARKETING',
  'FINANCEIRO',
  'CONTROLE',
  'SPA',
  'AQUAMANIA'
)
ORDER BY name;
