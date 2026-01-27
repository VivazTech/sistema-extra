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
