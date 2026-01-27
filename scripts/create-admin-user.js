// ============================================
// SCRIPT PARA CRIAR USUÁRIO ADMIN NO SUPABASE AUTH
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================
//
// INSTRUÇÕES:
// 1. Instale as dependências: npm install @supabase/supabase-js dotenv
// 2. Crie um arquivo .env na raiz do projeto com:
//    SUPABASE_URL=sua_url_do_supabase
//    SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
// 3. Execute: node scripts/create-admin-user.js
//
// ============================================

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas!');
  console.error('Certifique-se de ter SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

// Criar cliente com service role (tem permissões de admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  try {
    console.log('🔐 Criando usuário admin no Supabase Auth...\n');

    const adminEmail = 'admin@vivazcataratas.com.br';
    const adminPassword = 'Admin@2024';
    const adminUsername = 'admin';

    // 1. Criar usuário no Supabase Auth
    console.log('1️⃣ Criando usuário no Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: 'Desenvolvedor Admin',
        username: adminUsername,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Usuário já existe no Supabase Auth.');
        console.log('   Tentando buscar usuário existente...\n');
        
        // Buscar usuário existente
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          throw listError;
        }
        
        const existingUser = existingUsers.users.find(u => u.email === adminEmail);
        if (existingUser) {
          console.log('✅ Usuário encontrado no Auth!');
          console.log(`   ID: ${existingUser.id}\n`);
          
          // Atualizar tabela users
          await updateUsersTable(existingUser.id);
          return;
        } else {
          throw new Error('Usuário já existe mas não foi encontrado');
        }
      } else {
        throw authError;
      }
    }

    if (!authData.user) {
      throw new Error('Erro ao criar usuário no Auth');
    }

    console.log('✅ Usuário criado no Supabase Auth!');
    console.log(`   ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}\n`);

    // 2. Verificar se usuário existe na tabela users
    console.log('2️⃣ Verificando tabela users...');
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', adminUsername)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (existingUser) {
      // Atualizar ID do usuário existente
      console.log('   Usuário encontrado na tabela users. Atualizando ID...');
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          id: authData.user.id,
          email: adminEmail,
          role: 'ADMIN',
          active: true,
        })
        .eq('username', adminUsername);

      if (updateError) {
        throw updateError;
      }
      console.log('✅ ID atualizado na tabela users!\n');
    } else {
      // Criar usuário na tabela users
      console.log('   Usuário não encontrado. Criando na tabela users...');
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          name: 'Desenvolvedor Admin',
          username: adminUsername,
          email: adminEmail,
          role: 'ADMIN',
          active: true,
        });

      if (insertError) {
        throw insertError;
      }
      console.log('✅ Usuário criado na tabela users!\n');
    }

    console.log('🎉 Usuário admin criado com sucesso!\n');
    console.log('📋 Credenciais:');
    console.log(`   Usuário: ${adminUsername}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Senha: ${adminPassword}\n`);
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n');

  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
}

async function updateUsersTable(authUserId) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        id: authUserId,
        email: 'admin@vivazcataratas.com.br',
        role: 'ADMIN',
        active: true,
      })
      .eq('username', 'admin');

    if (error) {
      if (error.code === 'PGRST116') {
        // Usuário não existe, criar
        await supabaseAdmin
          .from('users')
          .insert({
            id: authUserId,
            name: 'Desenvolvedor Admin',
            username: 'admin',
            email: 'admin@vivazcataratas.com.br',
            role: 'ADMIN',
            active: true,
          });
      } else {
        throw error;
      }
    }
    
    console.log('✅ Tabela users atualizada!\n');
  } catch (error) {
    console.error('❌ Erro ao atualizar tabela users:', error.message);
    throw error;
  }
}

// Executar
createAdminUser();
