# Resumo da Migração: Remoção de Dados Locais

## Objetivo
Garantir que **100% dos dados** venham do banco de dados Supabase, removendo dependências de dados hardcoded ou salvos localmente.

## Alterações Realizadas

### 1. ✅ Remoção de Dados Hardcoded Iniciais
- **Arquivo**: `context/ExtraContext.tsx`
- **Mudança**: Removido uso de `INITIAL_SECTORS`, `INITIAL_REQUESTERS`, `INITIAL_REASONS` como estado inicial
- **Antes**: Estados iniciais com dados hardcoded
- **Depois**: Estados começam vazios (`[]`) e são populados exclusivamente do banco de dados

### 2. ✅ Migração de Permissões de Acesso para Banco
- **Arquivo**: `context/AccessContext.tsx`
- **Mudança**: Configurações de `role_access` agora vêm do banco de dados
- **Antes**: Dados salvos apenas no `localStorage`
- **Depois**: Dados carregados do Supabase, com sincronização automática
- **SQL**: `supabase/migrate-role-access-to-db.sql` criado

### 3. ✅ Remoção de MOCK_USERS
- **Arquivo**: `constants.ts`
- **Mudança**: Removido `MOCK_USERS` que não estava sendo utilizado
- **Motivo**: Dados de usuários vêm exclusivamente do banco

### 4. ✅ localStorage como Cache Temporário
- **Arquivos**: `context/AuthContext.tsx`, `context/ExtraContext.tsx`
- **Mudança**: `localStorage` agora é usado apenas como cache temporário para melhorar UX
- **Antes**: Fallback para dados em caso de erro
- **Depois**: Cache opcional, fonte primária sempre é o banco de dados

## SQL para Executar no Supabase

Execute o arquivo `supabase/migrate-role-access-to-db.sql` no SQL Editor do Supabase:

1. Adiciona `PORTARIA` ao enum `user_role` (se não existir)
2. Cria tabela `role_access` para armazenar configurações de acesso
3. Insere configurações padrão para todas as roles
4. Configura RLS (Row Level Security) adequadamente

## Estrutura da Nova Tabela

```sql
CREATE TABLE role_access (
  id UUID PRIMARY KEY,
  role user_role UNIQUE NOT NULL,
  pages TEXT[] NOT NULL,
  actions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Dados que Continuam no localStorage (Aceitável)

1. **`vivaz_auth`** (AuthContext): Cache temporário de autenticação (melhora UX)
2. **`tv-dashboard-theme`** (TVDashboard): Preferência de tema do dispositivo (não precisa estar no banco)

## Verificação

Após executar o SQL, verifique:
- ✅ Tabela `role_access` criada
- ✅ Configurações padrão inseridas
- ✅ RLS habilitado e funcionando
- ✅ Sistema carrega permissões do banco corretamente

## Próximos Passos

1. Execute o SQL no Supabase
2. Teste o sistema para garantir que as permissões estão sendo carregadas corretamente
3. Verifique se não há mais dependências de dados locais
