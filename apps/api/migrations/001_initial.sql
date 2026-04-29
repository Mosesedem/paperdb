-- ============================================================
-- PaperDB Migration 001: Initial Base Schema
-- ============================================================
-- This is the canonical base schema. Run before 002_extended_features.sql.
-- All tables required for the platform to boot from a fresh database.

-- Migration tracking table (must exist before any other migration runs)
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT        NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Platform: Users and Databases (Control Plane)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              TEXT        PRIMARY KEY,
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT,
  name            TEXT,
  avatar          TEXT,
  role            TEXT        NOT NULL DEFAULT 'user',
  email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS databases (
  id          TEXT        PRIMARY KEY,
  owner_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  plan        TEXT        NOT NULL DEFAULT 'free',
  region      TEXT        NOT NULL DEFAULT 'us-east-1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, slug)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT        PRIMARY KEY,
  database_id TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  key_hash    TEXT        NOT NULL UNIQUE,
  key_prefix  TEXT        NOT NULL,
  name        TEXT        NOT NULL DEFAULT 'Default Key',
  permissions TEXT[]      NOT NULL DEFAULT '{"read","write"}',
  last_used   TIMESTAMPTZ,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Plan limits and usage metering
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_limits (
  plan            TEXT    PRIMARY KEY,
  max_databases   INT     NOT NULL DEFAULT 1,
  max_docs        BIGINT  NOT NULL DEFAULT 10000,
  max_storage_mb  INT     NOT NULL DEFAULT 100,
  max_api_calls   INT     NOT NULL DEFAULT 10000,
  realtime        BOOLEAN NOT NULL DEFAULT FALSE,
  webhooks        BOOLEAN NOT NULL DEFAULT FALSE,
  cron            BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO plan_limits (plan, max_databases, max_docs, max_storage_mb, max_api_calls, realtime, webhooks, cron)
VALUES
  ('free',  1,    10000,   100,   10000,  FALSE, FALSE, FALSE),
  ('pro',   10,   500000,  5120,  500000, TRUE,  TRUE,  TRUE),
  ('team',  50,   5000000, 51200, 5000000,TRUE,  TRUE,  TRUE)
ON CONFLICT (plan) DO NOTHING;

CREATE TABLE IF NOT EXISTS monthly_usage (
  id          SERIAL      PRIMARY KEY,
  database_id TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  month       TEXT        NOT NULL, -- format: YYYY-MM
  api_calls   BIGINT      NOT NULL DEFAULT 0,
  doc_writes  BIGINT      NOT NULL DEFAULT 0,
  storage_mb  NUMERIC     NOT NULL DEFAULT 0,
  UNIQUE (database_id, month)
);

-- ============================================================
-- SDK Auth: End-user authentication
-- ============================================================

CREATE TABLE IF NOT EXISTS sdk_users (
  id              TEXT        PRIMARY KEY,
  database_id     TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  password_hash   TEXT,
  name            TEXT,
  avatar          TEXT,
  role            TEXT        NOT NULL DEFAULT 'user',
  email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (database_id, email)
);

CREATE TABLE IF NOT EXISTS sdk_sessions (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES sdk_users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Core Data: Document Store
-- ============================================================

CREATE TABLE IF NOT EXISTS kv_store (
  id          TEXT        PRIMARY KEY,
  db_id       TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  collection  TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  value       JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (db_id, collection, key)
);

CREATE INDEX IF NOT EXISTS idx_kv_store_db_collection ON kv_store (db_id, collection);
CREATE INDEX IF NOT EXISTS idx_kv_store_created_at    ON kv_store (created_at DESC);

-- ============================================================
-- Schema Definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS collection_schema (
  id          TEXT        PRIMARY KEY,
  db_id       TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  collection  TEXT        NOT NULL,
  schema      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (db_id, collection)
);

-- ============================================================
-- Auto Indexes
-- ============================================================

CREATE TABLE IF NOT EXISTS auto_indexes (
  id          TEXT        PRIMARY KEY,
  db_id       TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  collection  TEXT        NOT NULL,
  field       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (db_id, collection, field)
);

-- ============================================================
-- Event Log
-- ============================================================

CREATE TABLE IF NOT EXISTS db_events (
  id          SERIAL      PRIMARY KEY,
  db_id       TEXT        NOT NULL,
  collection  TEXT,
  action      TEXT        NOT NULL,
  doc_id      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_events_db_id ON db_events (db_id, created_at DESC);

-- ============================================================
-- Webhooks
-- ============================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id          TEXT        PRIMARY KEY,
  database_id TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  events      TEXT[]      NOT NULL,
  collections TEXT[],
  secret      TEXT        NOT NULL,
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  description TEXT,
  headers     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              TEXT        PRIMARY KEY,
  webhook_id      TEXT        NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event           TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending',
  status_code     INT,
  response        TEXT,
  attempts        INT         NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries (webhook_id, created_at DESC);

-- ============================================================
-- Cron Jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_jobs (
  id              TEXT        PRIMARY KEY,
  database_id     TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  schedule        TEXT        NOT NULL,
  cron_expression TEXT        NOT NULL,
  timezone        TEXT        NOT NULL DEFAULT 'UTC',
  action          JSONB       NOT NULL,
  enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cron_runs (
  id          TEXT        PRIMARY KEY,
  cron_job_id TEXT        NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending',
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  result      JSONB,
  error       TEXT,
  logs        TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_id ON cron_runs (cron_job_id, started_at DESC);

-- ============================================================
-- Storage / Files
-- ============================================================

CREATE TABLE IF NOT EXISTS files (
  id            TEXT        PRIMARY KEY,
  database_id   TEXT        NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  original_name TEXT        NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT      NOT NULL DEFAULT 0,
  path          TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  cdn_url       TEXT,
  folder        TEXT        NOT NULL DEFAULT '/',
  metadata      JSONB       NOT NULL DEFAULT '{}',
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  checksum      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_database_id ON files (database_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_folder      ON files (database_id, folder);
