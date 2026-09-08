-- YUVAA Saarthi Initial Schema Migration
-- Matches specifications in PRD §5 and Execution Plan §3 (Day 1 & Day 3 tasks)

-- Enable uuid and pgvector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom enum for action_taken in risk_events
-- As per PRD §5: call_placed / sms_sent / attempted_failed / logged_only / routed_to_helpline
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'action_taken_type'
    ) THEN
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

-- Users Table
-- Reference: PRD §3.1 and §5
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    age_band TEXT CHECK (age_band IN ('under-13', '13-15', '16-17', '18-plus', 'other')),
    consent_given_at TIMESTAMP WITH TIME ZONE,
    policy_ack_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Emergency Contacts Table
-- Reference: PRD §3.1 & §5
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('Parent', 'Guardian', 'Sibling', 'Friend', 'Other')),
    priority_order INT NOT NULL CHECK (priority_order >= 1 AND priority_order <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent duplicate contact numbers for a single user
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone),
    -- Ensure priority orders are unique per user
    CONSTRAINT unique_user_priority UNIQUE (user_id, priority_order)
);

-- Sessions Table
-- Reference: PRD §3.2 & §5
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    summary_snapshot TEXT -- Rolling conversation summary (PRD §3.2)
);

-- Messages Table
-- Reference: PRD §3.2, §3.3, & §5
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    risk_tier TEXT CHECK (risk_tier IN ('none', 'low', 'medium', 'high')),
    risk_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Risk Events Table
-- Reference: PRD §3.4, §3.4a (Abuse-routing), & §5
CREATE TABLE risk_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('none', 'low', 'medium', 'high')),
    category TEXT NOT NULL CHECK (category IN ('self_harm', 'abuse', 'distress', 'none')),
    action_taken action_taken_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alert Attempts Table
-- Reference: PRD §3.4 (Escalation logs) & §5
CREATE TABLE alert_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_event_id UUID NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
    emergency_contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    attempt_order INT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('call', 'sms')),
    outcome TEXT NOT NULL CHECK (outcome IN ('answered', 'no_answer', 'declined', 'invalid_number', 'sent')),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RAG Documents Table (using pgvector extension)
-- Reference: PRD §4 (Vector DB recommendation) & §5
CREATE TABLE rag_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT,
    title TEXT,
    chunk_text TEXT,
    embedding VECTOR(1536) -- OpenAI or similar 1536-dim embedding vector
);

-- Performance Indexes (as per Execution Plan Day 3 tasks)
CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_risk_events_user ON risk_events(user_id);
CREATE INDEX idx_risk_events_message ON risk_events(message_id);
CREATE INDEX idx_alert_attempts_event ON alert_attempts(risk_event_id);
