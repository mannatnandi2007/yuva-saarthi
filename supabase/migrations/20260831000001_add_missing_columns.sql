-- YUVAA Saarthi Migration: Add Missing Columns
-- Fixes BUG-004: users table was missing username, first_name, last_name
-- Fixes BUG-007: emergency_contacts was missing first_name, last_name

-- =========================================================================
-- FIX BUG-004: Add identity columns to users table
-- =========================================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Index for fast username lookup (used by login endpoint)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =========================================================================
-- FIX BUG-007: Add name columns to emergency_contacts table
-- So Bland AI can address contacts by their real name during voice calls
-- =========================================================================
ALTER TABLE emergency_contacts
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

-- =========================================================================
-- Add pgvector IVFFlat index for fast ANN similarity search on RAG documents
-- Required for Phase 4 vector retrieval to work at scale
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
    ON rag_documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

-- Index for cross-login context API: get latest session for a user fast
CREATE INDEX IF NOT EXISTS idx_sessions_user_started
    ON sessions(user_id, started_at DESC);
