-- Up Migration
CREATE TYPE customer_status     AS ENUM ('active', 'inactive', 'prospect');
CREATE TYPE customer_prop_type  AS ENUM ('residential', 'commercial');
CREATE TYPE customer_pay_status AS ENUM ('paid', 'pending', 'overdue');

CREATE TABLE customers (
  customer_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  address        TEXT NOT NULL,
  location       GEOGRAPHY,
  phone          VARCHAR(32),
  email          VARCHAR(255),
  status         customer_status     NOT NULL DEFAULT 'active',
  property_type  customer_prop_type  NOT NULL DEFAULT 'residential',
  payment_status customer_pay_status NOT NULL DEFAULT 'pending',
  driveway_type  VARCHAR(64),
  access_notes   TEXT,
  sign_status    VARCHAR(32) DEFAULT 'removed',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_customers_location ON customers (location);
CREATE INDEX idx_customers_active   ON customers (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_status   ON customers (status)      WHERE deleted_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS customers;
DROP TYPE  IF EXISTS customer_pay_status;
DROP TYPE  IF EXISTS customer_prop_type;
DROP TYPE  IF EXISTS customer_status;
