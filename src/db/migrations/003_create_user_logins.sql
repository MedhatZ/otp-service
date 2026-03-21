-- Login audit trail (optional metadata from client on verify)

CREATE TABLE IF NOT EXISTS user_logins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins (user_id);
CREATE INDEX IF NOT EXISTS idx_user_logins_created_at ON user_logins (created_at);
