# Yuva Saarthi — Phase 8 Security & Rate Limiting Tests
# Tests:
# 1. In-memory sliding window rate limiting on /chat (returns 429 and Retry-After)
# 2. CORS origin enforcement (settings.cors_origins_list)
# 3. Production JWT enforcement and dev bypass denial

import os
import uuid
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

os.environ["DEV_BYPASS_AUTH"] = "true"

from app.main import app
from app.config import Settings, settings
from app.middleware.rate_limit import RateLimiter, chat_rate_limiter
from app.dependencies import get_current_user

client = TestClient(app)

TEST_USER_ID = str(uuid.uuid4())
TEST_SESSION_ID = str(uuid.uuid4())
DEV_AUTH = {"X-Dev-User-Id": TEST_USER_ID}


class TestRateLimiting:
    def setup_method(self):
        chat_rate_limiter.reset()

    def teardown_method(self):
        chat_rate_limiter.reset()

    def test_custom_rate_limiter_allows_under_limit(self):
        limiter = RateLimiter(limit=3, window_seconds=60)
        req = MagicMock()
        req.headers = {"X-Dev-User-Id": "user-test-1"}
        req.client.host = "127.0.0.1"

        import asyncio
        for _ in range(3):
            asyncio.run(limiter(req))

    def test_custom_rate_limiter_blocks_over_limit(self):
        limiter = RateLimiter(limit=2, window_seconds=60)
        req = MagicMock()
        req.headers = {"X-Dev-User-Id": "user-test-2"}
        req.client.host = "127.0.0.1"

        import asyncio
        asyncio.run(limiter(req))
        asyncio.run(limiter(req))

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(limiter(req))
        
        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers
        assert "Rate limit exceeded" in exc_info.value.detail

    def test_chat_endpoint_rate_limiter_integration(self):
        # Set limit low for fast testing
        original_limit = chat_rate_limiter._limit
        chat_rate_limiter._limit = 2
        try:
            with patch("app.routers.chat.send_chat_message") as mock_send:
                mock_send.return_value = MagicMock(
                    reply="Hello there!",
                    severity="low",
                    category="general",
                    rationale="None",
                    action_taken="none",
                    heading=None,
                    provider="local_fallback",
                    mood="PEACEFUL",
                    mood_confidence=0.9,
                    degraded=False,
                )
                headers = {"X-Dev-User-Id": "rate-limit-test-user"}
                payload = {"session_id": TEST_SESSION_ID, "message": "hello"}

                # Request 1: OK
                res1 = client.post("/chat", json=payload, headers=headers)
                assert res1.status_code == 200

                # Request 2: OK
                res2 = client.post("/chat", json=payload, headers=headers)
                assert res2.status_code == 200

                # Request 3: 429 Too Many Requests
                res3 = client.post("/chat", json=payload, headers=headers)
                assert res3.status_code == 429
                assert "Retry-After" in res3.headers
                assert "Rate limit exceeded" in res3.json()["detail"]
        finally:
            chat_rate_limiter._limit = original_limit
            chat_rate_limiter.reset()


class TestCORSSecurity:
    def test_cors_origins_list_parsing(self):
        s = Settings(cors_origins="http://localhost:5173, http://127.0.0.1:5173, capacitor://localhost")
        assert "http://localhost:5173" in s.cors_origins_list
        assert "http://127.0.0.1:5173" in s.cors_origins_list
        assert "capacitor://localhost" in s.cors_origins_list
        assert len(s.cors_origins_list) == 3

    def test_cors_wildcard_handling(self):
        s = Settings(cors_origins="*")
        assert s.cors_origins_list == ["*"]


class TestProductionSecurityValidation:
    def test_production_rejects_default_jwt_secret(self):
        with pytest.raises(ValueError) as exc:
            Settings(
                environment="production",
                jwt_secret="yuva-saarthi-default-dev-secret-change-in-production",
                dev_bypass_auth=False
            ).validate_production_security()
        assert "CRITICAL: Production deployment detected with insecure or default JWT_SECRET" in str(exc.value)

    def test_production_rejects_short_jwt_secret(self):
        with pytest.raises(ValueError) as exc:
            Settings(
                environment="production",
                jwt_secret="too-short-secret-key",
                dev_bypass_auth=False
            ).validate_production_security()
        assert "CRITICAL: Production deployment detected with insecure or default JWT_SECRET" in str(exc.value)

    def test_production_rejects_dev_bypass(self):
        with pytest.raises(ValueError) as exc:
            Settings(
                environment="production",
                jwt_secret="a" * 32,
                dev_bypass_auth=True
            ).validate_production_security()
        assert "CRITICAL: DEV_BYPASS_AUTH must be False in production" in str(exc.value)

    def test_production_accepts_strong_secret_and_no_bypass(self):
        s = Settings(
            environment="production",
            jwt_secret="secure-production-random-secret-key-at-least-32-chars-long",
            dev_bypass_auth=False
        )
        s.validate_production_security()  # Should not raise

    def test_dev_bypass_is_disabled_when_environment_is_production(self):
        with patch.object(settings, "environment", "production"):
            import asyncio
            from fastapi import HTTPException
            # In production, even with X-Dev-User-Id header, dev bypass must not trigger
            with pytest.raises(HTTPException) as exc:
                asyncio.run(get_current_user(authorization=None, x_dev_user_id="fake-user-id"))
            assert exc.value.status_code == 401
