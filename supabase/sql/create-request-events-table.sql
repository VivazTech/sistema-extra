-- Catálogo de eventos para seleção no motivo EVENTO.
CREATE TABLE IF NOT EXISTS request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_events_active ON request_events(active);
CREATE INDEX IF NOT EXISTS idx_request_events_name ON request_events(name);

CREATE TRIGGER update_request_events_updated_at
  BEFORE UPDATE ON request_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Request events are viewable by authenticated users" ON request_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Request events are modifiable by authenticated users" ON request_events
  FOR ALL USING (auth.role() = 'authenticated');
