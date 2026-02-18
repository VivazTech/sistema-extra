# Scripts de Configuração

## Criar Usuário Admin

### Opção 1: Script Node.js (Recomendado)

1. Instale as dependências:
```bash
npm install @supabase/supabase-js dotenv
```

2. Crie um arquivo `.env` na raiz do projeto:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

**Como obter a Service Role Key:**
- Acesse o Supabase Dashboard
- Vá em Settings > API
- Copie a "service_role" key (⚠️ NUNCA compartilhe esta chave!)

3. Execute o script:
```bash
node scripts/create-admin-user.js
```

### Opção 2: Manualmente pelo Supabase Dashboard

1. Execute o SQL `supabase/create-admin-user.sql` no SQL Editor
2. No Supabase Dashboard, vá em **Authentication > Users**
3. Clique em **"Add User"** > **"Create new user"**
4. Preencha:
   - **Email:** `admin@vivazcataratas.com.br`
   - **Password:** `Admin@2024`
   - **Auto Confirm User:** ✅ (marcar)
5. Copie o **ID** do usuário criado
6. Execute no SQL Editor:
```sql
UPDATE users
SET id = 'ID_COPIADO_AQUI'
WHERE username = 'admin';
```

### Credenciais Padrão

- **Usuário:** `admin`
- **Email:** `admin@vivazcataratas.com.br`
- **Senha:** `Admin@2024`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

## Sincronizar Usuários com o Auth (Erro "Invalid login credentials")

Quando um usuário existe na tabela `users` mas **não existe em `auth.users`**, o login falha com "Invalid login credentials". Use este script para criar a conta no Supabase Auth:

### Sincronizar um usuário (por email)

```bash
node scripts/sync-user-auth.js tiago@vivazcataratas.com.br
```

### Sincronizar todos os usuários desincronizados

```bash
node scripts/sync-user-auth.js --all
```

### O que o script faz

1. Verifica se o usuário existe na tabela `users`
2. Verifica se já existe em `auth.users`
3. Cria o usuário no Supabase Auth (se necessário)
4. Envia email de **"Esqueci minha senha"** para o usuário definir sua senha

O usuário deve acessar o link recebido por email para definir a senha e conseguir fazer login.

---

## Reparar Usuário "Sumido" (repair-user-from-auth.js)

Se após executar o sync-user-auth.js o usuário **sumiu** da lista "Gerenciar Usuários" (existe em auth.users mas não em users), use este script para reinseri-lo:

```bash
node scripts/repair-user-from-auth.js tiago@vivazcataratas.com.br --role LEADER
```

### Parâmetros opcionais

- `--role LEADER` – perfil do usuário (ADMIN, MANAGER, LEADER, VIEWER, PORTARIA). Padrão: VIEWER
- `--sectors "SETOR1,SETOR2"` – setores vinculados (separados por vírgula)

### Exemplo completo

```bash
node scripts/repair-user-from-auth.js tiago@vivazcataratas.com.br --role LEADER --sectors "ZELADORIA,RECEPCAO"
```
