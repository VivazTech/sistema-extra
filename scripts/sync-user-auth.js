// ============================================
// SCRIPT PARA SINCRONIZAR USUÁRIOS NA TABELA users COM O SUPABASE AUTH
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================
//
// Resolve o erro "Invalid login credentials" quando o usuário existe na tabela
// users mas NÃO existe em auth.users (ex.: importados via SQL, falha na criação).
//
// INSTRUÇÕES:
// 1. Use o mesmo .env do projeto (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
// 2. Execute para UM usuário específico (por email):
//    node scripts/sync-user-auth.js tiago@vivazcataratas.com.br
// 3. Ou para sincronizar TODOS os usuários desincronizados:
//    node scripts/sync-user-auth.js --all
//
// O script cria a conta no Auth com senha temporária e envia email de
// redefinição para o usuário definir sua própria senha.
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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/** Gera senha temporária segura */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

/**
 * Sincroniza um usuário: cria em auth.users se não existir.
 * @param {string} userEmail - Email do usuário (obrigatório para Auth)
 * @param {string} redirectTo - URL para redirect após redefinir senha (opcional)
 */
async function syncUser(userEmail, redirectTo) {
  const email = String(userEmail).trim().toLowerCase();
  if (!email) {
    console.error('❌ Email é obrigatório.');
    return false;
  }

  console.log(`\n📧 Processando: ${email}`);

  // 1. Buscar usuário na tabela users
  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, name, username, email, role, active')
    .eq('email', email)
    .eq('active', true)
    .maybeSingle();

  if (userError) {
    console.error(`   ❌ Erro ao buscar na tabela users:`, userError.message);
    return false;
  }

  if (!userRow) {
    console.log(`   ⚠️  Usuário não encontrado na tabela users ou está inativo.`);
    return false;
  }

  // 2. Verificar se já existe no Auth
  const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error(`   ❌ Erro ao listar usuários do Auth:`, listError.message);
    return false;
  }

  const existingAuth = authList.users.find((u) => u.email?.toLowerCase() === email);
  if (existingAuth) {
    console.log(`   ✅ Usuário já existe no Supabase Auth (ID: ${existingAuth.id}).`);
    console.log(`   💡 Se não consegue logar, use "Esqueci minha senha" na tela de login.`);
    return true;
  }

  // 3. Criar usuário no Auth
  const tempPassword = generateTempPassword();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name: userRow.name,
      username: userRow.username,
    },
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes('already') || authError.code === 'email_exists') {
      console.log(`   ⚠️  Usuário já existe no Auth. Use "Esqueci minha senha" para redefinir.`);
      return true;
    }
    console.error(`   ❌ Erro ao criar no Auth:`, authError.message);
    return false;
  }

  if (!authData?.user) {
    console.error(`   ❌ Não foi possível criar o usuário no Auth.`);
    return false;
  }

  const authUserId = authData.user.id;
  const oldUserId = userRow.id;

  // 4. Se o ID na tabela users é diferente do Auth, migrar para o novo ID
  if (oldUserId !== authUserId) {
    console.log(`   📝 Migrando de ${oldUserId} para ID do Auth ${authUserId}...`);

    const { data: fullUser } = await supabaseAdmin.from('users').select('*').eq('id', oldUserId).single();
    if (!fullUser) {
      console.warn(`   ⚠️  Dados do usuário antigo não encontrados.`);
    } else {
      const { id, ...rest } = fullUser;

      // Liberar email/username únicos: renomear temporariamente a linha antiga
      await supabaseAdmin
        .from('users')
        .update({
          email: `migrate-${oldUserId}@temp.local`,
          username: `migrate_${oldUserId.replace(/-/g, '_')}`,
        })
        .eq('id', oldUserId);

      // Inserir nova linha com ID do Auth
      const { error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({ id: authUserId, ...rest });
      if (insertErr) {
        await supabaseAdmin.from('users').update({ email: rest.email, username: rest.username }).eq('id', oldUserId);
        console.error(`   ❌ Erro ao inserir novo registro: ${insertErr.message}`);
        return false;
      }

      // Atualizar referências
      try {
        await supabaseAdmin.from('extra_requests').update({ leader_id: authUserId }).eq('leader_id', oldUserId);
        await supabaseAdmin.from('extra_requests').update({ approved_by: authUserId }).eq('approved_by', oldUserId);
        await supabaseAdmin.from('extra_requests').update({ created_by: authUserId }).eq('created_by', oldUserId);
        await supabaseAdmin.from('user_sectors').update({ user_id: authUserId }).eq('user_id', oldUserId);
        await supabaseAdmin.from('time_records').update({ registered_by: authUserId }).eq('registered_by', oldUserId);
        await supabaseAdmin.from('extra_saldo_records').update({ created_by: authUserId }).eq('created_by', oldUserId).catch(() => {});
      } catch (refErr) {
        console.warn(`   ⚠️  Erro ao atualizar referências:`, refErr.message);
      }

      await supabaseAdmin.from('users').delete().eq('id', oldUserId);
    }
  }

  // 5. Enviar email de redefinição de senha (usuário define a própria senha)
  const baseUrl = redirectTo || process.env.APP_URL || 'https://sistema-extras.vivazcataratas.com.br';
  const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/#/reset-password`,
  });

  if (resetError) {
    console.warn(`   ⚠️  Não foi possível enviar email de redefinição: ${resetError.message}`);
    console.log(`   📋 Senha temporária: ${tempPassword}`);
    console.log(`   💡 Oriente o usuário a usar "Esqueci minha senha" para definir uma nova senha.`);
  } else {
    console.log(`   ✅ Email de redefinição de senha enviado para ${email}`);
    console.log(`   💡 O usuário deve acessar o link para definir sua senha.`);
  }

  console.log(`   ✅ Usuário sincronizado com sucesso!`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const allFlag = args.includes('--all');
  const urlIdx = args.indexOf('--url');
  const redirectUrl = urlIdx >= 0 && args[urlIdx + 1] ? args[urlIdx + 1] : null;
  const emailArg = args.find((a) => !a.startsWith('--') && a.includes('@'));

  if (allFlag) {
    console.log('🔄 Sincronizando todos os usuários desincronizados...\n');

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('active', true)
      .not('email', 'is', null);

    if (error) {
      console.error('❌ Erro ao listar usuários:', error.message);
      process.exit(1);
    }

    const emails = [...new Set((users || []).map((u) => u.email?.trim().toLowerCase()).filter(Boolean))];
    console.log(`📋 ${emails.length} usuário(s) ativo(s) com email.\n`);

    let ok = 0;
    let fail = 0;
    for (const email of emails) {
      const success = await syncUser(email, redirectUrl);
      if (success) ok++;
      else fail++;
    }

    console.log(`\n📊 Resultado: ${ok} processado(s), ${fail} falha(s).`);
    process.exit(fail > 0 ? 1 : 0);
  } else if (emailArg) {
    const success = await syncUser(emailArg, redirectUrl);
    process.exit(success ? 0 : 1);
  } else {
    console.log('Uso:');
    console.log('  node scripts/sync-user-auth.js <email>                    # Sincronizar um usuário');
    console.log('  node scripts/sync-user-auth.js --all                       # Sincronizar todos');
    console.log('  node scripts/sync-user-auth.js <email> --url https://...   # URL para redirect do reset');
    console.log('');
    console.log('Exemplo:');
    console.log('  node scripts/sync-user-auth.js tiago@vivazcataratas.com.br');
    process.exit(1);
  }
}

main();
