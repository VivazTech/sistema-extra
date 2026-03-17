-- Criar tabela de funcionários registrados (para escala)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Todos autenticados podem ler employees" 
ON public.employees FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem modificar employees" 
ON public.employees FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_employees_updated_at ON public.employees;
CREATE TRIGGER handle_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
