-- Up Migration
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Down Migration
-- Extensions are left in place; dropping them would break dependents.
SELECT 1;
