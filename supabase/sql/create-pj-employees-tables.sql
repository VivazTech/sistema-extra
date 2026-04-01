-- Funcionários PJ (Portaria PJ) — cadastro mínimo: nome + setor
-- Registro de ponto diário sem vínculo com solicitações/valores de extras

CREATE TABLE IF NOT EXISTS public.pj_employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_time_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pj_employee_id uuid NOT NULL REFERENCES public.pj_employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  arrival text,
  break_start text,
  break_end text,
  departure text,
  registered_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  observations text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (pj_employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_pj_time_records_work_date ON public.pj_time_records(work_date);
CREATE INDEX IF NOT EXISTS idx_pj_time_records_employee ON public.pj_time_records(pj_employee_id);

ALTER TABLE public.pj_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_time_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem pj_employees" ON public.pj_employees;
CREATE POLICY "Autenticados leem pj_employees"
ON public.pj_employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados modificam pj_employees" ON public.pj_employees;
CREATE POLICY "Autenticados modificam pj_employees"
ON public.pj_employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados leem pj_time_records" ON public.pj_time_records;
CREATE POLICY "Autenticados leem pj_time_records"
ON public.pj_time_records FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados modificam pj_time_records" ON public.pj_time_records;
CREATE POLICY "Autenticados modificam pj_time_records"
ON public.pj_time_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS handle_pj_employees_updated_at ON public.pj_employees;
CREATE TRIGGER handle_pj_employees_updated_at BEFORE UPDATE ON public.pj_employees
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS handle_pj_time_records_updated_at ON public.pj_time_records;
CREATE TRIGGER handle_pj_time_records_updated_at BEFORE UPDATE ON public.pj_time_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.pj_employees IS 'Funcionários PJ — controle de ponto na Portaria PJ';
COMMENT ON TABLE public.pj_time_records IS 'Registro diário de horários (entrada, intervalo, saída) para PJ';
