# Mapeamento de erros — Salvar Solicitação de Extra

Documento de referência para suporte e diagnóstico. Descreve o que o usuário vê na tela, a situação que causa o erro e onde buscar o log técnico.

**Fluxo coberto:** modal **Solicitar Funcionário Extra** / **Editar Solicitação** (`components/RequestModal.tsx`).

**Utilitário:** `utils/errorMessage.ts`

---

## Como funciona o tratamento de erro

| Tipo | O que aparece na tela | Código na tela |
|------|------------------------|----------------|
| **Validação no formulário** (antes de chamar a API) | Mensagem fixa em português | Não |
| **Erro de negócio** (regra do sistema) | Mensagem fixa em português | Não |
| **Erro técnico** (Supabase / PostgREST / rede) | Mensagem genérica + código rastreável | Sim (ex.: `PGRST301`, `23505`) |

**Formato exibido para erro técnico:**

```
Não foi possível salvar a solicitação. Código: PGRST301. Tente novamente ou envie este código ao suporte.
```

Na **edição**, a ação muda para:

```
Não foi possível salvar as alterações da solicitação. Código: …
```

Detalhes de banco (nome de tabela, RLS, SQL, `hint`, `details`) **nunca** são mostrados ao usuário.

---

## Onde ver os logs

### 1. Console do navegador (desenvolvedor / suporte com acesso ao dispositivo)

Abra as ferramentas de desenvolvedor (F12) → aba **Console**.

Procure por:

```
[Solicitações > Salvar solicitação] Erro código=PGRST301
```

O objeto seguinte contém o erro completo:

- `code` — código PostgREST/Postgres
- `message`, `details`, `hint` — detalhes técnicos
- `editMode`, `requestId` — contexto da operação

Também há log anterior em `ExtraContext`:

```
Erro ao adicionar solicitação: …
Erro ao criar solicitação: …
Erro ao criar dias de trabalho: …
```

### 2. Vercel (produção / preview)

1. Acesse o projeto no [Vercel Dashboard](https://vercel.com).
2. **Deployments** → deployment ativo → **Logs** (Runtime / Function logs).
3. Busque por:
   - `Solicitações > Salvar solicitação`
   - `Erro código=`
   - o código informado pelo usuário (ex.: `PGRST301`)

> Erros capturados no front-end aparecem principalmente no **console do navegador**. Logs da Vercel são mais úteis para erros de API/server-side, se existirem.

### 3. Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → projeto → **Logs**.
2. Abas úteis:
   - **API** — requisições PostgREST (`/rest/v1/extra_requests`, `/rest/v1/work_days`)
   - **Postgres** — erros SQL, violações de constraint
3. Filtre pelo horário do incidente e pelo código (ex.: `23505`, `42501`).

### 4. Log de ações no sistema (Action Log)

Registro interno da aplicação (`ActionLogContext`), visível conforme permissão de admin:

| Evento | Texto registrado |
|--------|------------------|
| Sucesso ao criar | `Solicitações > Solicitar funcionário extra` → `Solicitação criada` |
| Erro com código | `Solicitações > Solicitar funcionário extra` → `Erro código PGRST301` |
| Erro de negócio | `Solicitações > Solicitar funcionário extra` → `Erro: <mensagem>` |

---

## Validações no formulário (antes de salvar)

Interceptadas em `RequestModal.tsx`. **Não geram código** e **não passam** por `formatUserErrorMessage`.

| Situação | Mensagem na tela | Onde ver log |
|----------|------------------|--------------|
| Campo obrigatório vazio (setor, função, extra, valor, dia/turno) | `Por favor, preencha todos os campos obrigatórios.` | Não há log estruturado |
| Motivo EVENTO sem evento selecionado | `Para motivo EVENTO, selecione o evento.` | Não há log estruturado |
| Motivo TESTE sem valor máximo cadastrado | `O motivo TESTE exige um valor máximo definido pelo administrador. Configure em Cadastros > Motivos da Solicitação (Valor máx. em R$).` | Não há log estruturado |
| Valor acima do limite do motivo | `O valor não pode ser maior que o limite do motivo (R$ …).` | Não há log estruturado |
| Líder tentando data passada (validação client-side) | `Apenas administradores podem criar solicitações para datas passadas.` | Não há log estruturado |
| Sessão com `user.id` inválido | `Erro: Usuário não autenticado corretamente. Por favor, faça login novamente.` | Não há log estruturado |

---

## Erros de negócio (backend / regras do sistema)

Definidos em `ExtraContext.addRequest` e listados em `BUSINESS_ERROR_MESSAGES` (`utils/errorMessage.ts`).

Aparecem **sem código** — só a mensagem abaixo.

| Situação | Origem | Mensagem na tela | Log técnico |
|----------|--------|------------------|-------------|
| Líder envia solicitação com data passada (validação server-side) | `addRequest` | `Apenas administradores podem criar solicitações para datas passadas.` | Console: `Erro ao adicionar solicitação` + Action Log: `Erro: …` |
| Setor informado não existe no banco | `addRequest` → busca em `sectors` | `Setor não encontrado. Verifique o setor selecionado e tente novamente.` | Console: `Setor não encontrado: <nome>` |
| `leaderId` não é UUID válido | `addRequest` | `ID do líder inválido. Por favor, faça login novamente.` | Console: `leaderId não é um UUID válido` |
| Solicitação criada sem dias de trabalho | `addRequest` (rollback da solicitação) | `A solicitação precisa ter pelo menos 1 dia de trabalho.` | Console: `Erro ao adicionar solicitação` |
| Mesma data repetida na mesma solicitação | `addRequest` (rollback) | `Existem dias repetidos na solicitação. Ajuste as datas para continuar.` | Console: `Erro ao adicionar solicitação` |
| Insert OK, mas falha ao recarregar solicitação completa | `addRequest` | `Solicitação criada mas não foi possível buscar os dados completos` | Console: `Erro ao adicionar solicitação` |

---

## Erros técnicos (Supabase / PostgREST)

Objeto de erro preservado com campo `code`. O usuário vê apenas o **código**, não a mensagem interna.

| Etapa | Operação | Tabela | Mensagem na tela (exemplo) |
|-------|----------|--------|----------------------------|
| 1 | Insert da solicitação | `extra_requests` | `Não foi possível salvar a solicitação. Código: <code>. …` |
| 2 | Insert dos dias | `work_days` | `Não foi possível salvar a solicitação. Código: <code>. …` |
| 3 | Edição (`updateRequest`) | `extra_requests` / `work_days` | `Não foi possível salvar as alterações da solicitação. Código: <code>. …` |

**Log completo:** `[Solicitações > Salvar solicitação] Erro código=<code>` no console do navegador.

---

## Códigos PostgREST / Postgres mais comuns

Referência rápida para interpretar o código que o usuário enviou.

| Código | Significado provável | Causa usual neste fluxo |
|--------|----------------------|-------------------------|
| `PGRST301` | JWT expirado ou inválido | Sessão expirada; usuário precisa fazer login de novo |
| `42501` | Permissão negada (RLS) | Política RLS bloqueou insert/update para o perfil do usuário |
| `23505` | Violação de UNIQUE | Registro duplicado (ex.: dia já existente em outra solicitação, se houver constraint global) |
| `23503` | Violação de FOREIGN KEY | Referência inválida (`sector_id`, `leader_id`, etc.) |
| `23502` | NOT NULL violado | Campo obrigatório ausente no insert |
| `22P02` | Formato inválido | UUID ou tipo de dado incorreto |
| `PGRST116` | `.single()` sem resultado | Registro esperado não encontrado |
| `HTTP_401` | Não autorizado | Token ausente ou inválido |
| `HTTP_403` | Proibido | Acesso negado pela API |
| `DESCONHECIDO` | Código não identificado | Erro de rede, timeout ou formato inesperado |

Consulte a [documentação PostgREST](https://postgrest.org/en/stable/references/errors.html) para códigos `PGRST*`.

---

## Fluxo resumido (criar solicitação)

```
RequestModal (validações client-side)
    ↓
ExtraContext.addRequest
    ├─ Validações de negócio → mensagem direta (sem código)
    ├─ INSERT extra_requests → erro Supabase → código na tela
    ├─ Valida dias / duplicidade → mensagem direta (sem código)
    ├─ INSERT work_days → erro Supabase → código na tela
    └─ SELECT solicitação completa → falha → mensagem direta (sem código)
    ↓
RequestModal catch
    ├─ formatUserErrorMessage → alert ao usuário
    ├─ logErrorForSupport → console (detalhes completos)
    └─ logAction → registro interno de ações
```

---

## Arquivos relacionados

| Arquivo | Responsabilidade |
|---------|------------------|
| `utils/errorMessage.ts` | Formata mensagem segura, extrai código, log de suporte |
| `components/RequestModal.tsx` | Validações do formulário + exibição do `alert` |
| `context/ExtraContext.tsx` | `addRequest`, `updateRequest` — origem dos erros de backend |

---

## Manutenção

Ao adicionar nova **mensagem de negócio** em `ExtraContext` (ou outro serviço usado pelo modal), inclua o texto exato em `BUSINESS_ERROR_MESSAGES` em `utils/errorMessage.ts` para que continue aparecendo **sem código técnico** na tela.

Para novos fluxos (Portaria, Cadastros, etc.), reutilize:

```typescript
import { formatUserErrorMessage, logErrorForSupport } from '../utils/errorMessage';

const { userMessage, code } = formatUserErrorMessage(error, 'salvar o registro');
logErrorForSupport('Contexto > Ação', error, { code });
alert(userMessage);
```
