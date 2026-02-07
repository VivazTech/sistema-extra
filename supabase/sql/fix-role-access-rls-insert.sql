-- ============================================
-- Corrige política RLS de role_access para permitir INSERT/UPDATE por admins
-- Alguns ambientes exigem WITH CHECK explícito para INSERT.
-- Execute no Supabase SQL Editor se as alterações em "Níveis de acesso por função" não persistirem.
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
