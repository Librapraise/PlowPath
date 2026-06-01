-- Up Migration

-- 1. Add org_id to core tables for multi-tenancy support
ALTER TABLE users ADD COLUMN org_id UUID REFERENCES organization_settings(settings_id) ON DELETE SET NULL;
ALTER TABLE drivers ADD COLUMN org_id UUID REFERENCES organization_settings(settings_id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN org_id UUID REFERENCES organization_settings(settings_id) ON DELETE SET NULL;
ALTER TABLE routes ADD COLUMN org_id UUID REFERENCES organization_settings(settings_id) ON DELETE SET NULL;

-- 2. Populate org_id for existing records from the default organization settings row
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  SELECT settings_id INTO default_org_id FROM organization_settings LIMIT 1;
  IF default_org_id IS NOT NULL THEN
    UPDATE users SET org_id = default_org_id WHERE org_id IS NULL;
    UPDATE drivers SET org_id = default_org_id WHERE org_id IS NULL;
    UPDATE customers SET org_id = default_org_id WHERE org_id IS NULL;
    UPDATE routes SET org_id = default_org_id WHERE org_id IS NULL;
  END IF;
END $$;

-- 3. Create driver_shifts table
CREATE TABLE driver_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization_settings(settings_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  break_duration_seconds INTEGER DEFAULT 0,
  cumulative_active_seconds INTEGER DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_break', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Create driver_shift_heartbeats table
CREATE TABLE driver_shift_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES driver_shifts(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_moving BOOLEAN NOT NULL DEFAULT FALSE,
  battery_level NUMERIC(3, 2),
  gps_coordinates GEOGRAPHY NOT NULL
);

-- 5. Create subcontract_offers table
CREATE TABLE subcontract_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_org_id UUID NOT NULL REFERENCES organization_settings(settings_id) ON DELETE CASCADE,
  target_org_id UUID REFERENCES organization_settings(settings_id) ON DELETE CASCADE,
  offered_payout NUMERIC(10, 2) NOT NULL CHECK (offered_payout > 0.00),
  status VARCHAR(30) NOT NULL DEFAULT 'broadcasted' CHECK (status IN ('draft', 'broadcasted', 'accepted', 'completed', 'cancelled', 'escalated')),
  escrow_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. Create subcontract_stops table
CREATE TABLE subcontract_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES subcontract_offers(id) ON DELETE CASCADE,
  route_stop_id UUID NOT NULL REFERENCES route_stops(stop_id) ON DELETE CASCADE,
  accepted_by_org_id UUID REFERENCES organization_settings(settings_id) ON DELETE CASCADE,
  assigned_driver_id UUID REFERENCES drivers(driver_id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  proof_photo_url VARCHAR(512),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 7. Performance & Geo Indexing
CREATE INDEX idx_driver_shifts_active ON driver_shifts(driver_id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_shift_heartbeats_time ON driver_shift_heartbeats(shift_id, recorded_at DESC);
CREATE INDEX idx_subcontract_offers_origin ON subcontract_offers(origin_org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subcontract_stops_offer ON subcontract_stops(offer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subcontract_stops_stop ON subcontract_stops(route_stop_id) WHERE deleted_at IS NULL;

-- 8. Enable PostgreSQL Row-Level Security
ALTER TABLE subcontract_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontract_stops ENABLE ROW LEVEL SECURITY;

-- 9. Row-Level Security Policies
CREATE POLICY select_subcontract_offers ON subcontract_offers
    FOR SELECT
    USING (
        origin_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID 
        OR target_org_id IS NULL 
        OR target_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID
    );

CREATE POLICY modify_subcontract_offers ON subcontract_offers
    FOR ALL
    USING (origin_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID);

CREATE POLICY select_subcontract_stops ON subcontract_stops
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM subcontract_offers o 
            WHERE o.id = offer_id 
              AND (o.origin_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID 
                   OR o.target_org_id IS NULL 
                   OR o.target_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID)
        )
    );

CREATE POLICY modify_subcontract_stops ON subcontract_stops
    FOR ALL
    USING (
        accepted_by_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID
        OR EXISTS (
            SELECT 1 FROM subcontract_offers o 
            WHERE o.id = offer_id 
              AND o.origin_org_id = COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID
        )
    );

-- Down Migration
DROP INDEX IF EXISTS idx_driver_shifts_active;
DROP INDEX IF EXISTS idx_shift_heartbeats_time;
DROP INDEX IF EXISTS idx_subcontract_offers_origin;
DROP INDEX IF EXISTS idx_subcontract_stops_offer;
DROP INDEX IF EXISTS idx_subcontract_stops_stop;

ALTER TABLE subcontract_stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE subcontract_offers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_subcontract_offers ON subcontract_offers;
DROP POLICY IF EXISTS modify_subcontract_offers ON subcontract_offers;
DROP POLICY IF EXISTS select_subcontract_stops ON subcontract_stops;
DROP POLICY IF EXISTS modify_subcontract_stops ON subcontract_stops;

DROP TABLE IF EXISTS subcontract_stops;
DROP TABLE IF EXISTS subcontract_offers;
DROP TABLE IF EXISTS driver_shift_heartbeats;
DROP TABLE IF EXISTS driver_shifts;

ALTER TABLE users DROP COLUMN IF EXISTS org_id;
ALTER TABLE drivers DROP COLUMN IF EXISTS org_id;
ALTER TABLE customers DROP COLUMN IF EXISTS org_id;
ALTER TABLE routes DROP COLUMN IF EXISTS org_id;
