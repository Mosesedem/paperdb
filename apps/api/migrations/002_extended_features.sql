-- PaperDB Extended Schema Migration
-- Adds tables for webhooks, cron jobs, file storage, audit logs, and more

-- ============================================
-- API Keys Enhancement (add public/secret key types)
-- ============================================
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_type VARCHAR(10) DEFAULT 'secret' CHECK (key_type IN ('public', 'secret'));
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"read": true, "write": true, "delete": true}'::jsonb;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_collections TEXT[] DEFAULT NULL; -- NULL means all collections
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT NULL;

-- ============================================
-- Webhooks
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- e.g., ['document.created', 'document.updated']
    collections TEXT[] DEFAULT NULL, -- NULL means all collections, or ['*']
    secret VARCHAR(64) NOT NULL, -- HMAC signing secret
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    headers JSONB DEFAULT '{}'::jsonb, -- Custom headers to send
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_database ON webhooks(database_id);
CREATE INDEX idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = true;

-- Webhook Deliveries (delivery attempts and logs)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(21) PRIMARY KEY,
    webhook_id VARCHAR(21) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    status_code INTEGER,
    response TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending';

-- Incoming Webhook Endpoints (for receiving external webhooks)
CREATE TABLE IF NOT EXISTS incoming_webhooks (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    endpoint_path VARCHAR(100) NOT NULL, -- e.g., 'stripe-payments'
    secret VARCHAR(64), -- For signature verification
    actions JSONB NOT NULL, -- What to do when webhook is received
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, endpoint_path)
);

-- ============================================
-- Cron Jobs
-- ============================================
CREATE TABLE IF NOT EXISTS cron_jobs (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schedule VARCHAR(100) NOT NULL, -- Human-readable or cron expression
    cron_expression VARCHAR(100) NOT NULL, -- Normalized cron expression
    timezone VARCHAR(50) DEFAULT 'UTC',
    action JSONB NOT NULL, -- What to execute
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(20), -- 'success', 'failed'
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cron_jobs_database ON cron_jobs(database_id);
CREATE INDEX idx_cron_jobs_next_run ON cron_jobs(next_run_at) WHERE enabled = true;

-- Cron Job Runs (execution history)
CREATE TABLE IF NOT EXISTS cron_runs (
    id VARCHAR(21) PRIMARY KEY,
    cron_job_id VARCHAR(21) NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    result JSONB,
    error TEXT,
    logs TEXT[]
);

CREATE INDEX idx_cron_runs_job ON cron_runs(cron_job_id);
CREATE INDEX idx_cron_runs_started ON cron_runs(started_at);

-- ============================================
-- File Storage
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    path TEXT NOT NULL, -- Storage path
    url TEXT NOT NULL, -- Direct access URL
    cdn_url TEXT, -- CDN URL for optimized delivery
    folder VARCHAR(500) DEFAULT '/',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    checksum VARCHAR(64), -- SHA-256 hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_database ON files(database_id);
CREATE INDEX idx_files_folder ON files(database_id, folder);
CREATE INDEX idx_files_public ON files(is_public) WHERE is_public = true;

-- ============================================
-- Audit Logs
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    collection VARCHAR(100) NOT NULL,
    document_id VARCHAR(21) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    user_id VARCHAR(21), -- Who made the change (if authenticated)
    api_key_id VARCHAR(21), -- Which API key was used
    before_data JSONB, -- Previous state (for updates/deletes)
    after_data JSONB, -- New state (for inserts/updates)
    changes JSONB, -- Computed diff for updates
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_database ON audit_logs(database_id);
CREATE INDEX idx_audit_logs_document ON audit_logs(database_id, collection, document_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- Backups
-- ============================================
CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'manual' CHECK (type IN ('manual', 'automatic', 'scheduled')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    size_bytes BIGINT,
    storage_path TEXT,
    collections TEXT[], -- NULL means all collections
    document_count INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- For automatic cleanup
    error TEXT,
    created_by VARCHAR(21) -- User who triggered the backup
);

CREATE INDEX idx_backups_database ON backups(database_id);
CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_expires ON backups(expires_at);

-- ============================================
-- Team Collaboration
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    user_id VARCHAR(21) NOT NULL,
    email VARCHAR(255) NOT NULL, -- For pending invites
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    invited_by VARCHAR(21),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(database_id, email)
);

CREATE INDEX idx_team_members_database ON team_members(database_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);

-- ============================================
-- Environments (dev/staging/prod)
-- ============================================
CREATE TABLE IF NOT EXISTS environments (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- 'development', 'staging', 'production'
    is_default BOOLEAN DEFAULT false,
    cloned_from VARCHAR(21) REFERENCES environments(id),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, name)
);

-- ============================================
-- Edge Functions
-- ============================================
CREATE TABLE IF NOT EXISTS edge_functions (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code TEXT NOT NULL, -- TypeScript/JavaScript code
    runtime VARCHAR(20) DEFAULT 'v8' CHECK (runtime IN ('v8', 'node')),
    triggers JSONB NOT NULL, -- What triggers the function
    environment_variables JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, name)
);

-- ============================================
-- SDK Auth Sessions (for end-user authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS sdk_users (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar TEXT,
    role VARCHAR(50) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, email)
);

CREATE INDEX idx_sdk_users_database ON sdk_users(database_id);
CREATE INDEX idx_sdk_users_email ON sdk_users(database_id, email);

CREATE TABLE IF NOT EXISTS sdk_sessions (
    id VARCHAR(21) PRIMARY KEY,
    user_id VARCHAR(21) NOT NULL REFERENCES sdk_users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sdk_sessions_user ON sdk_sessions(user_id);
CREATE INDEX idx_sdk_sessions_token ON sdk_sessions(token);
CREATE INDEX idx_sdk_sessions_expires ON sdk_sessions(expires_at);

-- OAuth accounts for SDK users
CREATE TABLE IF NOT EXISTS sdk_oauth_accounts (
    id VARCHAR(21) PRIMARY KEY,
    user_id VARCHAR(21) NOT NULL REFERENCES sdk_users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'apple'
    provider_account_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
);

-- ============================================
-- Search Indexes
-- ============================================
CREATE TABLE IF NOT EXISTS search_indexes (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    collection VARCHAR(100) NOT NULL,
    fields TEXT[] NOT NULL, -- Fields to index for search
    status VARCHAR(20) DEFAULT 'building' CHECK (status IN ('building', 'ready', 'error')),
    document_count INTEGER DEFAULT 0,
    last_indexed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, collection)
);

-- ============================================
-- Analytics Events
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR(21) PRIMARY KEY,
    database_id VARCHAR(21) NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'api_request', 'auth', 'storage', etc.
    collection VARCHAR(100),
    operation VARCHAR(20), -- 'read', 'write', 'delete'
    count INTEGER DEFAULT 1,
    duration_ms INTEGER,
    error BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partitioning for analytics (by date for efficient queries)
CREATE INDEX idx_analytics_database_date ON analytics_events(database_id, created_at);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type, created_at);

-- ============================================
-- Update triggers for updated_at columns
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;
