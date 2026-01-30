-- ============================================
-- Adicionar coluna photo_url na tabela time_records
-- Execute no Supabase SQL Editor se aparecer erro PGRST204
-- ("Could not find the 'photo_url' column of 'time_records'")
-- ============================================

-- Adiciona a coluna se não existir (não dá erro se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'time_records'
      AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE time_records ADD COLUMN photo_url TEXT;
  END IF;
END $$;
