-- Criar tabela de funcionários registrados (para escala)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  -- Metadados para pré-configurar a escala (AdminEscala)
  turnos text, -- Ex.: "Manhã,Tarde,Noite" (lista separada por vírgula)
  escala_time text, -- Ex.: "07:00-15:20 / 08:00-16:20"
  fixed_day_off integer DEFAULT -1, -- 0=Domingo ... 6=Sábado, -1 = não configurado
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Todos autenticados podem ler employees" ON public.employees;
CREATE POLICY "Todos autenticados podem ler employees" 
ON public.employees FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Apenas admins podem modificar employees" ON public.employees;
CREATE POLICY "Apenas admins podem modificar employees" 
ON public.employees FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_employees_updated_at ON public.employees;
CREATE TRIGGER handle_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
