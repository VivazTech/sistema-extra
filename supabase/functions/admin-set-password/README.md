# Edge Function: admin-set-password

Permite que um administrador redefina a senha de outro usuário **dentro do sistema**, sem enviar email.

## CORS

A função envia cabeçalhos CORS (`Access-Control-Allow-Origin: *`) para permitir chamadas do front em qualquer domínio (ex.: `https://extras.vivazcataratas.com.br`). Se aparecer "blocked by CORS policy" no console:

1. Faça o **redeploy** da função após qualquer alteração: `supabase functions deploy admin-set-password`
2. No **Supabase Dashboard** → seu projeto → **Project Settings** → **API**: confira se não há restrição de origem que bloqueie o domínio do front.
3. Em **Edge Functions**, alguns projetos exigem que a função responda ao preflight `OPTIONS` com status 200 e os headers já estão configurados neste código.

## Deploy

Na raiz do projeto (onde está o `supabase/`), com o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado:

```bash
supabase functions deploy admin-set-password
```

- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são preenchidos automaticamente pelo Supabase.
- A chave usada para validar o JWT do usuário é obtida do **header `apikey`** que o front envia (mesmo valor de `VITE_SUPABASE_ANON_KEY`). Assim o token é sempre validado no mesmo projeto do app, evitando "Token inválido" por projeto/secret diferente.
- Opcional: se quiser não depender do header, defina o secret `SUPABASE_ANON_KEY` no projeto (Dashboard → Edge Functions → Secrets) com a anon key do mesmo projeto.

## Uso no sistema

1. Acesse **Usuários** (como ADMIN).
2. Clique no ícone de chave (Redefinir senha) do usuário.
3. No modal, informe a **nova senha** e **confirmar senha**, depois em **Definir nova senha**.

Se a função não estiver publicada, o sistema mostrará uma mensagem e você pode usar **Enviar email de recuperação** como alternativa.
