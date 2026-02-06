-- Inserir Funções por Setor
-- Execute este SQL no Supabase SQL Editor

DO $$
DECLARE
  v_sector_id UUID;
BEGIN
  -- GOVERNANÇA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'GOVERNANÇA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Governança')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- ZELADORIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'ZELADORIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Zelador(a)')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- LAVANDERIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'LAVANDERIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Lavandeira'),
      (v_sector_id, 'Maquinista')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- FRIGOBAR
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'FRIGOBAR';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Frigobar')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COZINHA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COZINHA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Cozinheiro(a)'),
      (v_sector_id, 'Aux. de Cozinha'),
      (v_sector_id, 'Gard Manger'),
      (v_sector_id, 'Steward')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COZINHA - COPA LANCHE
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COZINHA - COPA LANCHE';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Cozinha'),
      (v_sector_id, 'Steward')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COZINHA - LEGUMERIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COZINHA - LEGUMERIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Cozinha')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COZINHA - PORCIONAMENTO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COZINHA - PORCIONAMENTO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Açougueiro')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COPA - CAFÉ DA MANHÃ
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COPA - CAFÉ DA MANHÃ';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Copeiro(a)')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- CONFEITARIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'CONFEITARIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Confeitaria'),
      (v_sector_id, 'Confeiteiro(a)')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- PADARIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'PADARIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Padaria'),
      (v_sector_id, 'Padeiro(a)')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- RESTAURANTE ALLEGRO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'RESTAURANTE ALLEGRO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Garçom/Garçonete'),
      (v_sector_id, 'Caixa Atendente'),
      (v_sector_id, 'Aux. de Bar'),
      (v_sector_id, 'Buffeteira'),
      (v_sector_id, 'Hostess'),
      (v_sector_id, 'Polimento')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- RESTAURANTE TERRAZA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'RESTAURANTE TERRAZA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Garçom/Garçonete')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- PISCINA - BAR GAIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'PISCINA - BAR GAIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Garçom/Garçonete'),
      (v_sector_id, 'Barman'),
      (v_sector_id, 'Guarda Vidas'),
      (v_sector_id, 'Atendente de A&B (Açaí)'),
      (v_sector_id, 'Atendente de A&B (Toalha)')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- RECEPÇÃO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'RECEPÇÃO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Recepcionista')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- MENSAGERIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'MENSAGERIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Mensageiro')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- MANUTENÇÃO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'MANUTENÇÃO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Manutencionista'),
      (v_sector_id, 'Serviços Gerais')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- PORTARIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'PORTARIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Porteiro')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- RECREAÇÃO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'RECREAÇÃO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Recreação'),
      (v_sector_id, 'Recreacionista')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- RH/DP
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'RH/DP';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de RH'),
      (v_sector_id, 'Aux. de DP')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- AUDITORIA E QUALIDADE
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'AUDITORIA E QUALIDADE';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Ass. Administrativo')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COMPRAS
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COMPRAS';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Ass. de Compras')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- ALMOXARIFADO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'ALMOXARIFADO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Aux. de Almoxarifado')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- EVENTOS
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'EVENTOS';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Decorador(a)'),
      (v_sector_id, 'Montador(a)'),
      (v_sector_id, 'Estoquista')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- RESERVAS
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'RESERVAS';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Agente de Reservas')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- COMERCIAL
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'COMERCIAL';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Ass. Comercial')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- MARKETING
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'MARKETING';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Social Media'),
      (v_sector_id, 'Ass. de Marketing'),
      (v_sector_id, 'Design')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- FINANCEIRO
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'FINANCEIRO';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Ass. Administrativo')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- CONTROLE
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'CONTROLE';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Ass. Administrativo')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- SPA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'SPA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Massagista'),
      (v_sector_id, 'Massoterapeuta'),
      (v_sector_id, 'Cabelereiro(a)')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

  -- AQUAMANIA
  SELECT id INTO v_sector_id FROM sectors WHERE name = 'AQUAMANIA';
  IF v_sector_id IS NOT NULL THEN
    INSERT INTO sector_roles (sector_id, role_name) VALUES
      (v_sector_id, 'Monitoria'),
      (v_sector_id, 'Controle de Acesso Interno'),
      (v_sector_id, 'Controle de Acesso Externo'),
      (v_sector_id, 'Bilheteria'),
      (v_sector_id, 'Lanchonete'),
      (v_sector_id, 'Bar'),
      (v_sector_id, 'Zeladoria'),
      (v_sector_id, 'Manutenção')
    ON CONFLICT (sector_id, role_name) DO NOTHING;
  END IF;

END $$;

-- Verificar funções inseridas
SELECT 
  s.name AS setor,
  sr.role_name AS funcao,
  sr.active,
  sr.created_at
FROM sector_roles sr
JOIN sectors s ON sr.sector_id = s.id
WHERE s.name IN (
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
ORDER BY s.name, sr.role_name;
