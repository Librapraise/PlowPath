-- Up Migration

-- 1. Create organization_settings table
CREATE TABLE organization_settings (
  settings_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  VARCHAR(255) NOT NULL DEFAULT 'PlowPath',
  support_phone VARCHAR(50),
  support_email VARCHAR(255),
  settings      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial settings row
INSERT INTO organization_settings (company_name, support_phone, support_email, settings)
VALUES ('PlowPath', '+15551234567', 'support@plowpath.app', '{
  "storm_accumulation_threshold_inches": 2.0,
  "message_templates": {
    "sms_pre_storm": "Hi {{customer}}, a snow storm is approaching. We have scheduled service for {{address}}.",
    "sms_en_route": "Hi {{customer}}, our crew is en route to {{address}} and will arrive in approximately {{eta}}.",
    "sms_completed": "Hi {{customer}}, we have successfully completed snow removal at {{address}}."
  },
  "quiet_hours": {
    "enabled": true,
    "start": "22:00",
    "end": "06:00"
  },
  "geocoding_bounds": {
    "min_lat": 40.0,
    "min_lon": -80.0,
    "max_lat": 45.0,
    "max_lon": -70.0
  }
}'::jsonb);

-- 2. Add settings_json to drivers table
ALTER TABLE drivers ADD COLUMN settings_json JSONB NOT NULL DEFAULT '{
  "theme": "light",
  "navigation_app": "google_maps",
  "tracking_accuracy": "high",
  "upload_frequency_seconds": 30
}'::jsonb;

-- Down Migration
ALTER TABLE drivers DROP COLUMN IF EXISTS settings_json;
DROP TABLE IF EXISTS organization_settings;
