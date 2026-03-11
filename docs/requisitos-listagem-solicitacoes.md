# O que precisa existir no banco para uma solicitação aparecer na página Solicitações

## Onde ficam as datas dos dias trabalhados?

A tabela **extra_requests** **não tem** coluna `work_date` nem `work_day`. As datas em que o extra trabalha ficam na tabela **work_days**, ligadas pela FK `request_id`.

## Para que serve a tabela `work_days`?

A tabela **work_days** guarda **em quais dias** cada solicitação de extra vale: um registro por dia de trabalho daquela solicitação.

- **request_id** → qual solicitação (`extra_requests.id`)
- **work_date** → data do dia (ex.: 2026-02-07)
- **shift** → turno (ex.: Manhã, Tarde, MANHÃ/TARDE)

Ela é usada para:

1. **Listagem em Solicitações** – o filtro por data usa `work_date`: só aparecem solicitações que tenham pelo menos um `work_day` no período escolhido.
2. **Detalhe da solicitação** – lista de dias e turnos na tela.
3. **Portaria** – registro de ponto (entrada/saída) é por `work_day` (tabela `time_records` ligada a `work_days`).
4. **Recibos e relatórios** – valor por dia e totais usam os dias de `work_days`.

Se uma solicitação antiga não tiver nenhuma linha em `work_days`, ela continua vindo na consulta, mas **some da lista** quando o usuário aplica qualquer filtro por data. Com "Todos os períodos" ela pode aparecer (se tiver sido carregada pela paginação).

---

## 1. Tabela `extra_requests` (obrigatório)

A linha precisa ter pelo menos:

| Campo        | Obrigatório | Uso na listagem |
|-------------|-------------|------------------|
| `id`        | Sim         | Identificador único |
| `code`      | Sim         | Exibido (ex.: EXT-2026-0101) |
| `sector_id` | Sim         | FK para `sectors(id)`. Se o setor não existir, o nome do setor fica vazio (''); a solicitação ainda aparece, mas pode ser filtrada por setor. |
| `role_name` | Sim         | Função |
| `leader_id` / `leader_name` | Sim | Líder |
| `requester_name` | Sim   | Solicitante |
| `reason_name`    | Sim   | Motivo |
| `extra_name`     | Sim   | Nome do extra (e busca) |
| `value`          | Sim   | Valor |
| `value_type`     | Não   | 'por_hora' ou 'combinado'; default 'por_hora' |
| `status`         | Sim   | SOLICITADO, APROVADO, REJEITADO, CANCELADO (filtro por status) |
| `created_at`     | Sim   | Ordenação e paginação no carregamento |

Os demais campos (`observations`, `contact`, `rejection_reason`, `approved_by`, `approved_at`, etc.) são opcionais para **aparecer** na lista; alguns são usados em detalhes ou ações.

---

## 2. Tabela `work_days` (importante para o filtro por data)

- **Para a solicitação ser carregada:** não é obrigatório ter `work_days`. O `select` usa embed (left join); se não houver dias, a solicitação vem com `work_days: []`.
- **Para a solicitação aparecer quando há filtro por data:** é necessário **pelo menos um** registro em `work_days` com:
  - `request_id` = `id` da solicitação
  - `work_date` = data do dia trabalhado (ex.: 2026-02-07)
  - `shift` = turno (ex.: DIURNO, NOTURNO)

Se o usuário escolher "Últimos 30 dias", "Personalizado 01/02 a 07/02", etc., a página só mostra solicitações que tenham **algum** `work_date` dentro desse intervalo. Sem nenhum `work_day`, a solicitação some quando há filtro por data.

**Com "Todos os períodos"** (sem filtro de data), a solicitação pode aparecer mesmo com `work_days` vazios.

---

## 3. Outras tabelas (joins)

- **`sectors`:** `sector_id` deve apontar para um `id` existente em `sectors` para o nome do setor aparecer corretamente. Se o setor foi removido, `sector` fica '' e a solicitação pode ser excluída pelo filtro de setor ou por permissão (gerente/líder).
- **`users` (approved_by):** opcional; usado para exibir "Aprovado por".
- **`extra_persons`:** opcional; usado para CPF do extra.

Nenhuma dessas impede a linha de ser **carregada**; no máximo deixam campos vazios ou afetam filtros/permissões.

---

## 4. O que pode esconder uma solicitação já carregada (página Solicitações)

Na página Solicitações, mesmo com dados corretos no banco, a solicitação pode não aparecer por causa dos **filtros**:

| Filtro / regra | Efeito |
|----------------|--------|
| **Filtro por data** | Se houver período (ex.: "Últimos 30 dias" ou "Personalizado"), a solicitação só aparece se tiver **ao menos um** `work_day` com `work_date` dentro do intervalo. Sem `work_days` ou com datas fora do intervalo, some da lista. |
| **Busca** | Se o termo não estiver em `extra_name` ou `code`, a solicitação é ocultada. |
| **Status** | Se o dropdown não for "Todos os Status", a solicitação só aparece se o `status` for o selecionado. |
| **Setor** | Se for ADMIN e um setor for escolhido, só aparecem solicitações daquele setor. Se `sector` estiver vazio (setor inexistente), não bate com nenhum setor e some. |
| **Permissão (gerente)** | Usuário MANAGER só vê solicitações cujo `sector` está em `user.sectors`. |
| **Permissão (líder)** | Usuário LEADER só vê solicitações do próprio setor (`user.sectors`). |

---

## 5. Resumo para as 94 solicitações antes de 09/02

Para elas aparecerem na listagem:

1. **No banco:** cada uma deve ter em `extra_requests` os campos obrigatórios acima e um `sector_id` que exista em `sectors`.
2. **work_days:** se na tela estiver selecionado algum **filtro por data**, cada solicitação precisa de **pelo menos um** `work_day` com `work_date` dentro do período. Com **"Todos os períodos"**, não é obrigatório ter `work_days`.
3. **Na tela:** usar "Todos os períodos", "Todos os Status", "Todos os setores" e sem termo de busca garante que nenhum filtro esconda as 94.

**Sugestão de verificação no Supabase:** para uma das 94 (ex.: `EXT-2026-0004`), conferir na tabela `work_days` se existe alguma linha com `request_id` = UUID dessa solicitação e qual é o `work_date`. Se não existir nenhuma linha em `work_days` para essas 94, ao usar filtro por data elas não aparecem; ao usar "Todos os períodos", deveriam aparecer se forem carregadas (ver item 6).

---

## 6. Se ainda não aparecerem com "Todos os períodos"

Nesse caso o problema tende a ser no **carregamento** (não nos filtros):

- A listagem usa a mesma fonte do contexto: **paginação por cursor** em `extra_requests` com embed de `work_days` e `time_records`. As solicitações mais antigas (created_at até 09/02) vêm nas **últimas páginas**.
- Se a resposta HTTP de alguma página for muito grande (muitos `work_days`/`time_records`), pode haver timeout ou truncamento e essas páginas não chegarem ao cliente.
- Vale testar reduzir o `pageSize` no carregamento (ex.: 200) para diminuir o tamanho de cada resposta e ver se as 94 passam a aparecer.
