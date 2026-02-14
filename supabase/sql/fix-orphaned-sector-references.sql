-- ============================================
-- Corrige referências órfãs a setores removidos
-- Ex: extras mostrando "Restaurante" que foi apagado
-- ============================================
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)

-- PASSO 1: Nullificar sector_id que aponta para setor inexistente
UPDATE extra_persons
SET sector_id = NULL
WHERE sector_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sectors s WHERE s.id = extra_persons.sector_id);

-- PASSO 2: Remover de sector_names os nomes que não existem mais em sectors
UPDATE extra_persons ep
SET sector_names = (
  SELECT COALESCE(array_agg(n), '{}')
  FROM unnest(COALESCE(ep.sector_names, '{}')) AS n
  WHERE n IN (SELECT name FROM sectors)
)
WHERE EXISTS (
  SELECT 1 FROM unnest(COALESCE(ep.sector_names, '{}')) AS n
  WHERE n IS NOT NULL AND n <> '' AND n NOT IN (SELECT name FROM sectors)
);

-- Opcional: se preferir remover apenas "Restaurante" (e variações):
-- UPDATE extra_persons SET sector_names = array_remove(COALESCE(sector_names, '{}'), 'Restaurante') WHERE 'Restaurante' = ANY(COALESCE(sector_names, '{}'));
-- UPDATE extra_persons SET sector_names = array_remove(COALESCE(sector_names, '{}'), 'RESTAURANTE ALLEGRO') WHERE 'RESTAURANTE ALLEGRO' = ANY(COALESCE(sector_names, '{}'));
-- UPDATE extra_persons SET sector_names = array_remove(COALESCE(sector_names, '{}'), 'RESTAURANTE TERRAZA') WHERE 'RESTAURANTE TERRAZA' = ANY(COALESCE(sector_names, '{}'));
