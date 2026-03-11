-- ============================================
-- Backfill: adicionar work_day com data de CRIAÇÃO para solicitações antigas
-- Resolve: solicitações criadas antes de 09/02 não aparecem porque work_days
-- só tem datas a partir de 09/02. extra_requests NÃO tem coluna work_date;
-- as datas dos dias ficam na tabela work_days (request_id + work_date + shift).
-- ============================================
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
--
-- O que faz: para cada extra_request com created_at ANTES de 10/02/2026,
-- insere UM work_day com work_date = data do created_at (ex.: 07/02, 08/02),
-- desde que ainda não exista esse dia para essa solicitação.
-- Assim passam a existir linhas em work_days com work_date anterior a 09/02.

INSERT INTO work_days (request_id, work_date, shift)
SELECT
  er.id,
  (er.created_at AT TIME ZONE 'UTC')::date AS work_date,
  'Manhã' AS shift
FROM extra_requests er
WHERE (er.created_at AT TIME ZONE 'UTC')::date < '2026-02-10'
  AND NOT EXISTS (
    SELECT 1 FROM work_days wd
    WHERE wd.request_id = er.id
      AND wd.work_date = (er.created_at AT TIME ZONE 'UTC')::date
  )
ON CONFLICT (request_id, work_date) DO NOTHING;

-- Conferir: contar work_days com work_date antes de 09/02 (deve aumentar após rodar):
-- SELECT COUNT(*) FROM work_days WHERE work_date < '2026-02-09';
