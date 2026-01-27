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
        // ID diferente, precisa criar o novo usuário primeiro, depois atualizar referências
        console.log('   Usuário encontrado com ID diferente. Atualizando...');
        const oldUserId = existingUser.id;

        // 1. Primeiro criar o novo usuário na tabela users (com o ID do Auth)
        console.log('   - Criando novo registro com ID do Auth...');
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
          // Se já existe, apenas atualizar
          if (insertError.code === '23505') {
            console.log('   - Registro já existe, atualizando...');
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                name: 'Desenvolvedor Admin',
                email: adminEmail,
                role: 'ADMIN',
                active: true,
              })
              .eq('id', newUserId);
            if (updateError) throw updateError;
          } else {
            throw insertError;
          }
        }

        // 2. Agora atualizar todas as referências
        console.log('   - Atualizando referências em extra_requests...');
        try {
          const { error: leaderError } = await supabaseAdmin
            .from('extra_requests')
            .update({ leader_id: newUserId })
            .eq('leader_id', oldUserId);
          if (leaderError && leaderError.code !== 'PGRST116') console.log('     ⚠️  leader_id:', leaderError.message);

          const { error: approvedError } = await supabaseAdmin
            .from('extra_requests')
            .update({ approved_by: newUserId })
            .eq('approved_by', oldUserId);
          if (approvedError && approvedError.code !== 'PGRST116') console.log('     ⚠️  approved_by:', approvedError.message);

          const { error: createdError } = await supabaseAdmin
            .from('extra_requests')
            .update({ created_by: newUserId })
            .eq('created_by', oldUserId);
          if (createdError && createdError.code !== 'PGRST116') console.log('     ⚠️  created_by:', createdError.message);
        } catch (reqError) {
          console.log('     ⚠️  Erro ao atualizar extra_requests:', reqError.message);
        }

        // Atualizar referências em user_sectors
        console.log('   - Atualizando user_sectors...');
        try {
          const { error: sectorsError } = await supabaseAdmin
            .from('user_sectors')
            .update({ user_id: newUserId })
            .eq('user_id', oldUserId);
          if (sectorsError && sectorsError.code !== 'PGRST116') console.log('     ⚠️  Erro:', sectorsError.message);
        } catch (err) {
          console.log('     ⚠️  Erro ao atualizar user_sectors:', err.message);
        }

        // Atualizar referências em time_records
        console.log('   - Atualizando time_records...');
        try {
          const { error: timeError } = await supabaseAdmin
            .from('time_records')
            .update({ registered_by: newUserId })
            .eq('registered_by', oldUserId);
          if (timeError && timeError.code !== 'PGRST116') console.log('     ⚠️  Erro:', timeError.message);
        } catch (err) {
          console.log('     ⚠️  Erro ao atualizar time_records:', err.message);
        }

        // Atualizar referências em extra_saldo_records (se existir)
        console.log('   - Atualizando extra_saldo_records...');
        try {
          const { error: saldoError } = await supabaseAdmin
            .from('extra_saldo_records')
            .update({ created_by: newUserId })
            .eq('created_by', oldUserId);
          if (saldoError && saldoError.code !== 'PGRST116') {
            // Ignorar se a tabela não existir ou não tiver o campo
            if (!saldoError.message.includes('column') && !saldoError.message.includes('does not exist')) {
              console.log('     ⚠️  Erro:', saldoError.message);
            }
          }
        } catch (err) {
          // Ignorar erros nesta tabela
        }

        // 3. Por fim, deletar o usuário antigo
        console.log('   - Removendo usuário antigo...');
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', oldUserId);

        if (deleteError) {
          console.log('     ⚠️  Não foi possível remover o usuário antigo:', deleteError.message);
          console.log('     Você pode removê-lo manualmente depois se necessário.');
        } else {
          console.log('     ✅ Usuário antigo removido!');
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
