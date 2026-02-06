-- ============================================
-- RLS: Permitir que role anon leia e escreva time_records e work_days
-- Use se os horários da portaria sumirem ao atualizar a página (app usa chave anon sem Supabase Auth)
-- Execute no Supabase SQL Editor
-- ============================================

-- Time Records: anon pode ver e modificar
DROP POLICY IF EXISTS "Time records are viewable by anon" ON time_records;
CREATE POLICY "Time records are viewable by anon" ON time_records
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Time records are insertable by anon" ON time_records;
CREATE POLICY "Time records are insertable by anon" ON time_records
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Time records are updatable by anon" ON time_records;
CREATE POLICY "Time records are updatable by anon" ON time_records
  FOR UPDATE TO anon USING (true);

-- Work Days: anon pode ver (para o nested select retornar work_days com time_records)
DROP POLICY IF EXISTS "Work days are viewable by anon" ON work_days;
CREATE POLICY "Work days are viewable by anon" ON work_days
  FOR SELECT TO anon USING (true);
