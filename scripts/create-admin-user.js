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

    // 1. Verificar se usuário já existe no Supabase Auth
    console.log('1️⃣ Verificando se usuário já existe no Supabase Auth...');
    let authUserId = null;
    
    // Buscar usuário existente no Auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.log('   ⚠️  Erro ao listar usuários, tentando criar novo...');
    } else {
      const existingAuthUser = existingUsers.users.find(u => u.email === adminEmail);
      if (existingAuthUser) {
        console.log('✅ Usuário já existe no Supabase Auth!');
        console.log(`   ID: ${existingAuthUser.id}`);
        console.log(`   Email: ${existingAuthUser.email}\n`);
        authUserId = existingAuthUser.id;
      }
    }

    // Se não encontrou, tentar criar
    if (!authUserId) {
      console.log('   Usuário não encontrado. Criando novo usuário no Supabase Auth...');
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
        if (authError.code === 'email_exists' || authError.message.includes('already registered')) {
          console.log('⚠️  Usuário já existe no Supabase Auth (erro ao criar).');
          console.log('   Buscando usuário existente...\n');
          
          // Buscar novamente
          const { data: usersList, error: listError2 } = await supabaseAdmin.auth.admin.listUsers();
          if (listError2) {
            throw listError2;
          }
          
          const foundUser = usersList.users.find(u => u.email === adminEmail);
          if (foundUser) {
            console.log('✅ Usuário encontrado no Auth!');
            console.log(`   ID: ${foundUser.id}\n`);
            authUserId = foundUser.id;
          } else {
            throw new Error('Usuário já existe mas não foi encontrado na lista');
          }
        } else {
          throw authError;
        }
      } else if (authData?.user) {
        console.log('✅ Usuário criado no Supabase Auth!');
        console.log(`   ID: ${authData.user.id}`);
        console.log(`   Email: ${authData.user.email}\n`);
        authUserId = authData.user.id;
      } else {
        throw new Error('Erro ao criar usuário no Auth');
      }
    }

    // 2. Verificar se usuário existe na tabela users
    console.log('2️⃣ Verificando tabela users...');
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', adminUsername)
      .single();
    
    // Usar authUserId que foi obtido acima
    const newUserId = authUserId;

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (existingUser) {
      // Se o ID já é o mesmo, apenas atualizar outros campos
      if (existingUser.id === newUserId) {
        console.log('   ID já está correto. Atualizando outros campos...');
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            email: adminEmail,
            role: 'ADMIN',
            active: true,
          })
          .eq('username', adminUsername);

        if (updateError) {
          throw updateError;
        }
        console.log('✅ Usuário atualizado na tabela users!\n');
      } else {
        // ID diferente, precisa atualizar todas as referências primeiro
        console.log('   Usuário encontrado com ID diferente. Atualizando referências...');
        const oldUserId = existingUser.id;

        // Atualizar referências em extra_requests
        console.log('   - Atualizando extra_requests...');
        try {
          // Tentar atualizar leader_id
          const { error: leaderError } = await supabaseAdmin
            .from('extra_requests')
            .update({ leader_id: newUserId })
            .eq('leader_id', oldUserId);
          if (leaderError) throw leaderError;

          // Tentar atualizar approved_by
          const { error: approvedError } = await supabaseAdmin
            .from('extra_requests')
            .update({ approved_by: newUserId })
            .eq('approved_by', oldUserId);
          if (approvedError && approvedError.code !== 'PGRST116') throw approvedError;

          // Tentar atualizar created_by
          const { error: createdError } = await supabaseAdmin
            .from('extra_requests')
            .update({ created_by: newUserId })
            .eq('created_by', oldUserId);
          if (createdError && createdError.code !== 'PGRST116') throw createdError;
        } catch (reqError) {
          console.log('   ⚠️  Alguns registros podem não ter sido atualizados:', reqError.message);
        }

        // Atualizar referências em user_sectors
        console.log('   - Atualizando user_sectors...');
        await supabaseAdmin
          .from('user_sectors')
          .update({ user_id: newUserId })
          .eq('user_id', oldUserId);

        // Atualizar referências em time_records
        console.log('   - Atualizando time_records...');
        await supabaseAdmin
          .from('time_records')
          .update({ registered_by: newUserId })
          .eq('registered_by', oldUserId);

        // Atualizar referências em extra_saldo_records (se existir)
        console.log('   - Atualizando extra_saldo_records...');
        await supabaseAdmin
          .from('extra_saldo_records')
          .update({ created_by: newUserId })
          .eq('created_by', oldUserId)
          .catch(() => {}); // Ignorar se a tabela não existir ou não tiver o campo

        // Agora deletar o usuário antigo e criar um novo com o ID correto
        console.log('   - Removendo usuário antigo...');
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', oldUserId);

        if (deleteError) {
          throw deleteError;
        }

        // Criar usuário com o novo ID
        console.log('   - Criando usuário com ID do Auth...');
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: newUserId,
            name: 'Desenvolvedor Admin',
            username: adminUsername,
            email: adminEmail,
            role: 'ADMIN',
            active: true,
          });

        if (insertError) {
          throw insertError;
        }
        console.log('✅ Usuário atualizado com sucesso!\n');
      }
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
