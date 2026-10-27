-- Phase 3 Migration: Add mood and mood_confidence to messages table
-- Enables backend-driven emotion tracking and persistence for Yusa companion.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS mood text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mood_confidence real;

COMMENT ON COLUMN messages.mood IS 'Assessed emotion: normal, happy, overjoyed, sad, angry, anxious, tired';
COMMENT ON COLUMN messages.mood_confidence IS 'Confidence score [0.0 - 1.0] for the assessed mood';
