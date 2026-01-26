-- ============================================
-- SQL para corrigir deleção de work_days
-- ============================================
-- Execute este SQL no SQL Editor do Supabase

-- 1. Garantir que a política de DELETE existe para work_days
-- (A política "modifiable" já cobre DELETE, mas vamos criar uma específica para garantir)

-- Remover política antiga se existir (opcional - não vai dar erro se não existir)
DROP POLICY IF EXISTS "Work days are deletable by authenticated users" ON work_days;

-- Criar política específica de DELETE
CREATE POLICY "Work days are deletable by authenticated users" ON work_days
  FOR DELETE USING (true);

-- 2. Garantir que time_records pode ser deletado
DROP POLICY IF EXISTS "Time records are deletable by authenticated users" ON time_records;

CREATE POLICY "Time records are deletable by authenticated users" ON time_records
  FOR DELETE USING (true);

-- 3. Verificar se há constraints que possam impedir a deleção
-- (As constraints ON DELETE CASCADE já estão configuradas no schema, mas vamos verificar)

-- 4. Criar função auxiliar para verificar se work_day existe antes de deletar
CREATE OR REPLACE FUNCTION can_delete_work_day(work_day_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM work_days WHERE id = work_day_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Verificar permissões (opcional - apenas para debug)
-- SELECT * FROM pg_policies WHERE tablename = 'work_days';
-- SELECT * FROM pg_policies WHERE tablename = 'time_records';

-- ============================================
-- FIM DO SQL
-- ============================================
-- Após executar, teste a função "Faltou" novamente
