-- ============================
-- Adicionar metadados de escala
-- ============================
-- Colunas usadas pela tela:
-- Cadastros > Funcionários Registrados (Turno/Escala/Folga fixa)
-- e pela tela:
-- AdminEscala (pré-preenchimento)

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS turnos text;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS escala_time text;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS fixed_day_off integer DEFAULT -1;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS ferias_dates text[] DEFAULT '{}'::text[];

