-- Permite que um extra tenha múltiplos setores no Banco de Extras. (sector_names para não conflitar com o join sectors(name))
ALTER TABLE extra_persons ADD COLUMN IF NOT EXISTS sector_names TEXT[] DEFAULT '{}';
COMMENT ON COLUMN extra_persons.sector_names IS 'Nomes dos setores aos quais o extra pode ser alocado. Se vazio, usa sector_id como único setor.';

-- Preencher a partir do setor atual (sector_id)
UPDATE extra_persons ep
SET sector_names = ARRAY(SELECT s.name FROM sectors s WHERE s.id = ep.sector_id)
WHERE ep.sector_id IS NOT NULL AND (ep.sector_names IS NULL OR ep.sector_names = '{}');
