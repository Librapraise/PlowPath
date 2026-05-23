-- Up Migration
ALTER TABLE customers ADD COLUMN notify_sms BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN notify_voice BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN sms_opt_out_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN next_service_decision VARCHAR(32) DEFAULT NULL;

CREATE INDEX idx_customers_notify ON customers (notify_sms, notify_voice) WHERE deleted_at IS NULL;

-- Down Migration
DROP INDEX IF EXISTS idx_customers_notify;
ALTER TABLE customers DROP COLUMN notify_sms;
ALTER TABLE customers DROP COLUMN notify_voice;
ALTER TABLE customers DROP COLUMN sms_opt_out_at;
ALTER TABLE customers DROP COLUMN next_service_decision;
