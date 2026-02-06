-- ============================================
-- QUERIES ÚTEIS E FUNÇÕES AUXILIARES
-- Sistema de Controle de Extras - Vivaz Cataratas
-- ============================================

-- ============================================
-- 1. QUERIES DE CONSULTA COMUNS
-- ============================================

-- Buscar todas as solicitações aprovadas do dia atual
SELECT 
  er.*,
  s.name AS sector_name,
  wd.work_date,
  wd.shift
FROM extra_requests er
JOIN sectors s ON er.sector_id = s.id
JOIN work_days wd ON wd.request_id = er.id
WHERE er.status = 'APROVADO'
  AND wd.work_date = CURRENT_DATE
ORDER BY er.extra_name;

-- Buscar solicitações por setor e período
SELECT 
  er.code,
  er.extra_name,
  s.name AS sector,
  er.status,
  wd.work_date,
  wd.shift,
  er.value
FROM extra_requests er
JOIN sectors s ON er.sector_id = s.id
JOIN work_days wd ON wd.request_id = er.id
WHERE s.name = 'Restaurante'
  AND wd.work_date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY wd.work_date, er.extra_name;

-- Buscar extras com registros de ponto incompletos (do dia)
SELECT 
  er.code,
  er.extra_name,
  s.name AS sector,
  wd.work_date,
  wd.shift,
  tr.arrival,
  tr.departure,
  CASE 
    WHEN tr.arrival IS NULL THEN 'Pendente'
    WHEN tr.departure IS NULL THEN 'Em andamento'
    ELSE 'Completo'
  END AS status_ponto
FROM extra_requests er
JOIN sectors s ON er.sector_id = s.id
JOIN work_days wd ON wd.request_id = er.id
LEFT JOIN time_records tr ON tr.work_day_id = wd.id
WHERE er.status = 'APROVADO'
  AND wd.work_date = CURRENT_DATE
ORDER BY status_ponto, er.extra_name;

-- Estatísticas do dia
SELECT 
  COUNT(*) FILTER (WHERE er.status = 'SOLICITADO') AS solicitados,
  COUNT(*) FILTER (WHERE er.status = 'APROVADO') AS aprovados,
  COUNT(*) FILTER (WHERE er.status = 'REPROVADO') AS reprovados,
  COUNT(*) FILTER (WHERE er.status = 'CANCELADO') AS cancelados,
  COUNT(DISTINCT er.sector_id) AS setores_envolvidos,
  SUM(er.value) FILTER (WHERE er.status = 'APROVADO') AS valor_total_aprovado
FROM extra_requests er
JOIN work_days wd ON wd.request_id = er.id
WHERE wd.work_date = CURRENT_DATE;

-- Extras por setor (do dia)
SELECT 
  s.name AS setor,
  COUNT(*) AS total_extras,
  COUNT(*) FILTER (WHERE er.status = 'APROVADO') AS aprovados,
  SUM(er.value) FILTER (WHERE er.status = 'APROVADO') AS valor_total
FROM extra_requests er
JOIN sectors s ON er.sector_id = s.id
JOIN work_days wd ON wd.request_id = er.id
WHERE wd.work_date = CURRENT_DATE
GROUP BY s.name
ORDER BY total_extras DESC;

-- ============================================
-- 2. FUNÇÕES AUXILIARES
-- ============================================

-- Função para calcular horas trabalhadas
CREATE OR REPLACE FUNCTION calculate_work_hours(
  arrival_time TIME,
  departure_time TIME,
  break_start_time TIME DEFAULT NULL,
  break_end_time TIME DEFAULT NULL
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_minutes INTEGER;
  break_minutes INTEGER := 0;
BEGIN
  IF arrival_time IS NULL OR departure_time IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calcular minutos totais
  total_minutes := EXTRACT(EPOCH FROM (departure_time - arrival_time)) / 60;

  -- Subtrair intervalo se existir
  IF break_start_time IS NOT NULL AND break_end_time IS NOT NULL THEN
    break_minutes := EXTRACT(EPOCH FROM (break_end_time - break_start_time)) / 60;
    total_minutes := total_minutes - break_minutes;
  END IF;

  -- Retornar em horas (com 2 casas decimais)
  RETURN ROUND(total_minutes / 60.0, 2);
END;
$$ LANGUAGE plpgsql;

-- Função para buscar solicitações pendentes de aprovação
CREATE OR REPLACE FUNCTION get_pending_approvals(
  p_manager_id UUID DEFAULT NULL
)
RETURNS TABLE (
  request_id UUID,
  code VARCHAR,
  extra_name VARCHAR,
  sector_name VARCHAR,
  leader_name VARCHAR,
  work_dates DATE[],
  total_value DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.code,
    er.extra_name,
    s.name,
    er.leader_name,
    ARRAY_AGG(wd.work_date ORDER BY wd.work_date) AS dates,
    SUM(er.value) AS value,
    er.created_at
  FROM extra_requests er
  JOIN sectors s ON er.sector_id = s.id
  JOIN work_days wd ON wd.request_id = er.id
  WHERE er.status = 'SOLICITADO'
    AND (p_manager_id IS NULL OR er.sector_id IN (
      SELECT sector_id FROM user_sectors WHERE user_id = p_manager_id
    ))
  GROUP BY er.id, er.code, er.extra_name, s.name, er.leader_name, er.created_at
  ORDER BY er.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar resumo de ponto do dia
CREATE OR REPLACE FUNCTION get_daily_time_summary(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_extras INTEGER,
  com_ponto_completo INTEGER,
  em_andamento INTEGER,
  pendentes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT er.id)::INTEGER AS total,
    COUNT(DISTINCT er.id) FILTER (
      WHERE tr.arrival IS NOT NULL AND tr.departure IS NOT NULL
    )::INTEGER AS completos,
    COUNT(DISTINCT er.id) FILTER (
      WHERE tr.arrival IS NOT NULL AND tr.departure IS NULL
    )::INTEGER AS em_andamento,
    COUNT(DISTINCT er.id) FILTER (
      WHERE tr.arrival IS NULL
    )::INTEGER AS pendentes
  FROM extra_requests er
  JOIN work_days wd ON wd.request_id = er.id
  LEFT JOIN time_records tr ON tr.work_day_id = wd.id
  WHERE er.status = 'APROVADO'
    AND wd.work_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. VIEWS ADICIONAIS ÚTEIS
-- ============================================

-- View para relatório de ponto mensal
CREATE OR REPLACE VIEW vw_monthly_time_report AS
SELECT 
  DATE_TRUNC('month', wd.work_date) AS mes,
  s.name AS setor,
  er.extra_name,
  COUNT(*) AS dias_trabalhados,
  COUNT(tr.id) AS dias_com_ponto,
  SUM(calculate_work_hours(tr.arrival, tr.departure, tr.break_start, tr.break_end)) AS total_horas
FROM extra_requests er
JOIN sectors s ON er.sector_id = s.id
JOIN work_days wd ON wd.request_id = er.id
LEFT JOIN time_records tr ON tr.work_day_id = wd.id
WHERE er.status = 'APROVADO'
GROUP BY DATE_TRUNC('month', wd.work_date), s.name, er.extra_name;

-- View para dashboard gerencial
CREATE OR REPLACE VIEW vw_dashboard_stats AS
SELECT 
  DATE_TRUNC('day', wd.work_date) AS data,
  COUNT(DISTINCT er.id) AS total_solicitacoes,
  COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'APROVADO') AS aprovadas,
  COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'SOLICITADO') AS pendentes,
  COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'REPROVADO') AS reprovadas,
  COUNT(DISTINCT er.sector_id) AS setores_envolvidos,
  SUM(er.value) FILTER (WHERE er.status = 'APROVADO') AS valor_total
FROM extra_requests er
JOIN work_days wd ON wd.request_id = er.id
GROUP BY DATE_TRUNC('day', wd.work_date)
ORDER BY data DESC;

-- ============================================
-- 4. TRIGGERS ADICIONAIS
-- ============================================

-- Trigger para atualizar status quando todos os dias de trabalho tiverem ponto completo
CREATE OR REPLACE FUNCTION check_complete_time_records()
RETURNS TRIGGER AS $$
DECLARE
  total_days INTEGER;
  days_with_complete_time INTEGER;
BEGIN
  -- Contar dias de trabalho da solicitação
  SELECT COUNT(*), COUNT(*) FILTER (WHERE tr.arrival IS NOT NULL AND tr.departure IS NOT NULL)
  INTO total_days, days_with_complete_time
  FROM work_days wd
  LEFT JOIN time_records tr ON tr.work_day_id = wd.id
  WHERE wd.request_id = (
    SELECT request_id FROM work_days WHERE id = NEW.work_day_id
  );

  -- Se todos os dias tiverem ponto completo, pode adicionar flag ou notificação
  -- Por enquanto, apenas log (você pode adicionar lógica aqui)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_time_record_update
  AFTER INSERT OR UPDATE ON time_records
  FOR EACH ROW
  EXECUTE FUNCTION check_complete_time_records();

-- ============================================
-- 5. ÍNDICES ADICIONAIS (se necessário)
-- ============================================

-- Índice composto para busca de solicitações por status e data
CREATE INDEX IF NOT EXISTS idx_requests_status_date 
ON extra_requests(status, created_at);

-- Índice para busca de work_days por data e turno
CREATE INDEX IF NOT EXISTS idx_work_days_date_shift 
ON work_days(work_date, shift);

-- ============================================
-- 6. QUERIES DE MANUTENÇÃO
-- ============================================

-- Limpar solicitações antigas (mais de 1 ano)
-- DELETE FROM extra_requests 
-- WHERE created_at < NOW() - INTERVAL '1 year'
--   AND status IN ('CANCELADO', 'REPROVADO');

-- Atualizar estatísticas (se usar tabela de estatísticas)
-- ANALYZE extra_requests;
-- ANALYZE work_days;
-- ANALYZE time_records;

-- ============================================
-- FIM DAS QUERIES ÚTEIS
-- ============================================
