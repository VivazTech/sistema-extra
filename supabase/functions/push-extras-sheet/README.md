# Edge Function: push-extras-sheet

Encaminha as linhas da **prévia para planilha** (Relatórios → Recibos) para um **Google Apps Script** publicado como aplicativo web. A URL e o token do webhook ficam só nos **secrets** do Supabase — o navegador nunca os vê.

## Permissões

Usuários com papel **ADMIN**, **MANAGER** ou **LEADER** (tabela `users`, ativo) podem chamar a função.

## Secrets no Supabase

No Dashboard: **Project Settings → Edge Functions → Secrets** (ou CLI):

```bash
supabase secrets set GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/SEU_ID/exec"
# Token: veja seção «Token (opcional)» abaixo — só precisa se for usar WEBHOOK_TOKEN no Apps Script
supabase secrets set GOOGLE_SHEETS_WEBHOOK_TOKEN="cole-aqui-o-mesmo-texto-secreto"
```

### Token (opcional): o que é e onde colocar

É **uma senha inventada por você** (texto longo e aleatório, ex.: `k9mP_x2LvqR4nW8zQ`). Serve para que só o Supabase consiga usar a URL do Apps Script.

- **Opção A — sem token (mais simples para testar)**  
  - No Supabase: defina **só** `GOOGLE_SHEETS_WEBHOOK_URL` (com sua URL `/exec`).  
  - **Não** crie `GOOGLE_SHEETS_WEBHOOK_TOKEN`.  
  - No Apps Script: **não** crie a propriedade `WEBHOOK_TOKEN`.  
  - O script aceita qualquer POST com `rows` válido (quem descobrir a URL poderia enviar dados — por isso em produção use a opção B).

- **Opção B — com token (recomendado)**  
  1. Escolha um texto secreto, por exemplo: `MeuSegredoVivaz2026_abc123xyz`.  
  2. No **Supabase** → secret `GOOGLE_SHEETS_WEBHOOK_TOKEN` = exatamente esse texto.  
  3. No **Apps Script** → **Projeto** (ícone engrenagem) → **Propriedades do script** → adicione linha: nome `WEBHOOK_TOKEN`, valor **o mesmo texto** (copiar e colar).  
  4. A Edge Function envia no JSON do POST o campo `token` com esse valor; o `doPost` compara com `WEBHOOK_TOKEN` — se forem iguais, grava na planilha.

Resumindo: **`GOOGLE_SHEETS_WEBHOOK_TOKEN` (Supabase)** e **`WEBHOOK_TOKEN` (Apps Script)** são **o mesmo segredo**, em **dois lugares** — não é o “código de implantação” do Google; é uma palavra-chave que **você** define.

## Deploy

```bash
supabase functions deploy push-extras-sheet
```

Em `supabase/config.toml` esta função usa `verify_jwt = false` para o pedido chegar ao `index.ts`; a autorização é feita dentro do código (JWT + papel no banco), como em `admin-set-password`.

## Google Apps Script (planilha Controle de Extras)

A planilha de destino é a **Controle de Extras**, aba **Base de Dados**. O código oficial está em `Codigo.gs` neste mesmo diretório.

1. Abra a planilha → **Extensões → Apps Script**.
2. Apague o conteúdo antigo e cole o arquivo `Codigo.gs`.
3. **Salvar**.
4. **Implantar → Nova implantação** → tipo **Aplicativo da Web**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie a **URL da Web** (`…/exec`) e grave em `GOOGLE_SHEETS_WEBHOOK_URL`.
6. Teste no navegador: abrir a URL `/exec` deve devolver JSON `{"ok":true,"service":"vivaz-controle-extras",…}`. Se aparecer HTML de login ou 404, a implantação está errada.
7. Propriedades do script (opcionais):
   - `SHEET_NAME` — padrão `Base de Dados`
   - `SPREADSHEET_ID` — só se o script não estiver vinculado à planilha
   - `WEBHOOK_TOKEN` — só se usar token (veja acima)

Colunas gravadas: NOME, SETOR, ATIVIDADE, FINALIDADE, DIA, ENTRADA, SAÍDA intervalo, CHEGADA, SAÍDA final, DIARIA, VALOR HORA, VALOR PAGAR.  
ANO, MÊS, SEMANA e HORAS TRABALHADAS **não** são preenchidos — o script copia a fórmula da última linha.

### Erro «não retornou JSON válido»

O Google devolveu **HTML** (não o `{ ok: true }` do script). Causas mais comuns:

1. **URL `/exec` antiga (404)** — implantação apagada ou nova implantação gerou outra URL. Crie **Nova implantação** e atualize o secret.
2. **Acesso não é «Qualquer pessoa»** — o Google devolve página de login em HTML.
3. **URL `/dev`** — só funciona logado; use a URL da implantação `/exec`.

Depois de colar o `Codigo.gs` novo, é obrigatório **Nova implantação** (não basta salvar o código).

### Payload enviado pelo Edge

O Apps Script recebe um objeto JSON com:

- `token` (se configurado no Supabase)
- `rows`: array da prévia (`extraName`, `sector`, `role`, `reason`, `workDate`, `arrival`, `breakStart`, `breakEnd`, `departure`, `valorCadastrado`, `valorHora`, `valorPagar`, …)
- `source`, `sentAt` (metadados)

## CORS

Headers CORS permitem chamadas do front em qualquer origem autorizada pelo seu app (mesmo padrão de `admin-set-password`).
