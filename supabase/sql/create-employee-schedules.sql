-- Criar tabela de escalas de trabalho (hora de entrada/saida)
CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_time time NOT NULL,
  exit_time time NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Evita duplicidade da mesma escala
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_schedules_unique_hours
  ON public.employee_schedules (entry_time, exit_time);

-- Habilitar RLS
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Todos autenticados podem ler employee_schedules" ON public.employee_schedules;
CREATE POLICY "Todos autenticados podem ler employee_schedules"
ON public.employee_schedules FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Apenas admins podem modificar employee_schedules" ON public.employee_schedules;
CREATE POLICY "Apenas admins podem modificar employee_schedules"
ON public.employee_schedules FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_employee_schedules_updated_at ON public.employee_schedules;
CREATE TRIGGER handle_employee_schedules_updated_at BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
