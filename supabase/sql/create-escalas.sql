-- Tabela de escalas de serviço
CREATE TABLE IF NOT EXISTS public.escalas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month integer NOT NULL,
  year integer NOT NULL,
  sector text NOT NULL,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(month, year, sector)
);

-- Habilitar RLS
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins podem ler tudo" 
ON public.escalas FOR SELECT 
USING (true);

CREATE POLICY "Admins podem modificar tudo" 
ON public.escalas FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.escalas;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.escalas
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Adicionar permissões role_access (se necessário)
-- Já será lidado pelo frontend (mapeamento de `actions`/`pages`), mas garante acesso ao ADMIN
