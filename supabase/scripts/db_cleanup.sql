-- YUVAA Saarthi DB Cleanup Script
-- Safely removes application data while preserving the database schema.

BEGIN;

DELETE FROM alert_attempts;
DELETE FROM risk_events;
DELETE FROM messages;
DELETE FROM sessions;
DELETE FROM emergency_contacts;
DELETE FROM rag_documents;

-- Users are preserved.
-- Uncomment the following only for a complete database reset:
-- DELETE FROM users;

COMMIT;
