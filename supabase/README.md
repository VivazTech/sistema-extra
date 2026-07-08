# 🗄️ Configuração do Banco de Dados - Supabase

Este diretório contém todos os arquivos SQL necessários para configurar o banco de dados do Sistema de Controle de Extras no Supabase.

## 📋 Arquivos

- **`schema.sql`** - Schema completo do banco de dados com todas as tabelas, índices, triggers, RLS e dados iniciais

## 🚀 Como Aplicar o Schema

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Copie e cole todo o conteúdo do arquivo `schema.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter`
7. Aguarde a execução completa

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Aplicar o schema
supabase db push
```

### Opção 3: Via psql (PostgreSQL direto)

```bash
psql -h db.seu-projeto.supabase.co -U postgres -d postgres -f schema.sql
```

## 📊 Estrutura do Banco

### Tabelas Principais

1. **users** - Usuários do sistema
2. **sectors** - Setores do hotel
3. **sector_roles** - Funções/cargos por setor
4. **user_sectors** - Relação usuário-setor (para managers)
5. **requesters** - Solicitantes
6. **reasons** - Motivos de solicitação
7. **extra_persons** - Banco de funcionários extras
8. **extra_requests** - Solicitações de extras
9. **work_days** - Dias de trabalho
10. **time_records** - Registros de ponto
11. **extra_saldo_records** - Registros de saldo
12. **extra_saldo_settings** - Configurações de saldo

### Funcionalidades Automáticas

- ✅ **Geração automática de código** de solicitação (EXT-2024-0001)
- ✅ **Atualização automática** de `updated_at` em todas as tabelas
- ✅ **Índices otimizados** para queries frequentes
- ✅ **Row Level Security (RLS)** habilitado em todas as tabelas
- ✅ **Dados iniciais** (seeds) incluídos

## 🔐 Segurança (RLS)

O schema inclui políticas básicas de RLS. **IMPORTANTE:** Em produção, você deve ajustar as políticas para serem mais restritivas baseadas em roles de usuário.

Exemplo de política mais segura:

```sql
-- Apenas admins podem modificar usuários
CREATE POLICY "Only admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

## 🔑 Variáveis de Ambiente

Após aplicar o schema, você precisará das seguintes variáveis no seu projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
# URL pública do app (produção) - obrigatório para o link "Esqueci minha senha" funcionar
VITE_APP_URL=https://seu-dominio.com.br
```

## 📝 Próximos Passos

1. ✅ Aplicar o schema SQL
2. ✅ Configurar variáveis de ambiente
3. ✅ Atualizar o código para usar Supabase Client
4. ✅ Testar autenticação
5. ✅ Testar CRUD de solicitações

## 📧 Email "Esqueci minha senha" abre localhost ou dá "link expired"

1. **Defina `VITE_APP_URL`** no Vercel/Hosting com a URL pública do app (ex: `https://extras.vivazcataratas.com.br`)
2. **No Supabase Dashboard** → Authentication → URL Configuration:
   - **Site URL:** a mesma URL do app em produção
   - **Redirect URLs:** adicione `https://seu-dominio.com.br/#/reset-password` e `https://seu-dominio.com.br/**`

## 📧 Personalizar e-mail de redefinição de senha

1. Abra **Supabase Dashboard** → **Authentication** → **Email Templates** → **Reset password**
2. **Subject:** `Redefinir senha — Portal Vivaz Extras`
3. **Body:** copie o conteúdo de `supabase/templates/recovery-password.html` (sem o comentário inicial)
4. Para remetente **Vivaz Cataratas** em vez de "Supabase Auth", configure **SMTP Settings** com e-mail do domínio (ex.: `noreply@vivazcataratas.com.br`)

## 🐛 Troubleshooting

### Erro: "relation already exists"
- O schema já foi aplicado anteriormente
- Use `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` para resetar (CUIDADO: apaga tudo!)

### Erro: "permission denied"
- Verifique se está usando a role correta
- Verifique as políticas RLS

### Erro: "duplicate key value"
- Os dados iniciais já existem
- Use `ON CONFLICT DO NOTHING` (já incluído no schema)

## 📚 Documentação

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
