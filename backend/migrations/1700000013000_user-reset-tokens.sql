-- Up Migration
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_token_expires_at TIMESTAMPTZ;

-- Down Migration
ALTER TABLE users 
DROP COLUMN reset_token,
DROP COLUMN reset_token_expires_at;
