-- ============================================================================
-- YUVAA Saarthi Complete Master Schema (Consolidated Migration)
-- Combines:
--   1. Initial base tables & enums (PRD §5)
--   2. Compliance columns & identity fields (BUG-004 & BUG-007)
--   3. 384-dimensional pgvector configuration for all-MiniLM-L6-v2
--   4. Development permissions (RLS disabled for smooth local operation)
-- ============================================================================

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create custom enum for risk events
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_taken_type') THEN
        CREATE TYPE action_taken_type AS ENUM (
            'call_placed',
            'sms_sent',
            'attempted_failed',
            'logged_only',
            'routed_to_helpline'
        );
    END IF;
END
$$;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    age_band TEXT CHECK (age_band IN ('under-13', '13-15', '16-17', '18-plus', 'other')),
    consent_given_at TIMESTAMP WITH TIME ZONE,
    policy_ack_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    relationship TEXT NOT NULL CHECK (relationship IN ('Parent', 'Guardian', 'Sibling', 'Friend', 'Other')),
    priority_order INT NOT NULL CHECK (priority_order >= 1 AND priority_order <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone),
    CONSTRAINT unique_user_priority UNIQUE (user_id, priority_order)
);

-- 5. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    summary_snapshot TEXT
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    risk_tier TEXT CHECK (risk_tier IN ('none', 'low', 'medium', 'high')),
    risk_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Risk Events Table
CREATE TABLE IF NOT EXISTS risk_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('none', 'low', 'medium', 'high')),
    category TEXT NOT NULL CHECK (category IN ('self_harm', 'abuse', 'distress', 'none')),
    action_taken action_taken_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Alert Attempts Table
CREATE TABLE IF NOT EXISTS alert_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_event_id UUID NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
    emergency_contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    attempt_order INT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('call', 'sms')),
    outcome TEXT NOT NULL CHECK (outcome IN ('answered', 'no_answer', 'declined', 'invalid_number', 'sent')),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. RAG Documents Table (384 Dimensions for all-MiniLM-L6-v2)
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT,
    title TEXT,
    chunk_text TEXT,
    embedding VECTOR(384)
);

-- 10. Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_user ON risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_message ON risk_events(message_id);
CREATE INDEX IF NOT EXISTS idx_alert_attempts_event ON alert_attempts(risk_event_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding 
    ON rag_documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

-- 11. Allow seamless reads and writes for development
ALTER TABLE rag_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_attempts DISABLE ROW LEVEL SECURITY;
