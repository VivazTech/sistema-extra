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

## Google Apps Script (planilha)

1. Abra a planilha desejada (ou crie uma).
2. **Extensões → Apps Script** (ou script vinculado à planilha).
3. Cole o código abaixo em `Código.gs`.
4. **Configuração do projeto** (ícone engrenagem) → marque **mostrar arquivo de manifesto** `appsscript.json` se quiser; não é obrigatório para o fluxo básico.
5. Em **Execuções**, escolha a função `doPost` não — o deploy é como **Implantar → Nova implantação** → tipo **Aplicativo da Web**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa** (o token no corpo JSON protege o endpoint; só o Supabase conhece a URL completa + token)
6. Copie a **URL da Web** e use em `GOOGLE_SHEETS_WEBHOOK_URL`.
7. No editor Apps Script: **Configurações do projeto** → **Propriedades do script** → **Propriedades do script** (Script properties):
   - `SPREADSHEET_ID` = ID da planilha (da URL `.../d/ESTE_ID/edit`)
   - `SHEET_NAME` = nome da aba (ex.: `Extras`) — padrão `Extras` se omitir
   - `WEBHOOK_TOKEN` = só se usar token: **mesmo texto** que o secret `GOOGLE_SHEETS_WEBHOOK_TOKEN` no Supabase (veja «Token (opcional)» acima)

### Código do Apps Script

```javascript
/**
 * Webhook: recebe POST JSON { token?, rows: [...] } e acrescenta linhas na aba.
 * Propriedades do script: SPREADSHEET_ID, SHEET_NAME (opcional), WEBHOOK_TOKEN (opcional).
 */
function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('WEBHOOK_TOKEN');
    var data = JSON.parse(e.postData.contents);

    if (expected && data.token !== expected) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }

    var rows = data.rows;
    if (!rows || !rows.length) {
      return jsonOut({ ok: false, error: 'rows vazio' });
    }

    var ssId = props.getProperty('SPREADSHEET_ID');
    if (!ssId) {
      return jsonOut({ ok: false, error: 'Defina SPREADSHEET_ID nas propriedades do script' });
    }

    var sheetName = props.getProperty('SHEET_NAME') || 'Extras';
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var headers = [
      'Código',
      'Nome do extra',
      'Setor',
      'Função',
      'Motivo',
      'Data trabalho',
      'Entrada',
      'Saída intervalo',
      'Volta intervalo',
      'Saída final',
      'Valor cadastrado',
      'Tipo valor',
      'Total horas (dia)',
      'Valor hora',
      'Valor a pagar',
      'RequestId',
    ];

    var last = sheet.getLastRow();
    if (last === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      last = 1;
    }

    var values = rows.map(function (r) {
      return [
        r.code || '',
        r.extraName || '',
        r.sector || '',
        r.role || '',
        r.reason || '',
        r.workDate || '',
        r.arrival || '',
        r.breakStart || '',
        r.breakEnd || '',
        r.departure || '',
        r.valorCadastrado != null ? r.valorCadastrado : '',
        r.valueTypeLabel || '',
        r.totalHorasDia || '',
        r.valorHora != null ? r.valorHora : '',
        r.valorPagar != null ? r.valorPagar : '',
        r.requestId || '',
      ];
    });

    sheet.getRange(last + 1, 1, last + values.length, values[0].length).setValues(values);

    return jsonOut({ ok: true, appended: values.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

### Payload enviado pelo Edge

O Apps Script recebe um objeto JSON com:

- `token` (se configurado no Supabase)
- `rows`: array de objetos com os mesmos campos da prévia (`code`, `extraName`, `sector`, `role`, `reason`, `workDate`, `arrival`, `breakStart`, `breakEnd`, `departure`, `valorCadastrado`, `valueTypeLabel`, `totalHorasDia`, `valorHora`, `valorPagar`, `requestId`)
- `source`, `sentAt` (metadados)

## CORS

Headers CORS permitem chamadas do front em qualquer origem autorizada pelo seu app (mesmo padrão de `admin-set-password`).
