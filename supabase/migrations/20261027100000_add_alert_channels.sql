-- Yuva Saarthi — Phase 5 Migration: Alert Channels & Contact Extensions
-- Adds multi-channel notification support to alert_attempts table
-- and extends emergency_contacts with telegram_chat_id and email fields.

-- Extend alert_attempts with channel tracking
ALTER TABLE alert_attempts ADD COLUMN IF NOT EXISTS channel text DEFAULT 'call';
ALTER TABLE alert_attempts ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE alert_attempts ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE alert_attempts ADD COLUMN IF NOT EXISTS error text;

-- Extend emergency_contacts with additional contact methods
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS email text;

-- Add comment documentation
COMMENT ON COLUMN alert_attempts.channel IS 'Notification channel: call, sms_fast2sms, telegram, email';
COMMENT ON COLUMN alert_attempts.provider_message_id IS 'External message/request ID from the notification provider';
COMMENT ON COLUMN alert_attempts.status IS 'Delivery status: pending, sent, delivered, failed';
COMMENT ON COLUMN alert_attempts.error IS 'Error message if delivery failed';
COMMENT ON COLUMN emergency_contacts.telegram_chat_id IS 'Telegram chat ID for bot notifications (contact must /start the bot)';
COMMENT ON COLUMN emergency_contacts.email IS 'Email address for emergency email notifications';
