-- Execute no SQL Editor do Supabase após publicar a nova página "portaria_pj".
-- Adiciona a página aos perfis que já usam Portaria / Relatórios.

UPDATE role_access SET
  pages = CASE role
    WHEN 'ADMIN'::user_role THEN ARRAY['dashboard','requests','portaria','portaria_pj','reports','graficos','catalogs','users','saldo','extras','tv','test','logs','escala']
    WHEN 'MANAGER'::user_role THEN ARRAY['dashboard','requests','portaria','portaria_pj','reports','graficos','saldo','tv']
    WHEN 'LEADER'::user_role THEN ARRAY['dashboard','requests','portaria','portaria_pj','reports','tv']
    WHEN 'VIEWER'::user_role THEN ARRAY['portaria','portaria_pj','tv']
    WHEN 'PORTARIA'::user_role THEN ARRAY['portaria','portaria_pj']
    ELSE pages
  END,
  updated_at = NOW()
WHERE role IN ('ADMIN','MANAGER','LEADER','VIEWER','PORTARIA');

-- Se a linha não existir para algum role, o INSERT do migrate original pode ser necessário.
