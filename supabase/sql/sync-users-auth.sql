-- ============================================
-- SINCRONIZAÇÃO DE USUÁRIOS COM SUPABASE AUTH
-- Sistema de Controle de Extras - Vivaz Cataratas
-- ============================================
-- 
-- IMPORTANTE: Este script é apenas uma referência.
-- A sincronização real de usuários com Supabase Auth deve ser feita via:
-- 1. Admin API (requer service_role key)
-- 2. Edge Function
-- 3. Ou manualmente pelo Supabase Dashboard
--
-- Este script apenas verifica e lista usuários que precisam ser sincronizados.
-- ============================================

-- Verificar usuários que têm email mas podem não estar no Auth
SELECT 
  id,
  name,
  username,
  email,
  role,
  active,
  created_at
FROM users
WHERE email IS NOT NULL 
  AND email != ''
  AND active = true
ORDER BY created_at;

-- Verificar usuários sem email (não podem fazer login via Auth)
SELECT 
  id,
  name,
  username,
  email,
  role,
  active,
  created_at
FROM users
WHERE (email IS NULL OR email = '')
  AND active = true
ORDER BY created_at;

-- ============================================
-- INSTRUÇÕES PARA SINCRONIZAÇÃO:
-- ============================================
--
-- 1. Para cada usuário com email, você precisa:
--    a) Criar o usuário no Supabase Auth via Admin API ou Dashboard
--    b) Atualizar o campo 'id' na tabela 'users' para corresponder ao 'id' do Auth
--
-- 2. Exemplo de código Node.js usando Admin API:
--
--    const { createClient } = require('@supabase/supabase-js');
--    const supabaseAdmin = createClient(
--      process.env.SUPABASE_URL,
--      process.env.SUPABASE_SERVICE_ROLE_KEY
--    );
--
--    // Para cada usuário:
--    const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
--      email: user.email,
--      password: 'senha-temporaria', // Usuário deve trocar no primeiro login
--      email_confirm: true,
--      user_metadata: {
--        name: user.name,
--        username: user.username,
--      }
--    });
--
--    // Atualizar ID na tabela users
--    await supabaseAdmin
--      .from('users')
--      .update({ id: authUser.user.id })
--      .eq('id', user.id_antigo);
--
-- 3. Alternativamente, você pode:
--    a) Pedir para cada usuário usar "Esqueci minha senha" no login
--    b) Isso criará automaticamente o usuário no Auth se o email existir
--    c) Depois, atualizar o ID na tabela users para corresponder
--
-- ============================================
-- NOTA: Usuários sem email não podem fazer login via Supabase Auth
-- Eles precisarão ter email cadastrado primeiro.
-- ============================================
