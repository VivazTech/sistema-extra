## Saldo de Extras

### Objetivo
Calcular e exibir o saldo de extras por setor e período, seguindo a lógica da planilha “EXTRAS AUTORIZADOS”.

### Fórmulas
- `quadro_aberto = max(0, quadro_aprovado - quadro_efetivo)`
- `vagas_diarias = quadro_aberto * 6`
- `total_diarias = quadro_aberto + folgas + domingos + vagas_diarias + demanda + atestado`
- `saldo = total_diarias - extras_solicitados`
- `valor = extras_solicitados * valor_diaria`
- `saldo_em_reais = (saldo * valor_diaria) * (-1)`

### Validações obrigatórias
- Nenhum campo numérico pode ser negativo.
- Campos vazios são tratados como 0 no input.
- `quadro_aberto` nunca pode ser negativo.
- `valor` e `saldo_em_reais` sempre com 2 casas decimais.

### Persistência
Os registros e configurações são armazenados em `localStorage`:
- `vivaz_extra_saldo_records`
- `vivaz_extra_saldo_settings`

### Observações
O campo `valor_diaria_snapshot` é salvo em cada registro para manter histórico, mesmo se a diária mudar no futuro.
