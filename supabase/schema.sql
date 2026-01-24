-- ============================================
-- SISTEMA DE CONTROLE DE EXTRAS - VIVAZ CATARATAS
-- Schema completo para Supabase
-- ============================================

-- ============================================
-- 1. EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'LEADER', 'VIEWER');
CREATE TYPE request_status AS ENUM ('SOLICITADO', 'APROVADO', 'REPROVADO', 'CANCELADO');
CREATE TYPE shift_type AS ENUM ('Manhã', 'Tarde', 'Noite', 'Madrugada');

-- ============================================
-- 3. TABELAS PRINCIPAIS
-- ============================================

-- Usuários do Sistema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Para autenticação futura
  role user_role NOT NULL DEFAULT 'VIEWER',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setores
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funções/Cargos por Setor
CREATE TABLE sector_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  role_name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sector_id, role_name)
);

-- Relação Usuário-Setor (para Managers)
CREATE TABLE user_sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sector_id)
);

-- Solicitantes
CREATE TABLE requesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Motivos de Solicitação
CREATE TABLE reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banco de Extras (Funcionários Extras Cadastrados)
CREATE TABLE extra_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  birth_date DATE,
  cpf VARCHAR(14) UNIQUE,
  contact VARCHAR(100),
  address TEXT,
  emergency_contact VARCHAR(255),
  sector_id UUID REFERENCES sectors(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solicitações de Extras
CREATE TABLE extra_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- EXT-2024-0001
  sector_id UUID NOT NULL REFERENCES sectors(id),
  role_name VARCHAR(255) NOT NULL,
  leader_id UUID NOT NULL REFERENCES users(id),
  leader_name VARCHAR(255) NOT NULL,
  requester_id UUID REFERENCES requesters(id),
  requester_name VARCHAR(255) NOT NULL,
  reason_id UUID REFERENCES reasons(id),
  reason_name VARCHAR(255) NOT NULL,
  extra_name VARCHAR(255) NOT NULL,
  extra_person_id UUID REFERENCES extra_persons(id),
  value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status request_status NOT NULL DEFAULT 'SOLICITADO',
  needs_manager_approval BOOLEAN DEFAULT false,
  urgency BOOLEAN DEFAULT false,
  observations TEXT,
  contact VARCHAR(100),
  rejection_reason TEXT,
  cancellation_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dias de Trabalho (relacionado com solicitações)
CREATE TABLE work_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES extra_requests(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  shift shift_type NOT NULL,
  value DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, work_date)
);

-- Registros de Ponto (Time Records)
CREATE TABLE time_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_day_id UUID NOT NULL REFERENCES work_days(id) ON DELETE CASCADE,
  arrival TIME,
  break_start TIME,
  break_end TIME,
  departure TIME,
  photo_url TEXT,
  registered_by UUID REFERENCES users(id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_day_id)
);

-- Saldo de Extras - Registros
CREATE TABLE extra_saldo_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_id UUID NOT NULL REFERENCES sectors(id),
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  quadro_aprovado INTEGER NOT NULL DEFAULT 0,
  quadro_efetivo INTEGER NOT NULL DEFAULT 0,
  folgas INTEGER NOT NULL DEFAULT 0,
  domingos INTEGER NOT NULL DEFAULT 0,
  demanda INTEGER NOT NULL DEFAULT 0,
  atestado INTEGER NOT NULL DEFAULT 0,
  extras_solicitados INTEGER NOT NULL DEFAULT 0,
  valor_diaria_snapshot DECIMAL(10, 2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (periodo_fim >= periodo_inicio)
);

-- Configurações de Saldo de Extras
CREATE TABLE extra_saldo_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valor_diaria DECIMAL(10, 2) NOT NULL DEFAULT 130.00,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);

-- Sectors
CREATE INDEX idx_sectors_name ON sectors(name);
CREATE INDEX idx_sectors_active ON sectors(active);

-- Sector Roles
CREATE INDEX idx_sector_roles_sector ON sector_roles(sector_id);

-- User Sectors
CREATE INDEX idx_user_sectors_user ON user_sectors(user_id);
CREATE INDEX idx_user_sectors_sector ON user_sectors(sector_id);

-- Extra Requests
CREATE INDEX idx_extra_requests_code ON extra_requests(code);
CREATE INDEX idx_extra_requests_status ON extra_requests(status);
CREATE INDEX idx_extra_requests_sector ON extra_requests(sector_id);
CREATE INDEX idx_extra_requests_leader ON extra_requests(leader_id);
CREATE INDEX idx_extra_requests_created ON extra_requests(created_at);
CREATE INDEX idx_extra_requests_approved ON extra_requests(approved_at);

-- Work Days
CREATE INDEX idx_work_days_request ON work_days(request_id);
CREATE INDEX idx_work_days_date ON work_days(work_date);
CREATE INDEX idx_work_days_date_shift ON work_days(work_date, shift);

-- Time Records
CREATE INDEX idx_time_records_work_day ON time_records(work_day_id);
CREATE INDEX idx_time_records_registered ON time_records(registered_at);

-- Extra Persons
CREATE INDEX idx_extra_persons_cpf ON extra_persons(cpf);
CREATE INDEX idx_extra_persons_sector ON extra_persons(sector_id);
CREATE INDEX idx_extra_persons_active ON extra_persons(active);

-- Extra Saldo Records
CREATE INDEX idx_saldo_records_sector ON extra_saldo_records(sector_id);
CREATE INDEX idx_saldo_records_periodo ON extra_saldo_records(periodo_inicio, periodo_fim);

-- ============================================
-- 5. FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requesters_updated_at BEFORE UPDATE ON requesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reasons_updated_at BEFORE UPDATE ON reasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extra_persons_updated_at BEFORE UPDATE ON extra_persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extra_requests_updated_at BEFORE UPDATE ON extra_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_records_updated_at BEFORE UPDATE ON time_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extra_saldo_records_updated_at BEFORE UPDATE ON extra_saldo_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extra_saldo_settings_updated_at BEFORE UPDATE ON extra_saldo_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar código único de solicitação
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER AS $$
DECLARE
  year_num INTEGER;
  seq_num INTEGER;
  new_code VARCHAR(50);
BEGIN
  year_num := EXTRACT(YEAR FROM NOW());
  
  -- Buscar o último número de sequência do ano
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'EXT-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM extra_requests
  WHERE code LIKE 'EXT-' || year_num || '-%';
  
  new_code := 'EXT-' || year_num || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.code := new_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente
CREATE TRIGGER generate_extra_request_code
  BEFORE INSERT ON extra_requests
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION generate_request_code();

-- ============================================
-- 6. DADOS INICIAIS (SEEDS)
-- ============================================

-- Inserir Setores
INSERT INTO sectors (id, name) VALUES
  (gen_random_uuid(), 'Restaurante'),
  (gen_random_uuid(), 'Governança'),
  (gen_random_uuid(), 'Recepção'),
  (gen_random_uuid(), 'Lazer'),
  (gen_random_uuid(), 'Manutenção')
ON CONFLICT (name) DO NOTHING;

-- Inserir Funções por Setor
DO $$
DECLARE
  restaurante_id UUID;
  governanca_id UUID;
  recepcao_id UUID;
  lazer_id UUID;
  manutencao_id UUID;
BEGIN
  SELECT id INTO restaurante_id FROM sectors WHERE name = 'Restaurante';
  SELECT id INTO governanca_id FROM sectors WHERE name = 'Governança';
  SELECT id INTO recepcao_id FROM sectors WHERE name = 'Recepção';
  SELECT id INTO lazer_id FROM sectors WHERE name = 'Lazer';
  SELECT id INTO manutencao_id FROM sectors WHERE name = 'Manutenção';

  -- Restaurante
  INSERT INTO sector_roles (sector_id, role_name) VALUES
    (restaurante_id, 'Garçom'),
    (restaurante_id, 'Cambuzeiro'),
    (restaurante_id, 'Stuart'),
    (restaurante_id, 'Cozinheiro'),
    (restaurante_id, 'Hostess')
  ON CONFLICT (sector_id, role_name) DO NOTHING;

  -- Governança
  INSERT INTO sector_roles (sector_id, role_name) VALUES
    (governanca_id, 'Camareira'),
    (governanca_id, 'Auxiliar de Limpeza'),
    (governanca_id, 'Governanta')
  ON CONFLICT (sector_id, role_name) DO NOTHING;

  -- Recepção
  INSERT INTO sector_roles (sector_id, role_name) VALUES
    (recepcao_id, 'Recepcionista'),
    (recepcao_id, 'Mensageiro'),
    (recepcao_id, 'Capitão Porteiro')
  ON CONFLICT (sector_id, role_name) DO NOTHING;

  -- Lazer
  INSERT INTO sector_roles (sector_id, role_name) VALUES
    (lazer_id, 'Monitor'),
    (lazer_id, 'Guarda-vidas')
  ON CONFLICT (sector_id, role_name) DO NOTHING;

  -- Manutenção
  INSERT INTO sector_roles (sector_id, role_name) VALUES
    (manutencao_id, 'Oficial de Manutenção'),
    (manutencao_id, 'Piscineiro')
  ON CONFLICT (sector_id, role_name) DO NOTHING;
END $$;

-- Inserir Usuários Iniciais
INSERT INTO users (id, name, username, role) VALUES
  (gen_random_uuid(), 'Admin Vivaz', 'admin', 'ADMIN'),
  (gen_random_uuid(), 'Carlos Gerente', 'gerente', 'MANAGER'),
  (gen_random_uuid(), 'Ana Líder', 'lider', 'LEADER'),
  (gen_random_uuid(), 'Painel TV', 'tv', 'VIEWER')
ON CONFLICT (username) DO NOTHING;

-- Associar Gerente aos Setores
DO $$
DECLARE
  gerente_id UUID;
  restaurante_id UUID;
  governanca_id UUID;
BEGIN
  SELECT id INTO gerente_id FROM users WHERE username = 'gerente';
  SELECT id INTO restaurante_id FROM sectors WHERE name = 'Restaurante';
  SELECT id INTO governanca_id FROM sectors WHERE name = 'Governança';

  IF gerente_id IS NOT NULL THEN
    INSERT INTO user_sectors (user_id, sector_id) VALUES
      (gerente_id, restaurante_id),
      (gerente_id, governanca_id)
    ON CONFLICT (user_id, sector_id) DO NOTHING;
  END IF;
END $$;

-- Inserir Solicitantes
INSERT INTO requesters (name) VALUES
  ('RH'),
  ('Gestão'),
  ('Operação')
ON CONFLICT (name) DO NOTHING;

-- Inserir Motivos
INSERT INTO reasons (name) VALUES
  ('Reforço de equipe'),
  ('Cobertura de folga'),
  ('Evento/Alta demanda')
ON CONFLICT (name) DO NOTHING;

-- Inserir Configuração de Saldo
INSERT INTO extra_saldo_settings (valor_diaria) VALUES (130.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE requesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_saldo_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_saldo_settings ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir tudo para autenticados - ajustar conforme necessário)
-- Nota: Em produção, você deve criar políticas mais restritivas baseadas em roles

-- Users: Todos podem ver, apenas admins podem modificar
CREATE POLICY "Users are viewable by authenticated users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users are insertable by admins" ON users
  FOR INSERT WITH CHECK (true); -- Ajustar com auth.role() = 'ADMIN'

CREATE POLICY "Users are updatable by admins" ON users
  FOR UPDATE USING (true); -- Ajustar com auth.role() = 'ADMIN'

-- Sectors: Todos podem ver e modificar (ajustar conforme necessário)
CREATE POLICY "Sectors are viewable by authenticated users" ON sectors
  FOR SELECT USING (true);

CREATE POLICY "Sectors are modifiable by authenticated users" ON sectors
  FOR ALL USING (true);

-- Sector Roles: Todos podem ver e modificar
CREATE POLICY "Sector roles are viewable by authenticated users" ON sector_roles
  FOR SELECT USING (true);

CREATE POLICY "Sector roles are modifiable by authenticated users" ON sector_roles
  FOR ALL USING (true);

-- User Sectors: Todos podem ver e modificar
CREATE POLICY "User sectors are viewable by authenticated users" ON user_sectors
  FOR SELECT USING (true);

CREATE POLICY "User sectors are modifiable by authenticated users" ON user_sectors
  FOR ALL USING (true);

-- Requesters: Todos podem ver e modificar
CREATE POLICY "Requesters are viewable by authenticated users" ON requesters
  FOR SELECT USING (true);

CREATE POLICY "Requesters are modifiable by authenticated users" ON requesters
  FOR ALL USING (true);

-- Reasons: Todos podem ver e modificar
CREATE POLICY "Reasons are viewable by authenticated users" ON reasons
  FOR SELECT USING (true);

CREATE POLICY "Reasons are modifiable by authenticated users" ON reasons
  FOR ALL USING (true);

-- Extra Persons: Todos podem ver e modificar
CREATE POLICY "Extra persons are viewable by authenticated users" ON extra_persons
  FOR SELECT USING (true);

CREATE POLICY "Extra persons are modifiable by authenticated users" ON extra_persons
  FOR ALL USING (true);

-- Extra Requests: Todos podem ver, criar e modificar
CREATE POLICY "Extra requests are viewable by authenticated users" ON extra_requests
  FOR SELECT USING (true);

CREATE POLICY "Extra requests are insertable by authenticated users" ON extra_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Extra requests are updatable by authenticated users" ON extra_requests
  FOR UPDATE USING (true);

CREATE POLICY "Extra requests are deletable by authenticated users" ON extra_requests
  FOR DELETE USING (true);

-- Work Days: Todos podem ver e modificar
CREATE POLICY "Work days are viewable by authenticated users" ON work_days
  FOR SELECT USING (true);

CREATE POLICY "Work days are modifiable by authenticated users" ON work_days
  FOR ALL USING (true);

-- Time Records: Todos podem ver e modificar
CREATE POLICY "Time records are viewable by authenticated users" ON time_records
  FOR SELECT USING (true);

CREATE POLICY "Time records are modifiable by authenticated users" ON time_records
  FOR ALL USING (true);

-- Extra Saldo Records: Todos podem ver e modificar
CREATE POLICY "Extra saldo records are viewable by authenticated users" ON extra_saldo_records
  FOR SELECT USING (true);

CREATE POLICY "Extra saldo records are modifiable by authenticated users" ON extra_saldo_records
  FOR ALL USING (true);

-- Extra Saldo Settings: Todos podem ver, apenas admins podem modificar
CREATE POLICY "Extra saldo settings are viewable by authenticated users" ON extra_saldo_settings
  FOR SELECT USING (true);

CREATE POLICY "Extra saldo settings are modifiable by admins" ON extra_saldo_settings
  FOR ALL USING (true); -- Ajustar com auth.role() = 'ADMIN'

-- ============================================
-- 8. VIEWS ÚTEIS
-- ============================================

-- View para solicitações com informações completas
CREATE OR REPLACE VIEW vw_extra_requests_full AS
SELECT 
  er.id,
  er.code,
  er.status,
  er.extra_name,
  er.value,
  er.urgency,
  er.needs_manager_approval,
  er.observations,
  er.contact,
  er.rejection_reason,
  er.cancellation_reason,
  er.created_at,
  er.updated_at,
  er.approved_at,
  s.name AS sector_name,
  er.role_name,
  u_leader.name AS leader_name,
  u_leader.id AS leader_id,
  req.name AS requester_name,
  r.name AS reason_name,
  u_approved.name AS approved_by_name,
  u_created.name AS created_by_name
FROM extra_requests er
LEFT JOIN sectors s ON er.sector_id = s.id
LEFT JOIN users u_leader ON er.leader_id = u_leader.id
LEFT JOIN requesters req ON er.requester_id = req.id
LEFT JOIN reasons r ON er.reason_id = r.id
LEFT JOIN users u_approved ON er.approved_by = u_approved.id
LEFT JOIN users u_created ON er.created_by = u_created.id;

-- View para dias de trabalho com registros de ponto
CREATE OR REPLACE VIEW vw_work_days_with_time AS
SELECT 
  wd.id,
  wd.request_id,
  wd.work_date,
  wd.shift,
  wd.value,
  tr.arrival,
  tr.break_start,
  tr.break_end,
  tr.departure,
  tr.registered_at,
  u_registered.name AS registered_by_name
FROM work_days wd
LEFT JOIN time_records tr ON wd.id = tr.work_day_id
LEFT JOIN users u_registered ON tr.registered_by = u_registered.id;

-- ============================================
-- FIM DO SCHEMA
-- ============================================
