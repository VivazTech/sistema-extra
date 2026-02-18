// ============================================
// REPARAR: Reinserir usuário na tabela users quando existe em auth.users mas sumiu de users
// Sistema de Controle de Extras - Vivaz Cataratas
// ============================================
//
// Use quando o sync-user-auth.js removeu o usuário da tabela users por engano.
// O usuário existe em auth.users mas não em users - não aparece em Gerenciar Usuários
// e não consegue logar.
//
// Uso: node scripts/repair-user-from-auth.js tiago@vivazcataratas.com.br
// Ou com role e setores: node scripts/repair-user-from-auth.js tiago@vivazcataratas.com.br --role LEADER --sectors "ZELADORIA,RECEPCAO"
//
// ============================================

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function repairUser(emailArg) {
  const email = String(emailArg).trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('❌ Informe um email válido.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const roleIdx = args.indexOf('--role');
  const sectorsIdx = args.indexOf('--sectors');
  const role = roleIdx >= 0 && args[roleIdx + 1] ? args[roleIdx + 1] : 'VIEWER';
  const sectorsStr = sectorsIdx >= 0 && args[sectorsIdx + 1] ? args[sectorsIdx + 1] : '';

  console.log(`\n🔧 Reparando usuário: ${email}\n`);

  // 1. Verificar se já existe na tabela users
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, name, username')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    console.log('✅ Usuário já existe na tabela users:', existingUser.name, `(${existingUser.username})`);
    return;
  }

  // 2. Buscar no Auth
  const { data: authList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Erro ao listar Auth:', listErr.message);
    process.exit(1);
  }

  const authUser = authList.users.find((u) => u.email?.toLowerCase() === email);
  if (!authUser) {
    console.error('❌ Usuário não encontrado em auth.users. Verifique o email.');
    process.exit(1);
  }

  const authId = authUser.id;
  const meta = authUser.user_metadata || {};
  const name = meta.name || email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const username = (meta.username || email.split('@')[0]).toLowerCase();

  console.log(`   Auth ID: ${authId}`);
  console.log(`   Nome: ${name}`);
  console.log(`   Username: ${username}`);
  console.log(`   Role: ${role}`);

  // 3. Inserir na tabela users
  const { error: insertErr } = await supabaseAdmin.from('users').insert({
    id: authId,
    name,
    username,
    email,
    role,
    active: true,
    is_requester: false,
  });

  if (insertErr) {
    console.error('❌ Erro ao inserir:', insertErr.message);
    if (insertErr.code === '23505') {
      console.log('   O usuário pode já existir com outro email/username.');
    }
    process.exit(1);
  }

  // 4. Vincular setores (opcional)
  if (sectorsStr) {
    const sectorNames = sectorsStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (sectorNames.length > 0) {
      const { data: sectors } = await supabaseAdmin
        .from('sectors')
        .select('id, name')
        .in('name', sectorNames);
      if (sectors?.length) {
        const rows = sectors.map((s) => ({ user_id: authId, sector_id: s.id }));
        const { error: usErr } = await supabaseAdmin.from('user_sectors').insert(rows);
        if (!usErr) console.log(`   Setores vinculados: ${sectors.map((s) => s.name).join(', ')}`);
      }
    }
  }

  console.log('\n✅ Usuário reparado com sucesso!');
  console.log('   O usuário já pode fazer login ou usar "Esqueci minha senha" para definir a senha.\n');
}

const emailArg = process.argv.find((a) => a.includes('@'));
if (!emailArg) {
  console.log('Uso: node scripts/repair-user-from-auth.js <email> [--role LEADER] [--sectors "SETOR1,SETOR2"]');
  console.log('Exemplo: node scripts/repair-user-from-auth.js tiago@vivazcataratas.com.br --role LEADER');
  process.exit(1);
}

repairUser(emailArg);
