-- ============================================
-- STORAGE: Permitir upload de fotos pelo role anon
-- Use quando aparecer: "new row violates row-level security policy"
-- ao salvar a foto na Portaria.
-- Execute no Supabase SQL Editor.
-- ============================================

-- Upload (INSERT) no bucket time-records para anon
DROP POLICY IF EXISTS "Allow anon uploads to time-records" ON storage.objects;
CREATE POLICY "Allow anon uploads to time-records" ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'time-records');

-- Atualização (UPDATE) no bucket time-records para anon
DROP POLICY IF EXISTS "Allow anon updates to time-records" ON storage.objects;
CREATE POLICY "Allow anon updates to time-records" ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'time-records');

-- Deleção (DELETE) no bucket time-records para anon (opcional)
DROP POLICY IF EXISTS "Allow anon deletes to time-records" ON storage.objects;
CREATE POLICY "Allow anon deletes to time-records" ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'time-records');
