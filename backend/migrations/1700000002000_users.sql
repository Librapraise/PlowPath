-- Up Migration
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'driver');

CREATE TABLE users (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE,
  phone          VARCHAR(32)  UNIQUE,
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL DEFAULT 'driver',
  name           VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT users_identifier_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_users_active ON users (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role   ON users (role) WHERE deleted_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS users;
DROP TYPE  IF EXISTS user_role;
