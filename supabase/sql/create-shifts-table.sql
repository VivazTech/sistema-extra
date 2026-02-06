-- ============================================
-- TABELA DE TURNOS (cadastro para modal Solicitar Extra)
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Criar tabela de turnos
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir turnos padrão (ignora se já existir)
INSERT INTO shifts (name, display_order)
VALUES ('Manhã', 1), ('Tarde', 2), ('Noite', 3), ('Madrugada', 4)
ON CONFLICT (name) DO NOTHING;

-- Alterar work_days.shift de ENUM para VARCHAR (permite qualquer turno do cadastro)
-- É necessário dropar a view que depende da coluna shift, alterar a coluna e recriar a view.
DROP VIEW IF EXISTS vw_work_days_with_time;

ALTER TABLE work_days
  ALTER COLUMN shift TYPE VARCHAR(100) USING shift::text;

-- Recriar a view
CREATE OR REPLACE VIEW vw_work_days_with_time AS
SELECT 
  wd.id,
  wd.request_id,
  wd.work_date,
  wd.shift,
  wd.value,
  tr.arrival,
  tr.break_start,
  tr.break_end,
  tr.departure,
  tr.registered_at,
  u_registered.name AS registered_by_name
FROM work_days wd
LEFT JOIN time_records tr ON wd.id = tr.work_day_id
LEFT JOIN users u_registered ON tr.registered_by = u_registered.id;
