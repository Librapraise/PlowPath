-- Up Migration
CREATE TYPE storm_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
CREATE TYPE route_status AS ENUM ('assigned', 'in_progress', 'completed');
CREATE TYPE stop_status  AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

CREATE TABLE storm_events (
  storm_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(255) NOT NULL,
  start_time              TIMESTAMPTZ,
  end_time                TIMESTAMPTZ,
  forecasted_accumulation NUMERIC(6,2),
  actual_accumulation     NUMERIC(6,2),
  status                  storm_status NOT NULL DEFAULT 'planned',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TABLE routes (
  route_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_id        UUID NOT NULL REFERENCES storm_events(storm_id) ON DELETE CASCADE,
  driver_id       UUID NOT NULL REFERENCES drivers(driver_id)     ON DELETE RESTRICT,
  route_name      VARCHAR(255) NOT NULL,
  status          route_status NOT NULL DEFAULT 'assigned',
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  total_distance  NUMERIC(10,2),
  -- Pre-computed OSRM geometry + instructions cached for offline mobile download.
  osrm_geometry   JSONB,
  osrm_steps      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_routes_storm  ON routes (storm_id);
CREATE INDEX idx_routes_driver ON routes (driver_id);
CREATE INDEX idx_routes_active ON routes (route_id) WHERE deleted_at IS NULL;

CREATE TABLE route_stops (
  stop_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id         UUID NOT NULL REFERENCES routes(route_id)       ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  sequence_number  INTEGER NOT NULL,
  status           stop_status NOT NULL DEFAULT 'pending',
  arrival_time     TIMESTAMPTZ,
  completion_time  TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route_id, sequence_number)
);

CREATE INDEX idx_route_stops_route  ON route_stops (route_id);
CREATE INDEX idx_route_stops_status ON route_stops (status);

-- Down Migration
DROP TABLE IF EXISTS route_stops;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS storm_events;
DROP TYPE  IF EXISTS stop_status;
DROP TYPE  IF EXISTS route_status;
DROP TYPE  IF EXISTS storm_status;
