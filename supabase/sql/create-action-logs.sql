-- ============================================
-- LOGS DE AÇÃO (REGISTROS POR USUÁRIO, DATA/HORA, ONDE CLICOU, RETORNO)
-- Execute no Supabase > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action_where TEXT NOT NULL,
  result TEXT NOT NULL,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_created ON action_logs(user_id, created_at DESC);

COMMENT ON TABLE action_logs IS 'Registro de ações dos usuários: onde clicou e o que retornou.';

-- RLS: apenas admins podem ler; qualquer autenticado pode inserir (registra sua própria ação)
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Garantir que a função current_user_is_admin existe (usada em role_access)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.role = 'ADMIN'::user_role
      AND (u.active IS NULL OR u.active = true)
      AND (
        u.id = auth.uid()
        OR (u.email IS NOT NULL AND u.email != '' AND u.email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1))
      )
  );
$$;

DROP POLICY IF EXISTS "action_logs_select_admin" ON action_logs;
CREATE POLICY "action_logs_select_admin" ON action_logs
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "action_logs_insert_authenticated" ON action_logs;
CREATE POLICY "action_logs_insert_authenticated" ON action_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Incluir página "logs" para ADMIN na tabela role_access (se existir)
-- Execute apenas se a tabela role_access já existir no projeto.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_access') THEN
    UPDATE role_access
    SET pages = array(SELECT unnest(pages) UNION SELECT 'logs'::text)
    WHERE role = 'ADMIN'::user_role
      AND NOT ('logs' = ANY(pages));
  END IF;
END $$;
