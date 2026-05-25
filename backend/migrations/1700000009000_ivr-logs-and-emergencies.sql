-- Up Migration
CREATE TABLE IF NOT EXISTS call_logs (
  call_log_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number        VARCHAR(32) NOT NULL,
  customer_id        UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  dtmf_pressed       VARCHAR(16),
  transcript_summary TEXT,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE urgent_status AS ENUM ('pending', 'assigned', 'declined_escalating', 'expired');

CREATE TABLE IF NOT EXISTS urgent_requests (
  request_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  storm_id           UUID NOT NULL REFERENCES storm_events(storm_id) ON DELETE CASCADE,
  status             urgent_status NOT NULL DEFAULT 'pending',
  assigned_driver_id UUID REFERENCES drivers(driver_id) ON DELETE SET NULL,
  attempt_started_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS pass_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE storm_events ADD COLUMN IF NOT EXISTS passes_count INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_call_logs_customer ON call_logs (customer_id);
CREATE INDEX idx_urgent_requests_status ON urgent_requests (status) WHERE status = 'pending';

-- Down Migration
DROP INDEX IF EXISTS idx_urgent_requests_status;
DROP INDEX IF EXISTS idx_call_logs_customer;
ALTER TABLE storm_events DROP COLUMN IF EXISTS passes_count;
ALTER TABLE route_stops DROP COLUMN IF EXISTS pass_number;
DROP TABLE IF EXISTS urgent_requests;
DROP TYPE IF EXISTS urgent_status;
DROP TABLE IF EXISTS call_logs;
