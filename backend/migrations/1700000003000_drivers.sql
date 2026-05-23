-- Up Migration
CREATE TYPE driver_status AS ENUM ('active', 'inactive');

CREATE TABLE drivers (
  driver_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(32)  NOT NULL,
  hourly_rate   NUMERIC(8,2),
  vehicle_type  VARCHAR(64),
  status        driver_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (user_id)
);

CREATE INDEX idx_drivers_active ON drivers (driver_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drivers_status ON drivers (status)    WHERE deleted_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS drivers;
DROP TYPE  IF EXISTS driver_status;
