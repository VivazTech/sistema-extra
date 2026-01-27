-- ============================================
-- CRIAR USUÁRIO ADMIN PADRÃO PARA DESENVOLVEDOR
-- Sistema de Controle de Extras - Vivaz Cataratas
-- ============================================
--
-- Este script cria um usuário admin padrão para acesso de desenvolvedor.
-- IMPORTANTE: Execute este script no Supabase SQL Editor.
--
-- Após executar, você precisará criar o usuário no Supabase Auth também.
-- Veja as instruções abaixo.
-- ============================================

-- Inserir usuário admin na tabela users
INSERT INTO users (
  id,
  name,
  username,
  email,
  role,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- Será substituído pelo ID do Auth
  'Desenvolvedor Admin',
  'admin',
  'admin@vivazcataratas.com.br', -- ALTERE ESTE EMAIL SE NECESSÁRIO
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Verificar se o usuário foi criado
SELECT 
  id,
  name,
  username,
  email,
  role,
  active,
  created_at
FROM users
WHERE username = 'admin';

-- ============================================
-- PRÓXIMOS PASSOS:
-- ============================================
--
-- 1. No Supabase Dashboard, vá em Authentication > Users
-- 2. Clique em "Add User" > "Create new user"
-- 3. Preencha:
--    - Email: admin@vivazcataratas.com.br (ou o email que você definiu acima)
--    - Password: Admin@2024 (ou a senha padrão que você preferir)
--    - Auto Confirm User: ✅ (marcar)
-- 4. Copie o ID do usuário criado no Auth
-- 5. Execute o UPDATE abaixo substituindo 'AUTH_USER_ID' pelo ID copiado:
--
-- UPDATE users
-- SET id = 'AUTH_USER_ID'
-- WHERE username = 'admin';
--
-- ============================================
-- OU use o Admin API (Node.js):
-- ============================================
--
-- const { createClient } = require('@supabase/supabase-js');
-- const supabaseAdmin = createClient(
--   process.env.SUPABASE_URL,
--   process.env.SUPABASE_SERVICE_ROLE_KEY
-- );
--
-- // Criar usuário no Auth
-- const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
--   email: 'admin@vivazcataratas.com.br',
--   password: 'Admin@2024',
--   email_confirm: true,
--   user_metadata: {
--     name: 'Desenvolvedor Admin',
--     username: 'admin',
--   }
-- });
--
-- // Atualizar ID na tabela users
-- await supabaseAdmin
--   .from('users')
--   .update({ id: authUser.user.id })
--   .eq('username', 'admin');
--
-- ============================================
-- CREDENCIAIS PADRÃO:
-- ============================================
-- Usuário: admin
-- Email: admin@vivazcataratas.com.br
-- Senha: Admin@2024 (ou a senha que você definir)
-- ============================================
