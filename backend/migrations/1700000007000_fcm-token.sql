-- Up Migration
ALTER TABLE drivers ADD COLUMN fcm_token VARCHAR(255);
CREATE INDEX idx_drivers_fcm_token ON drivers (fcm_token) WHERE deleted_at IS NULL;

-- Down Migration
DROP INDEX IF EXISTS idx_drivers_fcm_token;
ALTER TABLE drivers DROP COLUMN fcm_token;
