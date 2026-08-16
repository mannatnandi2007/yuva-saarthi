# YUVAA Saarthi — Backend API Tests
# Reference: Execution Plan Phase 2 (testing requirements)
#
# Strategy:
#   - Mock the Supabase client so tests run without a real DB connection.
#   - Use the DEV_BYPASS_AUTH mechanism so tests run without real Supabase JWTs.
#   - Test the HTTP contract, auth enforcement, ownership rules, and mock AI flow.
#
# Run with:
#   cd backend
#   DEV_BYPASS_AUTH=true python -m pytest tests/ -v
#
# OR create a .env.test with DEV_BYPASS_AUTH=true and run:
#   python -m pytest tests/ -v

import os
import pytest
import uuid
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone

# ── Set dev bypass BEFORE importing the app so the dependency reads it ──────
os.environ["DEV_BYPASS_AUTH"] = "true"

from app.main import app  # noqa: E402 — must be after env var set

# ---------------------------------------------------------------------------
# Test client & shared fixtures
# ---------------------------------------------------------------------------

client = TestClient(app)

TEST_USER_ID = str(uuid.uuid4())
TEST_OTHER_USER_ID = str(uuid.uuid4())
TEST_SESSION_ID = str(uuid.uuid4())
TEST_MESSAGE_ID = str(uuid.uuid4())

# Convenience: default auth header for the test user
DEV_AUTH = {"X-Dev-User-Id": TEST_USER_ID}
OTHER_DEV_AUTH = {"X-Dev-User-Id": TEST_OTHER_USER_ID}

NOW_ISO = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Helper: build a fake Supabase "execute" result
# ---------------------------------------------------------------------------

def fake_result(data):
    """Return a mock object with a .data attribute, mimicking supabase-py responses."""
    m = MagicMock()
    m.data = data
    return m


def fake_single_result(data):
    """For queries that call .single().execute()."""
    m = MagicMock()
    m.data = data
    return m


# ===========================================================================
# 1. Health check
# ===========================================================================

class TestHealthCheck:
    def test_root_returns_healthy(self):
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "healthy"
        assert "docs_url" in body


# ===========================================================================
# 2. Authentication enforcement
# ===========================================================================

class TestAuthEnforcement:
    """Every protected endpoint must return 401 when no credentials are given."""

    def test_get_users_me_requires_auth(self):
        resp = client.get("/users/me")
        assert resp.status_code == 401

    def test_get_contacts_requires_auth(self):
        resp = client.get("/contacts")
        assert resp.status_code == 401

    def test_post_sessions_requires_auth(self):
        resp = client.post("/sessions")
        assert resp.status_code == 401

    def test_get_sessions_requires_auth(self):
        resp = client.get("/sessions")
        assert resp.status_code == 401

    def test_post_chat_requires_auth(self):
        resp = client.post("/chat", json={"session_id": TEST_SESSION_ID, "message": "hi"})
        assert resp.status_code == 401

    def test_get_chat_history_requires_auth(self):
        resp = client.get(f"/chat/history/{TEST_SESSION_ID}")
        assert resp.status_code == 401


# ===========================================================================
# 3. GET /users/me
# ===========================================================================

class TestGetUsersMe:
    @patch("app.routers.users.supabase")
    def test_returns_user_profile(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_USER_ID,
                "phone": "+919876543210",
                "age_band": "16-17",
                "created_at": NOW_ISO,
            })

        resp = client.get("/users/me", headers=DEV_AUTH)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == TEST_USER_ID
        assert body["phone"] == "+919876543210"
        assert body["age_band"] == "16-17"

    @patch("app.routers.users.supabase")
    def test_returns_404_when_user_not_in_db(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.side_effect = Exception("No rows returned")

        resp = client.get("/users/me", headers=DEV_AUTH)
        assert resp.status_code == 404


# ===========================================================================
# 4. GET /contacts
# ===========================================================================

class TestGetContacts:
    @patch("app.routers.users.supabase")
    def test_returns_contacts_list(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.execute.return_value = fake_result([
                {"id": str(uuid.uuid4()), "phone": "+911111111111", "relationship": "Parent", "priority_order": 1},
                {"id": str(uuid.uuid4()), "phone": "+912222222222", "relationship": "Friend", "priority_order": 2},
            ])

        resp = client.get("/contacts", headers=DEV_AUTH)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        assert body[0]["relationship"] == "Parent"
        assert body[0]["priority_order"] == 1

    @patch("app.routers.users.supabase")
    def test_returns_empty_list_when_no_contacts(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.execute.return_value = fake_result([])

        resp = client.get("/contacts", headers=DEV_AUTH)
        assert resp.status_code == 200
        assert resp.json() == []


# ===========================================================================
# 5. POST /sessions
# ===========================================================================

class TestCreateSession:
    @patch("app.services.chat_service.supabase")
    def test_creates_session_and_returns_id(self, mock_supabase):
        mock_supabase.table.return_value.insert.return_value.execute.return_value = fake_result([
            {"id": TEST_SESSION_ID, "user_id": TEST_USER_ID, "started_at": NOW_ISO}
        ])

        resp = client.post("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 201
        body = resp.json()
        assert body["session_id"] == TEST_SESSION_ID
        assert body["user_id"] == TEST_USER_ID


# ===========================================================================
# 6. GET /sessions
# ===========================================================================

class TestListSessions:
    @patch("app.services.chat_service.supabase")
    def test_returns_sessions_list(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.execute.return_value = fake_result([
                {"id": TEST_SESSION_ID, "user_id": TEST_USER_ID, "started_at": NOW_ISO, "summary_snapshot": None},
            ])

        resp = client.get("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 1
        assert body[0]["session_id"] == TEST_SESSION_ID

    @patch("app.services.chat_service.supabase")
    def test_returns_empty_list_when_no_sessions(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.execute.return_value = fake_result([])

        resp = client.get("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 200
        assert resp.json() == []


# ===========================================================================
# 7. POST /chat
# ===========================================================================

class TestChat:
    def _mock_supabase_for_chat(self, mock_supabase, owner_id=None):
        """Shared supabase mock setup for chat tests."""
        owner = owner_id or TEST_USER_ID

        # Ownership check: session lookup
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_SESSION_ID,
                "user_id": owner,
                "summary_snapshot": None,
            })

        # Message inserts (called twice: user msg + assistant msg)
        mock_supabase.table.return_value.insert.return_value.execute.return_value = fake_result([
            {"id": str(uuid.uuid4()), "session_id": TEST_SESSION_ID, "sender": "user",
             "content": "test", "created_at": NOW_ISO}
        ])

    @patch("app.services.chat_service.supabase")
    def test_chat_returns_reply(self, mock_supabase):
        self._mock_supabase_for_chat(mock_supabase)

        resp = client.post(
            "/chat",
            json={"session_id": TEST_SESSION_ID, "message": "Hello yaar"},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "reply" in body
        assert len(body["reply"]) > 0
        assert "risk_classification" in body
        assert body["risk_classification"]["severity"] in ("none", "low", "medium", "high")
        assert "action_taken" in body

    @patch("app.services.chat_service.supabase")
    def test_chat_normal_message_has_no_risk(self, mock_supabase):
        self._mock_supabase_for_chat(mock_supabase)

        resp = client.post(
            "/chat",
            json={"session_id": TEST_SESSION_ID, "message": "I am feeling okay today"},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["risk_classification"]["severity"] == "none"

    @patch("app.services.chat_service.supabase")
    def test_chat_self_harm_message_triggers_high_risk(self, mock_supabase):
        self._mock_supabase_for_chat(mock_supabase)

        resp = client.post(
            "/chat",
            json={"session_id": TEST_SESSION_ID, "message": "I want to kill myself"},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["risk_classification"]["severity"] == "high"
        assert body["risk_classification"]["category"] == "self_harm"

    @patch("app.services.chat_service.supabase")
    def test_chat_abuse_message_routes_to_helpline(self, mock_supabase):
        self._mock_supabase_for_chat(mock_supabase)

        resp = client.post(
            "/chat",
            json={"session_id": TEST_SESSION_ID, "message": "Papa marte hai abuse karte hai"},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["risk_classification"]["severity"] == "high"
        assert body["risk_classification"]["category"] == "abuse"
        assert body["action_taken"] == "routed_to_helpline"

    @patch("app.services.chat_service.supabase")
    def test_chat_rejects_session_owned_by_other_user(self, mock_supabase):
        """Security: user A cannot send messages to user B's session."""
        # Session is owned by TEST_OTHER_USER_ID
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_SESSION_ID,
                "user_id": TEST_OTHER_USER_ID,  # ← different owner
                "summary_snapshot": None,
            })

        resp = client.post(
            "/chat",
            json={"session_id": TEST_SESSION_ID, "message": "Can I access your session?"},
            headers=DEV_AUTH,  # ← TEST_USER_ID trying to access TEST_OTHER_USER_ID's session
        )
        assert resp.status_code == 403

    def test_chat_rejects_empty_message(self):
        resp = client.post(
            "/chat",
            json={"session_id": TEST_SESSION_ID, "message": ""},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 422  # Pydantic validation error (min_length=1)


# ===========================================================================
# 8. GET /chat/history/{session_id}
# ===========================================================================

class TestChatHistory:
    @patch("app.services.chat_service.supabase")
    def test_returns_message_history(self, mock_supabase):
        # First call: ownership check (single query)
        select_mock = mock_supabase.table.return_value.select.return_value
        select_mock.eq.return_value.single.return_value.execute.return_value = fake_single_result({
            "id": TEST_SESSION_ID, "user_id": TEST_USER_ID, "summary_snapshot": None
        })
        # Second call: message fetch
        select_mock.eq.return_value.order.return_value.execute.return_value = fake_result([
            {"id": str(uuid.uuid4()), "sender": "user", "content": "hello",
             "risk_tier": None, "created_at": NOW_ISO},
            {"id": str(uuid.uuid4()), "sender": "assistant", "content": "hi yaar",
             "risk_tier": None, "created_at": NOW_ISO},
        ])

        resp = client.get(f"/chat/history/{TEST_SESSION_ID}", headers=DEV_AUTH)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        assert body[0]["sender"] == "user"
        assert body[1]["sender"] == "assistant"

    @patch("app.services.chat_service.supabase")
    def test_history_rejects_other_users_session(self, mock_supabase):
        """Security: fetching another user's history must return 403."""
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_SESSION_ID,
                "user_id": TEST_OTHER_USER_ID,  # ← owned by other user
                "summary_snapshot": None,
            })

        resp = client.get(
            f"/chat/history/{TEST_SESSION_ID}",
            headers=DEV_AUTH,  # ← TEST_USER_ID requesting
        )
        assert resp.status_code == 403

    @patch("app.services.chat_service.supabase")
    def test_history_returns_404_for_nonexistent_session(self, mock_supabase):
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.side_effect = Exception("No rows")

        resp = client.get(f"/chat/history/{uuid.uuid4()}", headers=DEV_AUTH)
        assert resp.status_code == 404


# ===========================================================================
# 9. Swagger / OpenAPI docs load
# ===========================================================================

class TestSwaggerDocs:
    def test_openapi_schema_loads(self):
        resp = client.get("/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "YUVAA Saarthi Backend API"

    def test_swagger_ui_loads(self):
        resp = client.get("/docs")
        assert resp.status_code == 200
