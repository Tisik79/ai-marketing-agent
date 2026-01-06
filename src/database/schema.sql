-- AI Marketing Agent - Database Schema
-- SQLite

-- Konfigurace agenta
CREATE TABLE IF NOT EXISTS agent_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL,
    facebook_page_id TEXT,
    facebook_account_id TEXT,
    budget_total INTEGER DEFAULT 0,
    budget_period TEXT DEFAULT 'monthly',
    budget_daily_limit INTEGER DEFAULT 0,
    budget_alert_threshold INTEGER DEFAULT 80,
    strategy_target_audience TEXT,
    strategy_tone TEXT,
    strategy_topics TEXT,
    strategy_post_frequency TEXT DEFAULT 'daily',
    strategy_preferred_times TEXT,
    approval_email TEXT,
    approval_require_for TEXT,
    approval_auto_approve_below INTEGER DEFAULT 0,
    approval_timeout_hours INTEGER DEFAULT 24,
    notifications_daily INTEGER DEFAULT 1,
    notifications_weekly INTEGER DEFAULT 1,
    notifications_instant INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cíle
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    target INTEGER NOT NULL,
    current INTEGER DEFAULT 0,
    period TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Akce čekající na schválení
CREATE TABLE IF NOT EXISTS pending_actions (
    id TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    reasoning TEXT,
    expected_impact TEXT,
    confidence TEXT,
    status TEXT DEFAULT 'pending',
    approval_token TEXT UNIQUE,
    approved_at TEXT,
    approved_by TEXT,
    executed_at TEXT,
    execution_result TEXT
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT (datetime('now')),
    action_id TEXT,
    event_type TEXT NOT NULL,
    details TEXT,
    user_id TEXT,
    FOREIGN KEY (action_id) REFERENCES pending_actions(id)
);

-- Budget tracking
CREATE TABLE IF NOT EXISTS budget_tracking (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    spent INTEGER DEFAULT 0,
    campaign_id TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Chat historie
CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT (datetime('now')),
    role TEXT NOT NULL,
    content TEXT NOT NULL
);

-- Indexy pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_pending_actions_status ON pending_actions(status);
CREATE INDEX IF NOT EXISTS idx_pending_actions_token ON pending_actions(approval_token);
CREATE INDEX IF NOT EXISTS idx_pending_actions_expires ON pending_actions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action_id);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_date ON budget_tracking(date);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
