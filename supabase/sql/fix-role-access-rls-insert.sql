-- ============================================
-- Corrige política RLS de role_access para permitir INSERT/UPDATE por admins
-- Erro no console: 403 + "new row violates row-level security policy" (42501)
-- Execute no Supabase > SQL Editor e rode este script uma vez.
--
-- Usa função SECURITY DEFINER para que a checagem "é admin?" não seja bloqueada
-- pelo RLS da tabela users e funcione mesmo quando users.id = auth.uid().
-- ============================================

-- Função que verifica se o usuário autenticado é ADMIN na tabela users.
-- SECURITY DEFINER = roda com privilégios do dono do banco, evitando bloqueio de RLS em users.
-- Considera: (1) users.id = auth.uid() OU (2) users.email = email do auth (fallback se id não estiver sincronizado).
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

-- Comentário para documentar
COMMENT ON FUNCTION public.current_user_is_admin() IS 'Usado pelas políticas RLS de role_access. Retorna true se o usuário autenticado for ADMIN em public.users.';

-- Remover política antiga
DROP POLICY IF EXISTS "role_access_modify" ON role_access;

-- Nova política usando a função (WITH CHECK necessário para INSERT no upsert)
CREATE POLICY "role_access_modify" ON role_access
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
