-- Up Migration
CREATE TABLE gps_tracking (
  tracking_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
  route_id     UUID REFERENCES routes(route_id) ON DELETE SET NULL,
  location     GEOGRAPHY NOT NULL,
  accuracy_m   NUMERIC(8,2),
  speed_mps    NUMERIC(8,2),
  heading_deg  NUMERIC(6,2),
  recorded_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gps_driver_time ON gps_tracking (driver_id, recorded_at DESC);
CREATE INDEX idx_gps_location    ON gps_tracking (location);

-- Down Migration
DROP TABLE IF EXISTS gps_tracking;
