# 📸 Configuração do Storage para Fotos

Este arquivo contém instruções para configurar o Supabase Storage para armazenar as fotos de registro de ponto.

## 🚀 Como Configurar

### Opção 1: Via SQL Editor (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `storage-setup.sql`
6. Clique em **Run**

### Opção 2: Via Dashboard

1. Acesse **Storage** no menu lateral
2. Clique em **New bucket**
3. Configure:
   - **Name:** `time-records`
   - **Public bucket:** ✅ Sim (marcado)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp`
4. Clique em **Create bucket**

### Opção 3: Configurar Políticas Manualmente

Após criar o bucket, configure as políticas de acesso:

1. Vá em **Storage** → **Policies**
2. Selecione o bucket `time-records`
3. Adicione as seguintes políticas:

**Política 1: Upload (Insert)**
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'time-records'`

**Política 2: Leitura (Select)**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'time-records'`

**Política 3: Atualização (Update)**
- Policy name: `Allow authenticated updates`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'time-records'`

**Política 4: Deleção (Delete)**
- Policy name: `Allow authenticated deletes`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'time-records'`

## ✅ Verificação

Após configurar, teste:

1. Acesse a página **Portaria**
2. Preencha os 4 campos de horário de um extra
3. Clique em **Tirar Foto**
4. Deve abrir a câmera do dispositivo
5. Capture a foto e confirme
6. A foto deve ser salva e exibida

## 🔧 Troubleshooting

### Erro: "Bucket not found"
- Execute o SQL `storage-setup.sql` ou crie o bucket manualmente

### Erro: "Permission denied"
- Verifique se as políticas RLS estão configuradas corretamente

### Câmera não abre
- Verifique as permissões do navegador para acessar a câmera
- Use HTTPS (obrigatório para acesso à câmera)

### Foto não aparece após salvar
- Verifique o console do navegador para erros
- Confirme que o bucket está público
- Verifique se a URL da foto está sendo salva corretamente
