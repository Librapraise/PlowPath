-- Up Migration

-- 1. Create enum for sign status if it doesn't exist
CREATE TYPE customer_sign_status AS ENUM ('installed', 'removed', 'needs_service');

-- 2. Convert sign_status column on customers table to use the new enum
ALTER TABLE customers ALTER COLUMN sign_status DROP DEFAULT;
ALTER TABLE customers ALTER COLUMN sign_status TYPE customer_sign_status USING sign_status::customer_sign_status;
ALTER TABLE customers ALTER COLUMN sign_status SET DEFAULT 'removed';

-- 3. Add outstanding_balance to customers table
ALTER TABLE customers ADD COLUMN outstanding_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- 4. Create enum for payment method
CREATE TYPE payment_method AS ENUM ('cash', 'check', 'card', 'ach', 'other');

-- 5. Create payment_records table
CREATE TABLE payment_records (
  payment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method      payment_method NOT NULL DEFAULT 'cash',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Add index for fast chronological customer lookup
CREATE INDEX idx_payment_records_customer_paid ON payment_records (customer_id, paid_at DESC);

-- Down Migration
DROP INDEX IF EXISTS idx_payment_records_customer_paid;
DROP TABLE IF EXISTS payment_records;
DROP TYPE IF EXISTS payment_method;
ALTER TABLE customers DROP COLUMN IF EXISTS outstanding_balance;
ALTER TABLE customers ALTER COLUMN sign_status DROP DEFAULT;
ALTER TABLE customers ALTER COLUMN sign_status TYPE VARCHAR(32) USING sign_status::VARCHAR(32);
ALTER TABLE customers ALTER COLUMN sign_status SET DEFAULT 'removed';
DROP TYPE IF EXISTS customer_sign_status;
