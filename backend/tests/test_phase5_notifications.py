# Yuva Saarthi — Phase 5 Notification Service Tests
# Tests:
#   1. Abuse bypass blocks ALL notification channels (§3.4a)
#   2. Dry-run mode logs instead of sending
#   3. Deduplication: same risk_event_id not alerted twice
#   4. Rate limiting: at most one alert per user per 15 minutes
#   5. Channel dispatch: SMS, Telegram, Email
#   6. Message body builder
#   7. Escalation tightening: only high+self_harm triggers notifications

import os
import uuid
import pytest
from unittest.mock import patch, MagicMock

os.environ["DEV_BYPASS_AUTH"] = "true"
os.environ["NOTIFY_CHANNELS"] = "sms_fast2sms,telegram,email"
os.environ["NOTIFY_DRY_RUN"] = "true"
os.environ["FAST2SMS_API_KEY"] = "test-key"
os.environ["TELEGRAM_BOT_TOKEN"] = "test-bot-token"
os.environ["EMAIL_API_KEY"] = "test-email-key"

from app.services.notifier import (
    dispatch_notifications,
    build_alert_message,
    Fast2SMSChannel,
    TelegramChannel,
    EmailChannel,
    reset_tracking_state,
    NotificationRound,
    NotifyResult,
    _is_rate_limited,
    _is_duplicate,
    _record_alert,
)


TEST_USER_ID = str(uuid.uuid4())
TEST_RISK_EVENT = str(uuid.uuid4())


@pytest.fixture(autouse=True)
def reset_state():
    """Reset rate limiting and dedup state before each test."""
    reset_tracking_state()
    yield
    reset_tracking_state()


MOCK_CONTACTS = [
    {
        "id": str(uuid.uuid4()),
        "phone": "+919876543210",
        "relationship": "Mother",
        "priority_order": 1,
        "telegram_chat_id": "12345678",
        "email": "mother@example.com",
    },
    {
        "id": str(uuid.uuid4()),
        "phone": "+919876543211",
        "relationship": "Father",
        "priority_order": 2,
        "telegram_chat_id": "",
        "email": "",
    },
]


# ===========================================================================
# 1. Abuse Bypass — §3.4a
# ===========================================================================

class TestAbuseBypass:
    """Verify Rule §3.4a blocks ALL notification channels for abuse cases."""

    def test_abuse_bypass_blocks_all_channels(self):
        result = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="abuse",
        )
        assert result.abuse_bypass is True
        assert result.channels_attempted == 0
        assert len(result.results) == 0
        assert "§3.4a" in result.skipped_reason

    def test_abuse_bypass_no_contacts_reached(self):
        """Even with valid contacts, abuse category must prevent all dispatch."""
        result = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="abuse",
            user_first_name="Test User",
        )
        assert result.abuse_bypass is True
        assert result.channels_attempted == 0


# ===========================================================================
# 2. Dry-Run Mode
# ===========================================================================

class TestDryRunMode:
    """Verify dry-run logs instead of making real API calls."""

    def test_sms_dry_run(self):
        channel = Fast2SMSChannel()
        result = channel.send(
            recipient={"phone": "+919876543210", "id": "test-contact"},
            message_body="Test alert",
            dry_run=True,
        )
        assert result.success is True
        assert result.dry_run is True
        assert result.provider_message_id.startswith("dry-run-")

    def test_telegram_dry_run(self):
        channel = TelegramChannel()
        result = channel.send(
            recipient={"telegram_chat_id": "12345", "id": "test-contact"},
            message_body="Test alert",
            dry_run=True,
        )
        assert result.success is True
        assert result.dry_run is True

    def test_email_dry_run(self):
        channel = EmailChannel()
        result = channel.send(
            recipient={"email": "test@example.com", "id": "test-contact"},
            message_body="Test alert",
            dry_run=True,
        )
        assert result.success is True
        assert result.dry_run is True


# ===========================================================================
# 3. Deduplication
# ===========================================================================

class TestDeduplication:
    """Verify same risk_event_id is never alerted twice."""

    def test_duplicate_event_blocked(self):
        event_id = str(uuid.uuid4())

        # First dispatch should go through
        r1 = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=event_id,
            severity="high",
            category="self_harm",
        )
        assert r1.channels_attempted > 0
        assert r1.skipped_reason is None

        # Reset rate limit only (not dedup) to isolate test
        from app.services.notifier import _rate_limit_tracker
        _rate_limit_tracker.clear()

        # Second dispatch with same event_id should be blocked
        r2 = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=event_id,
            severity="high",
            category="self_harm",
        )
        assert r2.channels_attempted == 0
        assert "Duplicate" in r2.skipped_reason

    def test_different_events_not_blocked(self):
        e1 = str(uuid.uuid4())
        e2 = str(uuid.uuid4())

        r1 = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=e1,
            severity="high",
            category="self_harm",
        )
        assert r1.channels_attempted > 0

        # Reset rate limit to isolate dedup test
        from app.services.notifier import _rate_limit_tracker
        _rate_limit_tracker.clear()

        r2 = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=e2,
            severity="high",
            category="self_harm",
        )
        assert r2.channels_attempted > 0


# ===========================================================================
# 4. Rate Limiting
# ===========================================================================

class TestRateLimiting:
    """Verify at most one alert round per user per 15 minutes."""

    def test_rate_limit_blocks_second_alert(self):
        r1 = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="self_harm",
        )
        assert r1.channels_attempted > 0

        # Second alert within 15 min should be blocked
        r2 = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="self_harm",
        )
        assert r2.channels_attempted == 0
        assert "Rate limited" in r2.skipped_reason

    def test_different_users_not_rate_limited(self):
        user_a = str(uuid.uuid4())
        user_b = str(uuid.uuid4())

        r1 = dispatch_notifications(
            user_id=user_a,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="self_harm",
        )
        assert r1.channels_attempted > 0

        r2 = dispatch_notifications(
            user_id=user_b,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="self_harm",
        )
        assert r2.channels_attempted > 0


# ===========================================================================
# 5. Channel Missing Info Handling
# ===========================================================================

class TestChannelEdgeCases:
    """Verify channels gracefully handle missing contact info."""

    def test_sms_no_phone(self):
        ch = Fast2SMSChannel()
        result = ch.send({"id": "x"}, "Test", dry_run=True)
        assert result.success is False
        assert "No phone" in result.error

    def test_telegram_no_chat_id(self):
        ch = TelegramChannel()
        result = ch.send({"id": "x"}, "Test", dry_run=True)
        assert result.success is False
        assert "No telegram_chat_id" in result.error

    def test_email_no_address(self):
        ch = EmailChannel()
        result = ch.send({"id": "x"}, "Test", dry_run=True)
        assert result.success is False
        assert "No email" in result.error


# ===========================================================================
# 6. Message Body Builder
# ===========================================================================

class TestMessageBody:
    """Verify alert message construction."""

    def test_english_message(self):
        msg = build_alert_message("Riya", "en")
        assert "Riya" in msg
        assert "Yuva Saarthi" in msg
        assert "support" in msg.lower()

    def test_hindi_message(self):
        msg = build_alert_message("Riya", "hi")
        assert "Riya" in msg
        assert "Yuva Saarthi" in msg
        assert "zarurat" in msg.lower()

    def test_default_name(self):
        msg = build_alert_message()
        assert "Your child" in msg


# ===========================================================================
# 7. Escalation Tightening — Only high+self_harm triggers
# ===========================================================================

class TestEscalationTightening:
    """Verify only severity=high + category=self_harm triggers notifications."""

    def test_medium_severity_no_notification(self):
        result = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="medium",
            category="distress",
        )
        assert result.channels_attempted == 0
        assert "In-app support only" in result.skipped_reason

    def test_high_distress_no_notification(self):
        result = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="distress",
        )
        assert result.channels_attempted == 0

    def test_high_self_harm_triggers_notification(self):
        result = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="high",
            category="self_harm",
        )
        assert result.channels_attempted > 0
        assert result.skipped_reason is None

    def test_low_severity_no_notification(self):
        result = dispatch_notifications(
            user_id=TEST_USER_ID,
            contacts=MOCK_CONTACTS,
            risk_event_id=str(uuid.uuid4()),
            severity="low",
            category="self_harm",
        )
        assert result.channels_attempted == 0
