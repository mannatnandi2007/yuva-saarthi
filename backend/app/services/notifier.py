# Yuva Saarthi — Provider-Agnostic Notification Service
# Reference: Implementation Plan Phase 5 (Alert Notifications)
#
# Architecture:
#   - Channel: Abstract base class for notification channels
#   - NotifierService: Orchestrates multi-channel dispatch with safety rules
#   - Channels: sms_fast2sms, telegram, email
#   - Safety: abuse bypass (§3.4a), rate limiting, deduplication
#
# Config:
#   NOTIFY_CHANNELS=sms_fast2sms,telegram,email  (comma list, any subset)
#   NOTIFY_DRY_RUN=true  (default in dev — logs instead of sending)

import os
import time
import uuid
import logging
import hashlib
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

NOTIFY_CHANNELS_ENV = os.environ.get("NOTIFY_CHANNELS", "")
NOTIFY_DRY_RUN = os.environ.get("NOTIFY_DRY_RUN", "true").lower() in ("true", "1", "yes")

# Rate limiting: at most one alert round per user per 15 minutes
RATE_LIMIT_SECONDS = 15 * 60

# Channel-specific keys
FAST2SMS_API_KEY = os.environ.get("FAST2SMS_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
EMAIL_API_KEY = os.environ.get("EMAIL_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "alerts@yuvasaarthi.in")


# ---------------------------------------------------------------------------
# Notification Result
# ---------------------------------------------------------------------------

@dataclass
class NotifyResult:
    """Result of a single channel notification attempt."""
    channel: str
    contact_id: str
    success: bool
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    dry_run: bool = False


# ---------------------------------------------------------------------------
# In-memory state for rate limiting and deduplication
# ---------------------------------------------------------------------------

_rate_limit_tracker: Dict[str, float] = {}  # user_id -> last alert timestamp
_dedupe_tracker: set = set()  # set of risk_event_ids already alerted


def _is_rate_limited(user_id: str) -> bool:
    """Check if user has been alerted within the last 15 minutes."""
    last_alert = _rate_limit_tracker.get(user_id, 0.0)
    return (time.time() - last_alert) < RATE_LIMIT_SECONDS


def _record_alert(user_id: str, risk_event_id: Optional[str] = None) -> None:
    """Record that an alert was sent for rate limiting and dedup."""
    _rate_limit_tracker[user_id] = time.time()
    if risk_event_id:
        _dedupe_tracker.add(risk_event_id)


def _is_duplicate(risk_event_id: Optional[str]) -> bool:
    """Check if this risk event has already been alerted."""
    if not risk_event_id:
        return False
    return risk_event_id in _dedupe_tracker


def reset_tracking_state() -> None:
    """Reset all in-memory tracking — for testing only."""
    _rate_limit_tracker.clear()
    _dedupe_tracker.clear()


# ---------------------------------------------------------------------------
# Channel Abstract Base Class
# ---------------------------------------------------------------------------

class Channel(ABC):
    """Abstract notification channel interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Channel identifier (e.g. 'sms_fast2sms', 'telegram', 'email')."""
        ...

    @abstractmethod
    def send(
        self,
        recipient: Dict[str, Any],
        message_body: str,
        dry_run: bool = True,
    ) -> NotifyResult:
        """
        Send a notification to a single recipient.

        Args:
            recipient: dict with keys like 'phone', 'email', 'telegram_chat_id', 'id'
            message_body: the notification text
            dry_run: if True, log instead of actually sending

        Returns:
            NotifyResult with success/failure info
        """
        ...

    def is_configured(self) -> bool:
        """Check if this channel has the required API keys configured."""
        return True


# ---------------------------------------------------------------------------
# Fast2SMS Channel
# ---------------------------------------------------------------------------

class Fast2SMSChannel(Channel):
    """Send SMS alerts via Fast2SMS HTTP API (route=q quick SMS)."""

    @property
    def name(self) -> str:
        return "sms_fast2sms"

    def is_configured(self) -> bool:
        return bool(FAST2SMS_API_KEY)

    def send(
        self,
        recipient: Dict[str, Any],
        message_body: str,
        dry_run: bool = True,
    ) -> NotifyResult:
        phone = recipient.get("phone", "")
        contact_id = recipient.get("id", "unknown")

        if not phone:
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=False,
                error="No phone number provided",
            )

        # Strip country code prefix for Fast2SMS (expects 10-digit Indian numbers)
        clean_phone = phone.replace("+91", "").replace(" ", "").strip()
        if len(clean_phone) > 10:
            clean_phone = clean_phone[-10:]

        if dry_run:
            logger.info(
                "[NOTIFY DRY-RUN] SMS via Fast2SMS to %s: %s",
                clean_phone, message_body[:80],
            )
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=True,
                provider_message_id=f"dry-run-{uuid.uuid4().hex[:8]}",
                dry_run=True,
            )

        try:
            import httpx
            resp = httpx.post(
                "https://www.fast2sms.com/dev/bulkV2",
                headers={"authorization": FAST2SMS_API_KEY},
                json={
                    "route": "q",
                    "message": message_body,
                    "language": "english",
                    "flash": 0,
                    "numbers": clean_phone,
                },
                timeout=15.0,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("return"):
                return NotifyResult(
                    channel=self.name,
                    contact_id=contact_id,
                    success=True,
                    provider_message_id=data.get("request_id", ""),
                )
            else:
                return NotifyResult(
                    channel=self.name,
                    contact_id=contact_id,
                    success=False,
                    error=data.get("message", f"HTTP {resp.status_code}"),
                )
        except Exception as e:
            logger.error("[NOTIFY] Fast2SMS error: %s", e)
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=False,
                error=str(e),
            )


# ---------------------------------------------------------------------------
# Telegram Bot Channel
# ---------------------------------------------------------------------------

class TelegramChannel(Channel):
    """Send alerts via Telegram Bot API. Contacts must have /start'd the bot."""

    @property
    def name(self) -> str:
        return "telegram"

    def is_configured(self) -> bool:
        return bool(TELEGRAM_BOT_TOKEN)

    def send(
        self,
        recipient: Dict[str, Any],
        message_body: str,
        dry_run: bool = True,
    ) -> NotifyResult:
        chat_id = recipient.get("telegram_chat_id", "")
        contact_id = recipient.get("id", "unknown")

        if not chat_id:
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=False,
                error="No telegram_chat_id configured for this contact",
            )

        if dry_run:
            logger.info(
                "[NOTIFY DRY-RUN] Telegram to chat_id=%s: %s",
                chat_id, message_body[:80],
            )
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=True,
                provider_message_id=f"dry-run-{uuid.uuid4().hex[:8]}",
                dry_run=True,
            )

        try:
            import httpx
            resp = httpx.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": message_body,
                    "parse_mode": "HTML",
                },
                timeout=15.0,
            )
            data = resp.json()
            if data.get("ok"):
                msg_id = data.get("result", {}).get("message_id", "")
                return NotifyResult(
                    channel=self.name,
                    contact_id=contact_id,
                    success=True,
                    provider_message_id=str(msg_id),
                )
            else:
                return NotifyResult(
                    channel=self.name,
                    contact_id=contact_id,
                    success=False,
                    error=data.get("description", "Telegram API error"),
                )
        except Exception as e:
            logger.error("[NOTIFY] Telegram error: %s", e)
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=False,
                error=str(e),
            )


# ---------------------------------------------------------------------------
# Email Channel (Resend / Brevo)
# ---------------------------------------------------------------------------

class EmailChannel(Channel):
    """Send alert emails via Resend API."""

    @property
    def name(self) -> str:
        return "email"

    def is_configured(self) -> bool:
        return bool(EMAIL_API_KEY)

    def send(
        self,
        recipient: Dict[str, Any],
        message_body: str,
        dry_run: bool = True,
    ) -> NotifyResult:
        email_addr = recipient.get("email", "")
        contact_id = recipient.get("id", "unknown")

        if not email_addr:
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=False,
                error="No email address configured for this contact",
            )

        if dry_run:
            logger.info(
                "[NOTIFY DRY-RUN] Email to %s: %s",
                email_addr, message_body[:80],
            )
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=True,
                provider_message_id=f"dry-run-{uuid.uuid4().hex[:8]}",
                dry_run=True,
            )

        try:
            import httpx
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {EMAIL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": EMAIL_FROM,
                    "to": [email_addr],
                    "subject": "Yuva Saarthi — Safety Alert",
                    "text": message_body,
                },
                timeout=15.0,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return NotifyResult(
                    channel=self.name,
                    contact_id=contact_id,
                    success=True,
                    provider_message_id=data.get("id", ""),
                )
            else:
                return NotifyResult(
                    channel=self.name,
                    contact_id=contact_id,
                    success=False,
                    error=f"HTTP {resp.status_code}: {resp.text[:200]}",
                )
        except Exception as e:
            logger.error("[NOTIFY] Email error: %s", e)
            return NotifyResult(
                channel=self.name,
                contact_id=contact_id,
                success=False,
                error=str(e),
            )


# ---------------------------------------------------------------------------
# Channel Registry
# ---------------------------------------------------------------------------

_CHANNEL_REGISTRY: Dict[str, Channel] = {
    "sms_fast2sms": Fast2SMSChannel(),
    "telegram": TelegramChannel(),
    "email": EmailChannel(),
}


def _get_active_channels() -> List[Channel]:
    """Return list of configured and enabled channels based on NOTIFY_CHANNELS env."""
    if not NOTIFY_CHANNELS_ENV.strip():
        return []
    requested = [c.strip() for c in NOTIFY_CHANNELS_ENV.split(",") if c.strip()]
    active = []
    for name in requested:
        channel = _CHANNEL_REGISTRY.get(name)
        if channel and channel.is_configured():
            active.append(channel)
        elif channel and not channel.is_configured():
            logger.warning("[NOTIFY] Channel '%s' requested but not configured (missing API key)", name)
        else:
            logger.warning("[NOTIFY] Unknown channel '%s' in NOTIFY_CHANNELS", name)
    return active


# ---------------------------------------------------------------------------
# Message Body Builder
# ---------------------------------------------------------------------------

def build_alert_message(user_first_name: str = "Your child", language: str = "en") -> str:
    """
    Build the notification message body.
    Non-clinical, no chat content exposed.
    """
    if language == "hi":
        return (
            f"Yuva Saarthi: {user_first_name} ko abhi support ki zarurat ho sakti hai. "
            f"Kripya unhe call karein ya unse milein."
        )
    return (
        f"Yuva Saarthi: {user_first_name} may need support right now. "
        f"Please call or check on them."
    )


# ---------------------------------------------------------------------------
# Main Notification Dispatch
# ---------------------------------------------------------------------------

@dataclass
class NotificationRound:
    """Result of a full notification dispatch round."""
    user_id: str
    risk_event_id: Optional[str]
    channels_attempted: int = 0
    results: List[NotifyResult] = field(default_factory=list)
    skipped_reason: Optional[str] = None
    abuse_bypass: bool = False


def dispatch_notifications(
    user_id: str,
    contacts: List[Dict[str, Any]],
    risk_event_id: Optional[str] = None,
    severity: str = "high",
    category: str = "self_harm",
    user_first_name: str = "Your child",
    language: str = "en",
) -> NotificationRound:
    """
    Dispatch notifications to emergency contacts across all active channels.

    Safety rules:
      1. Abuse bypass: category == abuse && severity == high -> send NOTHING
      2. Rate limit: at most one alert round per user per 15 minutes
      3. Dedup: never alert twice for the same risk_event_id
      4. Only fires for severity == high AND category == self_harm (voice calls + SMS)
         Medium severity -> in-app grounding only, no external notification
    """
    round_result = NotificationRound(
        user_id=user_id,
        risk_event_id=risk_event_id,
    )

    # Safety Rule 1: Abuse bypass (§3.4a)
    if category == "abuse" and severity == "high":
        round_result.abuse_bypass = True
        round_result.skipped_reason = (
            "Rule §3.4a: Abuse detected — all notification channels blocked. "
            "Personal contacts NOT contacted to protect user safety."
        )
        logger.warning(
            "[NOTIFY §3.4a] Abuse bypass for user %s — no notifications sent",
            user_id,
        )
        return round_result

    # Safety Rule 2: Only escalate on high self_harm
    if not (severity == "high" and category in ("self_harm", "suicide")):
        round_result.skipped_reason = (
            f"Notifications require severity=high + category=self_harm. "
            f"Got severity={severity}, category={category}. In-app support only."
        )
        return round_result

    # Safety Rule 3: Dedup
    if _is_duplicate(risk_event_id):
        round_result.skipped_reason = (
            f"Duplicate alert: risk_event_id={risk_event_id} already notified"
        )
        logger.info("[NOTIFY DEDUP] Skipping duplicate for event %s", risk_event_id)
        return round_result

    # Safety Rule 4: Rate limit
    if _is_rate_limited(user_id):
        round_result.skipped_reason = (
            f"Rate limited: user {user_id} was alerted within the last 15 minutes"
        )
        logger.info("[NOTIFY RATE LIMIT] Skipping for user %s", user_id)
        return round_result

    # Get active channels
    channels = _get_active_channels()
    if not channels:
        round_result.skipped_reason = "No notification channels configured or enabled"
        logger.warning("[NOTIFY] No active channels — notifications not sent")
        return round_result

    # Build message
    message_body = build_alert_message(user_first_name, language)

    # Dispatch to all contacts across all channels
    for contact in contacts:
        for channel in channels:
            try:
                result = channel.send(
                    recipient=contact,
                    message_body=message_body,
                    dry_run=NOTIFY_DRY_RUN,
                )
                round_result.results.append(result)
                round_result.channels_attempted += 1

                # Log to DB (best-effort)
                _log_notification_attempt(
                    risk_event_id=risk_event_id,
                    contact_id=contact.get("id"),
                    channel=channel.name,
                    provider_message_id=result.provider_message_id,
                    status="sent" if result.success else "failed",
                    error=result.error,
                )
            except Exception as e:
                logger.error(
                    "[NOTIFY] Channel %s failed for contact %s: %s",
                    channel.name, contact.get("id"), e,
                )
                round_result.results.append(NotifyResult(
                    channel=channel.name,
                    contact_id=contact.get("id", "unknown"),
                    success=False,
                    error=str(e),
                ))

    # Record alert for rate limiting and dedup
    _record_alert(user_id, risk_event_id)

    return round_result


def _log_notification_attempt(
    risk_event_id: Optional[str],
    contact_id: Optional[str],
    channel: str,
    provider_message_id: Optional[str],
    status: str,
    error: Optional[str],
) -> None:
    """Best-effort log of notification attempt to alert_attempts table."""
    try:
        from app.supabase_client import supabase
        supabase.table("alert_attempts").insert({
            "risk_event_id": risk_event_id,
            "emergency_contact_id": contact_id,
            "channel": channel,
            "provider_message_id": provider_message_id,
            "status": status,
            "error": error,
            "outcome": status,
            "attempt_order": 0,
        }).execute()
    except Exception as e:
        logger.debug("[NOTIFY] Could not log alert_attempt: %s", e)
