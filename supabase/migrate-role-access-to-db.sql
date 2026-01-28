-- ============================================
-- MIGRAÇÃO: Mover configurações de acesso (role_access) para o banco de dados
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Adicionar PORTARIA ao enum user_role se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PORTARIA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'PORTARIA';
  END IF;
END $$;

-- Criar tabela para armazenar configurações de acesso por role
CREATE TABLE IF NOT EXISTS role_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL UNIQUE,
  pages TEXT[] NOT NULL DEFAULT '{}',
  actions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO role_access (role, pages, actions) VALUES
  ('ADMIN', ARRAY['dashboard', 'requests', 'portaria', 'reports', 'catalogs', 'users', 'saldo', 'extras', 'tv', 'test'], 
   ARRAY['manage_users', 'manage_catalogs', 'manage_extras', 'manage_saldo', 'approve_requests', 'create_requests', 'register_time', 'view_reports', 'view_dashboard']),
  ('MANAGER', ARRAY['dashboard', 'requests', 'portaria', 'reports', 'saldo', 'tv'], 
   ARRAY['approve_requests', 'create_requests', 'register_time', 'view_reports', 'view_dashboard']),
  ('LEADER', ARRAY['dashboard', 'requests', 'portaria', 'reports', 'tv'], 
   ARRAY['create_requests', 'register_time', 'view_reports', 'view_dashboard']),
  ('VIEWER', ARRAY['portaria', 'tv'], 
   ARRAY['view_only']),
  ('PORTARIA', ARRAY['portaria'], 
   ARRAY['register_time'])
ON CONFLICT (role) DO UPDATE SET
  pages = EXCLUDED.pages,
  actions = EXCLUDED.actions,
  updated_at = NOW();

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_role_access_role ON role_access(role);

-- Habilitar RLS
ALTER TABLE role_access ENABLE ROW LEVEL SECURITY;

-- Política: Todos os usuários autenticados podem ler
CREATE POLICY "role_access_select" ON role_access
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Apenas admins podem modificar
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
  );

-- Comentários
COMMENT ON TABLE role_access IS 'Configurações de acesso por role (páginas e ações permitidas)';
COMMENT ON COLUMN role_access.role IS 'Role do usuário';
COMMENT ON COLUMN role_access.pages IS 'Array de chaves de páginas permitidas';
COMMENT ON COLUMN role_access.actions IS 'Array de chaves de ações permitidas';
