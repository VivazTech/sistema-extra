-- ============================================
-- Corrige política RLS de role_access para permitir INSERT/UPDATE por admins
-- Erro no console: 403 + "new row violates row-level security policy" (42501)
-- Causa: a política antiga não tinha WITH CHECK, então INSERT (do upsert) era bloqueado.
-- Execute no Supabase > SQL Editor e rode este script uma vez.
-- ============================================

DROP POLICY IF EXISTS "role_access_modify" ON role_access;

CREATE POLICY "role_access_modify" ON role_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.active = true
    )
  );
