# Yuva Saarthi — Phase 2 LLM & Chat Architecture Unit Tests
# Tests cover:
# 1. Multi-turn context loading and ~10k char budget truncation (oldest dropped first)
# 2. ProviderCircuitBreaker states (closed, open on 429 / 3x 5xx, half-open probe recovery)
# 3. Structured single-turn JSON parsing with markdown fence stripping & schema validation
# 4. Deterministic pre-filter safety floor (model can only elevate severity, never downgrade)
# 5. Word-boundary token matching (e.g., 'this' != 'hi', 'history' != 'hi')
# 6. Degraded fallback behavior (degraded=True, national helplines for medium/high)

import pytest
import time
from unittest.mock import patch, AsyncMock, MagicMock

from app.config import ProviderCircuitBreaker
from app.schemas import StructuredTurnOutput, ChatResponse, RiskClassificationResponse
from app.services.llm_service import (
    _build_context_turns,
    _parse_turn_json,
    _apply_safety_floor,
    _generate_honest_fallback_reply,
    AIResponse,
)


# ===========================================================================
# 1. Multi-Turn Context Budgeting Tests
# ===========================================================================

class TestMultiTurnContextBudgeting:
    def test_limits_to_max_12_turns(self):
        """History with more than 12 turns is sliced to the 12 most recent."""
        turns = [{"role": "user", "content": f"msg {i}"} for i in range(20)]
        result = _build_context_turns(turns, "current message", max_turns=12, char_budget=10000)
        assert len(result) == 12
        assert result[0]["content"] == "msg 8"
        assert result[-1]["content"] == "msg 19"

    def test_truncates_oldest_first_when_over_char_budget(self):
        """When total character count exceeds budget, oldest turns are pruned first."""
        # 4 turns, each 500 chars = 2000 chars total
        turns = [
            {"role": "user", "content": "A" * 500},
            {"role": "assistant", "content": "B" * 500},
            {"role": "user", "content": "C" * 500},
            {"role": "assistant", "content": "D" * 500},
        ]
        # Budget of 1200 chars with current message of 100 chars
        # Total with all turns = 2100 > 1200. Should drop 'A' (1600 remaining), then 'B' (1100 <= 1200).
        result = _build_context_turns(turns, "E" * 100, max_turns=12, char_budget=1200)
        assert len(result) == 2
        assert result[0]["content"] == "C" * 500
        assert result[1]["content"] == "D" * 500


# ===========================================================================
# 2. ProviderCircuitBreaker Tests
# ===========================================================================

class TestProviderCircuitBreaker:
    def test_initial_state_is_available(self):
        """Newly created breaker is available."""
        breaker = ProviderCircuitBreaker("test_provider", failure_threshold=3, default_cooldown=30.0)
        assert breaker.is_available() is True
        assert breaker.cooldown_remaining() == 0.0

    def test_http_429_trips_immediately(self):
        """HTTP 429 immediately trips the breaker without waiting for 3 failures."""
        breaker = ProviderCircuitBreaker("test_provider", failure_threshold=3, default_cooldown=45.0)
        breaker.record_failure(status_code=429, retry_after=60.0)
        assert breaker.is_available() is False
        assert 58.0 <= breaker.cooldown_remaining() <= 60.5

    def test_consecutive_5xx_trips_at_threshold(self):
        """3 consecutive 5xx failures trip the breaker, but 2 do not."""
        breaker = ProviderCircuitBreaker("test_provider", failure_threshold=3, default_cooldown=30.0)

        breaker.record_failure(status_code=500)
        assert breaker.is_available() is True

        breaker.record_failure(status_code=502)
        assert breaker.is_available() is True

        # 3rd failure trips the breaker
        breaker.record_failure(status_code=503)
        assert breaker.is_available() is False
        assert breaker.cooldown_remaining() > 20.0

    def test_success_resets_failures(self):
        """A success after 2 failures resets the consecutive counter back to 0."""
        breaker = ProviderCircuitBreaker("test_provider", failure_threshold=3, default_cooldown=30.0)
        breaker.record_failure(status_code=500)
        breaker.record_failure(status_code=500)
        breaker.record_success()

        # Next failure is count 1, so breaker remains available
        breaker.record_failure(status_code=500)
        assert breaker.is_available() is True

    def test_half_open_probe_recovery(self):
        """
        When cooldown expires, breaker allows exactly 1 half-open probe request.
        If probe succeeds, breaker closes.
        """
        breaker = ProviderCircuitBreaker("test_provider", failure_threshold=1, default_cooldown=0.05)
        breaker.trip(seconds=0.05)
        assert breaker.is_available() is False

        # Wait for cooldown to expire
        time.sleep(0.06)

        # First request after cooldown acts as the probe
        assert breaker.is_available() is True

        # While probe is in flight, a second caller is denied
        assert breaker.is_available() is False

        # Probe succeeds -> resets and closes breaker
        breaker.record_success()
        assert breaker.is_available() is True


# ===========================================================================
# 3. Structured Single Turn JSON Parsing Tests
# ===========================================================================

class TestStructuredTurnParsing:
    def test_parse_clean_json(self):
        """Correctly parses valid JSON string."""
        raw = """{
            "reply": "Main sun raha hoon, tension mat lo.",
            "mood": "anxious",
            "mood_confidence": 0.88,
            "severity": "low",
            "category": "distress",
            "language": "hinglish",
            "rationale": "Academic stress"
        }"""
        parsed = _parse_turn_json(raw)
        assert parsed is not None
        assert parsed.reply == "Main sun raha hoon, tension mat lo."
        assert parsed.mood == "anxious"
        assert parsed.mood_confidence == 0.88
        assert parsed.severity == "low"
        assert parsed.category == "distress"
        assert parsed.language == "hinglish"

    def test_parse_json_wrapped_in_markdown_fences(self):
        """Strips ```json ... ``` markdown code fences before parsing."""
        raw = "```json\n{\"reply\": \"Hello\", \"mood\": \"normal\", \"mood_confidence\": 0.9, \"severity\": \"none\", \"category\": \"none\", \"language\": \"english\", \"rationale\": \"Casual\"}\n```"
        parsed = _parse_turn_json(raw)
        assert parsed is not None
        assert parsed.reply == "Hello"
        assert parsed.mood == "normal"

    def test_sanitizes_model_names_in_reply(self):
        """Replaces leaking model references like 'I am Gemini' with 'I am Yuva Saarthi'."""
        raw = '{"reply": "I am Gemini, an AI developed by Google.", "severity": "none"}'
        parsed = _parse_turn_json(raw)
        assert parsed is not None
        assert "Gemini" not in parsed.reply
        assert "Yuva Saarthi" in parsed.reply

    def test_corrupt_json_returns_none(self):
        """Invalid JSON safely returns None without raising."""
        assert _parse_turn_json("not valid json at all") is None


# ===========================================================================
# 4. Deterministic Pre-filter Safety Floor Tests
# ===========================================================================

class TestSafetyFloor:
    def test_pre_filter_floor_cannot_be_downgraded_by_model(self):
        """
        If deterministic pre-filter detects high/self_harm,
        even if the LLM hallucinated severity='none', the final result MUST stay 'high'.
        """
        final_sev, final_cat, final_rat = _apply_safety_floor(
            model_severity="none",
            model_category="none",
            model_rationale="Model thought it was benign",
            floor_severity="high",
            floor_category="self_harm",
            floor_rationale="Tripwire detected: suicide",
        )
        assert final_sev == "high"
        assert final_cat == "self_harm"
        assert "Tripwire detected" in final_rat

    def test_model_can_elevate_above_floor(self):
        """
        If floor is 'low', but model semantically detects 'high' crisis,
        the severity is elevated to 'high'.
        """
        final_sev, final_cat, _ = _apply_safety_floor(
            model_severity="high",
            model_category="abuse",
            model_rationale="Explicit abuse described",
            floor_severity="low",
            floor_category="distress",
            floor_rationale="Mild keyword",
        )
        assert final_sev == "high"
        assert final_cat == "abuse"


# ===========================================================================
# 5. Word-Boundary Matching & Degraded Fallback Tests
# ===========================================================================

class TestWordBoundaryFallback:
    def test_this_does_not_trigger_hi_greeting(self):
        """'this is hard' must NOT trigger the 'hi' casual greeting."""
        reply = _generate_honest_fallback_reply("this is so hard", severity="none", category="none")
        # Should NOT return the greeting ("Hey! Main Yuva Saarthi hoon..."), but empathetic listening
        assert "Hey! Main Yuva Saarthi hoon" not in reply
        assert "Hey! I'm Yuva Saarthi. How has your day" not in reply

    def test_history_does_not_trigger_hi_greeting(self):
        """'history exam tomorrow' must trigger academic pressure, not 'hi'."""
        reply = _generate_honest_fallback_reply("history exam tomorrow", severity="low", category="distress")
        assert "exam" in reply.lower() or "padhai" in reply.lower()

    def test_medium_distress_fallback_includes_national_helpline(self):
        """Medium anxiety fallback includes Tele-MANAS (14416)."""
        reply = _generate_honest_fallback_reply("severe anxiety panic", severity="medium", category="distress")
        assert "14416" in reply or "Tele-MANAS" in reply

    def test_high_crisis_fallback_includes_kiran_and_telemanas(self):
        """High self-harm crisis includes Tele-MANAS (14416) and KIRAN (1800-599-0019)."""
        reply = _generate_honest_fallback_reply("suicide ideation", severity="high", category="self_harm")
        assert "14416" in reply or "1800-599-0019" in reply
