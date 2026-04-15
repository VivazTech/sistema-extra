-- Siglas e descrições customizadas para a escala mensal
CREATE TABLE IF NOT EXISTS public.escala_legends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT escala_legends_code_check CHECK (char_length(trim(code)) BETWEEN 1 AND 6),
  CONSTRAINT escala_legends_label_check CHECK (char_length(trim(label)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_escala_legends_code_active
  ON public.escala_legends ((lower(trim(code))))
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_escala_legends_active
  ON public.escala_legends (active);

-- Trigger updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_escala_legends_updated_at ON public.escala_legends;
    CREATE TRIGGER update_escala_legends_updated_at
      BEFORE UPDATE ON public.escala_legends
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.escala_legends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Escala legends are viewable by authenticated users" ON public.escala_legends;
CREATE POLICY "Escala legends are viewable by authenticated users"
  ON public.escala_legends FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Escala legends are modifiable by authenticated users" ON public.escala_legends;
CREATE POLICY "Escala legends are modifiable by authenticated users"
  ON public.escala_legends FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seeds padrão (idempotente)
INSERT INTO public.escala_legends (code, label, active)
VALUES
  ('P', 'Plantão', true),
  ('Ai', 'Afastamento INSS', true),
  ('Lm', 'Licença Maternidade', true),
  ('Fe', 'Feriado', true),
  ('Fr', 'Férias', true),
  ('F', 'Folga', true)
ON CONFLICT DO NOTHING;
