-- Add login tracking columns to users (idempotent when run via migration tooling)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;
