-- ============================================
-- CONFIGURAÇÃO DO STORAGE PARA FOTOS
-- Sistema de Controle de Extras - Vivaz Cataratas
-- ============================================

-- Criar bucket para armazenar fotos de registro de ponto
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-records',
  'time-records',
  true,
  5242880, -- 5MB máximo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de fotos (autenticados)
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'time-records');

-- Política para permitir leitura pública (fotos são públicas)
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'time-records');

-- Política para permitir atualização (autenticados)
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'time-records');

-- Política para permitir deleção (autenticados)
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'time-records');
