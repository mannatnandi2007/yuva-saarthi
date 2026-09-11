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
        # get_latest_session_summary: no prior session (first-time user)
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.limit.return_value.execute.return_value = fake_result([])
        # create_session insert
        mock_supabase.table.return_value.insert.return_value.execute.return_value = fake_result([
            {"id": TEST_SESSION_ID, "user_id": TEST_USER_ID, "started_at": NOW_ISO}
        ])

        resp = client.post("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 201
        body = resp.json()
        assert body["session_id"] == TEST_SESSION_ID
        assert body["user_id"] == TEST_USER_ID


# ===========================================================================
# 5b. Cross-Login Context — POST /sessions summary seeding
# ===========================================================================

class TestCrossLoginContext:
    """
    Tests for the Cross-Login Context API (PRD §3.2).

    Verifies that when a returning user creates a new session, the most recent
    previous session's summary_snapshot is fetched and seeded into the new
    session so the AI remembers past interactions from the very first message.
    """

    PRIOR_SUMMARY = "User has been experiencing exam anxiety and sleep issues for two weeks. Mentioned strained relationship with parents over academic pressure."

    def _make_select_mock(self, mock_supabase, rows):
        """Wire the select chain used by get_latest_session_summary."""
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.limit.return_value.execute.return_value = fake_result(rows)

    def _make_insert_mock(self, mock_supabase, session_id=None, user_id=None):
        """Wire the insert chain used by create_session."""
        sid = session_id or TEST_SESSION_ID
        uid = user_id or TEST_USER_ID
        mock_supabase.table.return_value.insert.return_value.execute.return_value = fake_result([
            {"id": sid, "user_id": uid, "started_at": NOW_ISO, "summary_snapshot": None}
        ])

    # -----------------------------------------------------------------------
    # Test 1: Previous session with a non-empty summary → new session seeded
    # -----------------------------------------------------------------------
    @patch("app.services.summary_service.supabase")
    @patch("app.services.chat_service.supabase")
    def test_new_session_seeded_with_prior_summary(self, mock_chat_sb, mock_summary_sb):
        """
        When a prior session exists with a non-empty summary_snapshot,
        create_session() must seed the new session with that summary.
        """
        # Prior session has a rich summary
        self._make_select_mock(mock_chat_sb, [{"summary_snapshot": self.PRIOR_SUMMARY}])
        self._make_insert_mock(mock_chat_sb)

        # save_session_summary will call supabase via summary_service.supabase
        mock_summary_sb.table.return_value.update.return_value \
            .eq.return_value.execute.return_value = fake_result([{"id": TEST_SESSION_ID}])

        from app.services.chat_service import create_session
        row = create_session(TEST_USER_ID)

        # The returned row must carry the seeded summary
        assert row["summary_snapshot"] == self.PRIOR_SUMMARY
        # Confirm save_session_summary (the UPDATE) was called on the summary table
        mock_summary_sb.table.assert_called_with("sessions")

    # -----------------------------------------------------------------------
    # Test 2: First-ever user — no prior sessions → summary_snapshot stays None
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_first_ever_session_has_no_summary(self, mock_supabase):
        """
        A brand-new user with zero prior sessions must get summary_snapshot=None.
        """
        self._make_select_mock(mock_supabase, [])  # no prior sessions
        self._make_insert_mock(mock_supabase)

        from app.services.chat_service import create_session
        row = create_session(TEST_USER_ID)

        # No summary to seed — the row comes back with None
        assert row.get("summary_snapshot") is None

    # -----------------------------------------------------------------------
    # Test 3: Prior session exists but summary_snapshot is NULL → new session clean
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_prior_session_with_null_summary_leaves_new_session_clean(self, mock_supabase):
        """
        If the previous session's summary_snapshot is NULL (e.g. session was
        created but the user never sent a message), the new session starts clean.
        """
        self._make_select_mock(mock_supabase, [{"summary_snapshot": None}])
        self._make_insert_mock(mock_supabase)

        from app.services.chat_service import create_session
        row = create_session(TEST_USER_ID)

        assert row.get("summary_snapshot") is None

    # -----------------------------------------------------------------------
    # Test 4: Prior session summary is empty/whitespace → new session clean
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_prior_session_with_empty_summary_leaves_new_session_clean(self, mock_supabase):
        """
        An empty-string or whitespace-only summary_snapshot must not be seeded.
        """
        for empty_val in ("", "   ", "\n"):
            self._make_select_mock(mock_supabase, [{"summary_snapshot": empty_val}])
            self._make_insert_mock(mock_supabase)

            from app.services.chat_service import create_session
            row = create_session(TEST_USER_ID)

            assert row.get("summary_snapshot") is None, \
                f"Expected None for empty prior summary '{repr(empty_val)}', got {row.get('summary_snapshot')!r}"

    # -----------------------------------------------------------------------
    # Test 5: Supabase lookup failure → session creation still succeeds
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_supabase_lookup_failure_does_not_break_session_creation(self, mock_supabase):
        """
        If the Supabase query for the prior summary throws an exception,
        create_session() must still complete successfully with summary_snapshot=None.
        Graceful degradation: a missing prior summary must never block the user.
        """
        # Make the select chain raise an exception
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.order.return_value.limit.return_value.execute.side_effect = Exception("DB timeout")
        # Insert still succeeds
        self._make_insert_mock(mock_supabase)

        resp = client.post("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 201
        body = resp.json()
        assert body["session_id"] == TEST_SESSION_ID
        # No summary available — falls back gracefully
        # (summary_snapshot is not part of SessionCreateResponse schema,
        #  but session creation must not 500)

    # -----------------------------------------------------------------------
    # Test 6: User isolation — user A cannot receive user B's summary
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_prior_summary_scoped_to_authenticated_user(self, mock_supabase):
        """
        Security: get_latest_session_summary() must filter by user_id.
        Verify the .eq() call is made with the correct user_id, so user A
        can never receive user B's conversation context.
        """
        self._make_select_mock(mock_supabase, [])  # simulate no sessions for this user
        self._make_insert_mock(mock_supabase)

        from app.services.chat_service import get_latest_session_summary
        # Call the helper directly with a specific user_id
        get_latest_session_summary(TEST_USER_ID)

        # Verify .eq() was called with the correct user_id on the sessions table
        mock_supabase.table.assert_called_with("sessions")
        eq_call_args = mock_supabase.table.return_value.select.return_value.eq.call_args
        assert eq_call_args is not None, ".eq() was never called on the sessions query"
        assert eq_call_args[0] == ("user_id", TEST_USER_ID), (
            f"Expected .eq('user_id', '{TEST_USER_ID}') but got {eq_call_args[0]}"
        )

    # -----------------------------------------------------------------------
    # Test 7: First chat message in seeded session passes prior context to LLM
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_first_chat_message_in_seeded_session_uses_prior_summary(self, mock_supabase):
        """
        End-to-end flow: when the new session was seeded with a prior summary,
        the first POST /chat call must pass that summary as rolling_summary to
        get_ai_response(), so the LLM has cross-session memory from turn 1.

        Patch target is 'app.services.chat_service.get_ai_response' because
        chat_service.py imports the function by name at module load time:
            from app.services.llm_service import get_ai_response
        Patching the name in the calling module's namespace is the correct way
        to intercept calls made through an already-bound reference.
        """
        # Mock validate_session_ownership: returns session with the seeded summary
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_SESSION_ID,
                "user_id": TEST_USER_ID,
                "summary_snapshot": self.PRIOR_SUMMARY,  # ← seeded from prior session
            })
        # Message inserts (user msg + assistant msg)
        mock_supabase.table.return_value.insert.return_value.execute.return_value = fake_result([
            {"id": str(uuid.uuid4()), "session_id": TEST_SESSION_ID,
             "sender": "user", "content": "hello", "created_at": NOW_ISO}
        ])

        from app.services.llm_service import AIResponse

        # AsyncMock is required because send_chat_message() awaits get_ai_response()
        mock_ai = AsyncMock(return_value=AIResponse(
            reply="Main yahaan hoon, batao.",
            severity="none",
            category="none",
            rationale="Normal conversation",
        ))

        # Patch in the calling module's namespace so the already-bound import is intercepted
        with patch("app.services.chat_service.get_ai_response", mock_ai):
            resp = client.post(
                "/chat",
                json={"session_id": TEST_SESSION_ID, "message": "Hi, I'm back."},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 200

        # Confirm the mock was actually called (i.e. the chat endpoint ran fully)
        assert mock_ai.called, "get_ai_response was never invoked — check the chat pipeline"

        # Extract the rolling_summary kwarg that was passed to get_ai_response
        call_kwargs = mock_ai.call_args.kwargs
        actual_summary = call_kwargs.get("rolling_summary")
        assert actual_summary == self.PRIOR_SUMMARY, (
            f"Expected rolling_summary to equal the seeded prior summary, "
            f"got: {actual_summary!r}"
        )

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


# ===========================================================================
# 10. Signup validation (emergency contact matching & duplicates)
# ===========================================================================

class TestSignupValidation:
    def test_signup_rejects_contact_with_same_number_as_user(self):
        payload = {
            "username": "user_conflict",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+919876543210",
            "age_band": "16-17",
            "consent_given": True,
            "policy_ack": True,
            "emergency_contacts": [
                {
                    "first_name": "Dad",
                    "last_name": "User",
                    "phone": "+919876543210", 
                    "relationship": "Parent", 
                    "priority_order": 1
                }
            ]
        }
        resp = client.post("/auth/signup", json=payload)
        assert resp.status_code == 400
        assert "cannot be the same as your own phone number" in resp.json()["detail"]

    def test_signup_rejects_duplicate_contacts(self):
        payload = {
            "username": "user_dup",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+919876543210",
            "age_band": "16-17",
            "consent_given": True,
            "policy_ack": True,
            "emergency_contacts": [
                {
                    "first_name": "Mom",
                    "last_name": "User",
                    "phone": "+919876543211", 
                    "relationship": "Parent", 
                    "priority_order": 1
                },
                {
                    "first_name": "Dad",
                    "last_name": "User",
                    "phone": "+919876543211", 
                    "relationship": "Guardian", 
                    "priority_order": 2
                }
            ]
        }
        resp = client.post("/auth/signup", json=payload)
        assert resp.status_code == 400
        assert "Duplicate emergency contact numbers" in resp.json()["detail"]

    def test_signup_accepts_distinct_contacts_and_unique_username(self):
        payload = {
            "username": "unique_student_1",
            "first_name": "Aarav",
            "last_name": "Sharma",
            "phone": "+919876543210",
            "age_band": "16-17",
            "consent_given": True,
            "policy_ack": True,
            "emergency_contacts": [
                {
                    "first_name": "Rajesh",
                    "last_name": "Sharma",
                    "phone": "+919876543211", 
                    "relationship": "Parent", 
                    "priority_order": 1
                }
            ]
        }
        resp = client.post("/auth/signup", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["username"] == "unique_student_1"
        assert data["first_name"] == "Aarav"

        # Try signing up with same username -> must fail 400
        resp_dup = client.post("/auth/signup", json=payload)
        assert resp_dup.status_code == 400
        assert "already taken" in resp_dup.json()["detail"]

    def test_login_with_registered_username(self):
        # Log in with the previously registered username
        resp = client.post("/auth/login", json={"username": "unique_student_1"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["username"] == "unique_student_1"

    def test_login_rejects_unknown_username(self):
        resp = client.post("/auth/login", json={"username": "ghost_user_99999"})
        assert resp.status_code == 404



# ===========================================================================
# 11. Phase 3: Risk Classification (POST /risk/check)
# ===========================================================================

class TestRiskClassification:
    def test_risk_check_benign_message(self):
        resp = client.post("/risk/check", json={
            "user_id": TEST_USER_ID,
            "message_content": "I am having lunch with my friend today"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["severity"] == "none"
        assert data["category"] == "none"
        assert data["action_taken"] == "logged_only"

    def test_risk_check_self_harm_triggers_call_action(self):
        resp = client.post("/risk/check", json={
            "user_id": TEST_USER_ID,
            "message_content": "I want to end my life, please help"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["severity"] == "high"
        assert data["category"] == "self_harm"
        assert data["action_taken"] == "call_placed"

    def test_risk_check_abuse_triggers_rule_3_4a_bypass(self):
        resp = client.post("/risk/check", json={
            "user_id": TEST_USER_ID,
            "message_content": "papa maarte hai roz bohot ganda"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["severity"] == "high"
        assert data["category"] == "abuse"
        assert data["action_taken"] == "routed_to_helpline"


# ===========================================================================
# 12. Phase 3: Bland AI Voice Escalation (POST /escalation/trigger)
# ===========================================================================

class TestBlandAIEscalation:
    def test_escalation_dispatches_bland_call_for_self_harm(self):
        payload = {
            "user_id": TEST_USER_ID,
            "severity": "high",
            "category": "self_harm",
            "contact_phone": "+919876543211",
            "contact_name": "Father",
            "contact_relationship": "Parent"
        }
        resp = client.post("/escalation/trigger", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "escalation_triggered"
        assert data["action_taken"] == "call_placed"
        assert data["call_dispatched"] is True
        assert "call_details" in data
        assert "call_id" in data["call_details"]

    def test_escalation_aborts_call_for_abuse(self):
        payload = {
            "user_id": TEST_USER_ID,
            "severity": "high",
            "category": "abuse",
            "contact_phone": "+919876543211",
            "contact_name": "Parent"
        }
        resp = client.post("/escalation/trigger", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "bypassed_safeguard"
        assert data["action_taken"] == "routed_to_helpline"
        assert data["call_dispatched"] is False
        assert "Rule §3.4a" in data["details"]


# ===========================================================================
# 13. Phase 4: RAG Retrieval & Prompt Context (POST /rag/retrieve)
# ===========================================================================

class TestPhase4RAG:
    def test_rag_retrieves_exam_guidelines(self):
        resp = client.post("/rag/retrieve", json={
            "query_text": "I am feeling so anxious about exams and study pressure",
            "limit": 2
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        results = data["results"]
        sources = [r["source"] for r in results]
        assert any("NIMHANS" in s for s in sources)
        assert any("Academic Pressure" in r["title"] for r in results)

    def test_rag_retrieves_grounding_for_panic(self):
        resp = client.post("/rag/retrieve", json={
            "query_text": "mujhe bohot panic aur darr lag raha hai can't breathe",
            "limit": 2
        })
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]
        assert any("5-4-3-2-1" in r["guideline"] or "Physiological Sigh" in r["guideline"] for r in results)

    def test_rag_retrieves_loneliness_guideline(self):
        resp = client.post("/rag/retrieve", json={
            "query_text": "I feel completely alone and isolated, koi nahi hai mere sath",
            "limit": 2
        })
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]
        assert any("ICMR" in r["source"] or "Isolation" in r["title"] for r in results)


# ===========================================================================
# 14. Phase 4: Rolling Summary Generator & Prompt Injection
# ===========================================================================

class TestPhase4RollingSummary:
    def test_summary_generation_and_word_cap(self):
        from app.services.summary_service import generate_rolling_summary
        summary = generate_rolling_summary(
            existing_summary=None,
            user_message="I have been unable to sleep because of college entrance exam results coming out tomorrow.",
            assistant_reply="It is completely understandable to feel tense. Take slow breaths, you are doing your best."
        )
        assert isinstance(summary, str)
        assert len(summary) > 0
        word_count = len(summary.split())
        assert word_count <= 150

    def test_summary_accumulation_across_turns(self):
        from app.services.summary_service import generate_rolling_summary
        s1 = generate_rolling_summary(None, "I had a fight with my best friend.", "I am sorry to hear that.")
        s2 = generate_rolling_summary(s1, "Now they are ignoring my texts.", "Give them a bit of space.")
        assert len(s2.split()) <= 150

    def test_rag_prompt_context_builder(self):
        from app.services.rag_service import build_rag_prompt_context
        ctx = build_rag_prompt_context("exam stress padhai marks")
        assert "EVIDENCE-BASED COUNSELING GUIDELINES" in ctx
        assert "NIMHANS" in ctx


# ===========================================================================
# 15. Phase 4: Support Retrieval APIs (Khushal)
#     Covers POST /rag/ingest, GET /rag/files, POST /rag/scan
#     and validation edge cases on POST /rag/retrieve.
# ===========================================================================

class TestPhase4SupportRetrievalAPIs:
    """
    Phase 4 — Support Retrieval APIs (PRD §4 pgvector + §6 RAG ingestion).

    Tests the full retrieval API surface:
      - POST /rag/ingest  : happy path + empty-embedding rejection
      - POST /rag/retrieve: empty query_text rejection (validation edge case)
      - GET  /rag/files   : folder scan listing
      - POST /rag/scan    : cache refresh + chunk count

    Notes on patch targets:
      - /rag/ingest uses a module-level `supabase` import in rag.py, so we
        patch `app.routers.rag.supabase`.
      - /rag/files and /rag/scan use LAZY in-function imports
        (`from app.services.folder_rag_service import ...`). Python resolves
        these against the service module's namespace at call time, so the
        correct patch target is `app.services.folder_rag_service.<name>`.
    """

    # 1536-dimension embedding vector (OpenAI text-embedding-3-small spec)
    SAMPLE_EMBEDDING = [0.01] * 1536

    # -----------------------------------------------------------------------
    # Test 1: POST /rag/ingest — happy path stores chunk and returns id
    # -----------------------------------------------------------------------
    @patch("app.routers.rag.supabase")
    def test_ingest_stores_document_chunk(self, mock_supabase):
        """
        A valid ingest payload with a non-empty embedding must:
          - Return HTTP 201 Created
          - Return status=="success", the DB-assigned id, and embedding_dims==1536
        """
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            fake_result([{"id": "rag-doc-uuid-001"}])

        resp = client.post("/rag/ingest", json={
            "source": "NIMHANS Youth Mental Health Protocol",
            "title": "Exam Stress Section 1",
            "chunk_text": "Acknowledge academic pressure without dismissal.",
            "embedding": self.SAMPLE_EMBEDDING,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "success"
        assert data["id"] == "rag-doc-uuid-001"
        assert data["embedding_dims"] == 1536

    # -----------------------------------------------------------------------
    # Test 2: POST /rag/ingest — empty embedding list is rejected (400)
    # -----------------------------------------------------------------------
    def test_ingest_rejects_empty_embedding(self):
        """
        An empty embedding list must be rejected with HTTP 400 before any
        DB call is made. The error detail must explain the constraint.
        """
        resp = client.post("/rag/ingest", json={
            "source": "WHO",
            "title": "Grounding Techniques",
            "chunk_text": "Breathe slowly and ground yourself.",
            "embedding": [],
        })
        assert resp.status_code == 400
        assert "Embedding vector cannot be empty" in resp.json()["detail"]

    # -----------------------------------------------------------------------
    # Test 3: POST /rag/retrieve — blank query_text rejected (400)
    # -----------------------------------------------------------------------
    def test_retrieve_rejects_empty_query(self):
        """
        A query_text that is empty or whitespace-only must return HTTP 400.
        This validates the guard in the /retrieve endpoint before any
        retrieval work begins.
        """
        for blank in ("", "   ", "\t"):
            resp = client.post("/rag/retrieve", json={"query_text": blank, "limit": 2})
            assert resp.status_code == 400, (
                f"Expected 400 for blank query_text={blank!r}, got {resp.status_code}"
            )
            assert "query_text cannot be empty" in resp.json()["detail"]

    # -----------------------------------------------------------------------
    # Test 4: GET /rag/files — returns structured file listing
    # -----------------------------------------------------------------------
    @patch("app.services.folder_rag_service.scan_and_chunk_folder")
    def test_rag_files_returns_file_listing(self, mock_scan):
        """
        GET /rag/files must return:
          - HTTP 200
          - total_files: count of distinct source filenames
          - total_chunks: total number of chunks across all files
          - files[]: list of {filename, chunks_count}
        Patch target is the service module because rag.py imports lazily
        inside the function body with `from app.services.folder_rag_service import ...`.
        """
        mock_scan.return_value = [
            {"source": "who_guidelines.txt", "id": "who-1",
             "title": "WHO Sec 1", "chunk_text": "..."},
            {"source": "who_guidelines.txt", "id": "who-2",
             "title": "WHO Sec 2", "chunk_text": "..."},
            {"source": "nimhans_protocol.md", "id": "nim-1",
             "title": "NIMHANS Sec 1", "chunk_text": "..."},
        ]

        resp = client.get("/rag/files")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_files"] == 2
        assert data["total_chunks"] == 3
        filenames = [f["filename"] for f in data["files"]]
        assert "who_guidelines.txt" in filenames
        assert "nimhans_protocol.md" in filenames
        # Chunk counts per file
        file_map = {f["filename"]: f["chunks_count"] for f in data["files"]}
        assert file_map["who_guidelines.txt"] == 2
        assert file_map["nimhans_protocol.md"] == 1

    # -----------------------------------------------------------------------
    # Test 5: POST /rag/scan — invalidates cache and returns chunk count
    # -----------------------------------------------------------------------
    @patch("app.services.folder_rag_service.scan_and_chunk_folder")
    @patch("app.services.folder_rag_service.refresh_folder_rag")
    def test_rag_scan_returns_success(self, mock_refresh, mock_scan):
        """
        POST /rag/scan must:
          - Call refresh_folder_rag() to invalidate the MiniLM embedding cache
          - Call scan_and_chunk_folder() to re-index
          - Return HTTP 200 with status=="success" and the correct total_chunks
        """
        mock_scan.return_value = [
            {"source": "research.docx", "id": f"r-{i}",
             "title": f"Research Sec {i}", "chunk_text": "..."}
            for i in range(7)  # simulate 7 chunks after re-scan
        ]

        resp = client.post("/rag/scan")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["total_chunks"] == 7
        assert "re-scanned" in data["message"].lower()
        # Verify cache was actually invalidated before re-indexing
        mock_refresh.assert_called_once()
        mock_scan.assert_called_once()


# ===========================================================================
# Phase 6 — DELETE /sessions/{session_id}  (single-delete, previously untested)
# ===========================================================================

class TestSingleDeleteSession:
    """
    Covers the DELETE /sessions/{session_id} endpoint.
    These scenarios were not previously tested.
    """

    def _mock_session_owned_by(self, mock_supabase, owner_id):
        """Wire validate_session_ownership to return a session owned by owner_id."""
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_SESSION_ID,
                "user_id": owner_id,
                "summary_snapshot": None,
            })
        # delete calls (messages then sessions)
        mock_supabase.table.return_value.delete.return_value \
            .eq.return_value.execute.return_value = fake_result([])

    @patch("app.services.chat_service.supabase")
    def test_single_delete_returns_success(self, mock_supabase):
        """DELETE /sessions/{id} owned by the authenticated user returns 200."""
        self._mock_session_owned_by(mock_supabase, TEST_USER_ID)

        resp = client.delete(f"/sessions/{TEST_SESSION_ID}", headers=DEV_AUTH)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["deleted_count"] == 1
        assert body["session_id"] == TEST_SESSION_ID

    @patch("app.services.chat_service.supabase")
    def test_single_delete_rejects_other_users_session(self, mock_supabase):
        """DELETE /sessions/{id} for a session owned by another user returns 403."""
        self._mock_session_owned_by(mock_supabase, TEST_OTHER_USER_ID)

        resp = client.delete(f"/sessions/{TEST_SESSION_ID}", headers=DEV_AUTH)
        assert resp.status_code == 403

    @patch("app.services.chat_service.supabase")
    def test_single_delete_returns_404_for_nonexistent_session(self, mock_supabase):
        """DELETE /sessions/{id} for a session that doesn't exist returns 404."""
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.side_effect = Exception("No rows found")

        resp = client.delete(f"/sessions/{uuid.uuid4()}", headers=DEV_AUTH)
        assert resp.status_code == 404

    def test_single_delete_requires_auth(self):
        """DELETE /sessions/{id} without auth header returns 401."""
        resp = client.delete(f"/sessions/{TEST_SESSION_ID}")
        assert resp.status_code == 401


# ===========================================================================
# Phase 6 — DELETE /sessions  (delete-all, previously untested)
# ===========================================================================

class TestDeleteAllSessions:
    """Covers the DELETE /sessions (delete-all) endpoint."""

    @patch("app.services.chat_service.supabase")
    def test_delete_all_returns_count(self, mock_supabase):
        """DELETE /sessions wipes all sessions and returns the count."""
        session_id_2 = str(uuid.uuid4())
        # Fetch user's session IDs
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.execute.return_value = fake_result([
                {"id": TEST_SESSION_ID},
                {"id": session_id_2},
            ])
        # Per-session message deletes + final session delete
        mock_supabase.table.return_value.delete.return_value \
            .eq.return_value.execute.return_value = fake_result([])

        resp = client.delete("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["deleted_count"] == 2

    @patch("app.services.chat_service.supabase")
    def test_delete_all_returns_zero_when_no_sessions(self, mock_supabase):
        """DELETE /sessions for a user with no sessions returns deleted_count=0."""
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.execute.return_value = fake_result([])

        resp = client.delete("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 200
        assert resp.json()["deleted_count"] == 0

    def test_delete_all_requires_auth(self):
        resp = client.delete("/sessions")
        assert resp.status_code == 401


# ===========================================================================
# Phase 6 — POST /chat/sessions/batch-delete
# ===========================================================================

class TestBatchDeleteSessions:
    """
    Comprehensive tests for POST /chat/sessions/batch-delete.

    Scenarios:
      1.  Successful deletion of multiple sessions
      2.  Empty session_ids list rejected (422)
      3.  Missing session_ids key rejected (422)
      4.  Requires authentication (401)
      5.  Another user's session cannot be deleted (403, no partial deletes)
      6.  Single nonexistent session returns 404
      7.  Mix of valid + nonexistent session aborts batch (404, no deletes)
      8.  Duplicate IDs are deduplicated (only deleted once)
      9.  Cache invalidated for every deleted session
      10. Single-item list works (minimum valid batch)
      11. Batch with local/dev session IDs is silently skipped
      12. Existing single-delete and delete-all endpoints still work
          (regression guard)
    """

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    SESSION_A = str(uuid.uuid4())
    SESSION_B = str(uuid.uuid4())

    def _mock_owned_session(self, mock_supabase, session_id, owner_id=None):
        """
        Wire validate_session_ownership for a single session lookup so that
        .single().execute() returns the expected owner.

        Because unittest.mock chains return the SAME mock object for each
        chained call by default, we wire the final .execute() return value
        and rely on the mock absorbing the intervening .eq() chain.
        """
        owner = owner_id or TEST_USER_ID
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": session_id,
                "user_id": owner,
                "summary_snapshot": None,
            })
        # DB deletes (messages then session)
        mock_supabase.table.return_value.delete.return_value \
            .eq.return_value.execute.return_value = fake_result([])

    # -----------------------------------------------------------------------
    # Test 1: Successful multi-session deletion
    # -----------------------------------------------------------------------
    def test_batch_delete_multiple_sessions(self):
        """
        Deleting two owned sessions returns 200 with deleted_count == 2.
        We patch delete_session() directly to isolate the HTTP layer from
        the DB layer, since the multi-mock chain for two distinct session IDs
        cannot be cleanly differentiated via a single MagicMock.
        """
        with patch("app.services.chat_service.delete_session") as mock_del, \
             patch("app.services.chat_service.validate_session_ownership") as mock_val:
            mock_val.return_value = {"id": self.SESSION_A, "user_id": TEST_USER_ID, "summary_snapshot": None}
            mock_del.return_value = True

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [self.SESSION_A, self.SESSION_B]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["deleted_count"] == 2
        assert "batch deleted" in body["message"].lower()
        assert body["session_id"] is None

    # -----------------------------------------------------------------------
    # Test 2: Empty session_ids list is rejected (Pydantic min_length=1)
    # -----------------------------------------------------------------------
    def test_batch_delete_rejects_empty_list(self):
        """An empty session_ids list must be rejected with HTTP 422."""
        resp = client.post(
            "/chat/sessions/batch-delete",
            json={"session_ids": []},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 422

    # -----------------------------------------------------------------------
    # Test 3: Missing session_ids field
    # -----------------------------------------------------------------------
    def test_batch_delete_rejects_missing_field(self):
        """A request body with no session_ids key must be rejected with HTTP 422."""
        resp = client.post(
            "/chat/sessions/batch-delete",
            json={},
            headers=DEV_AUTH,
        )
        assert resp.status_code == 422

    # -----------------------------------------------------------------------
    # Test 4: Requires authentication
    # -----------------------------------------------------------------------
    def test_batch_delete_requires_auth(self):
        """POST /chat/sessions/batch-delete without an auth header returns 401."""
        resp = client.post(
            "/chat/sessions/batch-delete",
            json={"session_ids": [self.SESSION_A]},
        )
        assert resp.status_code == 401

    # -----------------------------------------------------------------------
    # Test 5: Ownership enforcement — another user's session aborts the batch
    # -----------------------------------------------------------------------
    def test_batch_delete_rejects_other_users_session(self):
        """
        If any session in the list belongs to another user, the entire batch
        is aborted and 403 is returned. No sessions must be deleted.
        """
        with patch("app.services.chat_service.validate_session_ownership") as mock_val, \
             patch("app.services.chat_service.delete_session") as mock_del:

            # First session is fine; second is owned by someone else
            def ownership_side_effect(session_id, user_id):
                if session_id == self.SESSION_B:
                    from fastapi import HTTPException, status as st
                    raise HTTPException(
                        status_code=st.HTTP_403_FORBIDDEN,
                        detail="You do not have access to this session.",
                    )
                return {"id": session_id, "user_id": user_id, "summary_snapshot": None}

            mock_val.side_effect = ownership_side_effect

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [self.SESSION_A, self.SESSION_B]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 403
        # Crucially: delete_session() must NOT have been called at all
        mock_del.assert_not_called()

    # -----------------------------------------------------------------------
    # Test 6: Nonexistent session returns 404
    # -----------------------------------------------------------------------
    def test_batch_delete_returns_404_for_nonexistent_session(self):
        """
        A session that does not exist must produce a 404 and abort the batch.
        """
        with patch("app.services.chat_service.validate_session_ownership") as mock_val, \
             patch("app.services.chat_service.delete_session") as mock_del:

            from fastapi import HTTPException, status as st
            mock_val.side_effect = HTTPException(
                status_code=st.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [str(uuid.uuid4())]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 404
        mock_del.assert_not_called()

    # -----------------------------------------------------------------------
    # Test 7: Mix of valid + nonexistent session aborts entire batch
    # -----------------------------------------------------------------------
    def test_batch_delete_aborts_on_first_nonexistent_session(self):
        """
        If the batch contains [valid_id, missing_id], the missing_id triggers
        404 during pre-validation and NO sessions are deleted.
        """
        with patch("app.services.chat_service.validate_session_ownership") as mock_val, \
             patch("app.services.chat_service.delete_session") as mock_del:

            from fastapi import HTTPException, status as st

            def ownership_side_effect(session_id, user_id):
                if session_id == self.SESSION_B:
                    raise HTTPException(
                        status_code=st.HTTP_404_NOT_FOUND,
                        detail="Session not found.",
                    )
                return {"id": session_id, "user_id": user_id, "summary_snapshot": None}

            mock_val.side_effect = ownership_side_effect

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [self.SESSION_A, self.SESSION_B]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 404
        mock_del.assert_not_called()

    # -----------------------------------------------------------------------
    # Test 8: Duplicate IDs are deduplicated — delete_session() called once per unique ID
    # -----------------------------------------------------------------------
    def test_batch_delete_deduplicates_ids(self):
        """
        If the same session ID appears twice in the request, it must only be
        deleted once. deleted_count must equal the number of unique IDs.
        """
        with patch("app.services.chat_service.validate_session_ownership") as mock_val, \
             patch("app.services.chat_service.delete_session") as mock_del:

            mock_val.return_value = {
                "id": self.SESSION_A, "user_id": TEST_USER_ID, "summary_snapshot": None
            }
            mock_del.return_value = True

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [self.SESSION_A, self.SESSION_A, self.SESSION_A]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["deleted_count"] == 1           # only 1 unique ID
        assert mock_del.call_count == 1             # delete_session called exactly once
        assert mock_val.call_count == 1             # validate called exactly once

    # -----------------------------------------------------------------------
    # Test 9: Cache (_IN_MEMORY_SUMMARIES) is invalidated for every deleted session
    # -----------------------------------------------------------------------
    def test_batch_delete_clears_in_memory_cache(self):
        """
        After a successful batch delete, the in-memory summary cache must
        contain no entries for the deleted session IDs.
        """
        from app.services.summary_service import _IN_MEMORY_SUMMARIES

        # Pre-populate the cache for both sessions
        _IN_MEMORY_SUMMARIES[self.SESSION_A] = "Some prior summary A"
        _IN_MEMORY_SUMMARIES[self.SESSION_B] = "Some prior summary B"

        with patch("app.services.chat_service.validate_session_ownership") as mock_val, \
             patch("app.services.chat_service.supabase") as mock_sb:

            mock_val.return_value = {
                "id": self.SESSION_A, "user_id": TEST_USER_ID, "summary_snapshot": None
            }
            # DB deletes succeed silently
            mock_sb.table.return_value.delete.return_value \
                .eq.return_value.execute.return_value = fake_result([])

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [self.SESSION_A, self.SESSION_B]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 200
        # Both cache entries must be gone
        assert self.SESSION_A not in _IN_MEMORY_SUMMARIES, \
            f"Cache entry for SESSION_A was not cleared after batch delete"
        assert self.SESSION_B not in _IN_MEMORY_SUMMARIES, \
            f"Cache entry for SESSION_B was not cleared after batch delete"

    # -----------------------------------------------------------------------
    # Test 10: Single-item list (minimum valid batch)
    # -----------------------------------------------------------------------
    def test_batch_delete_single_item_list(self):
        """A list with exactly one session ID is the minimum valid batch."""
        with patch("app.services.chat_service.validate_session_ownership") as mock_val, \
             patch("app.services.chat_service.delete_session") as mock_del:

            mock_val.return_value = {
                "id": self.SESSION_A, "user_id": TEST_USER_ID, "summary_snapshot": None
            }
            mock_del.return_value = True

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [self.SESSION_A]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 200
        assert resp.json()["deleted_count"] == 1

    # -----------------------------------------------------------------------
    # Test 11: Local/dev session IDs bypass DB ownership check
    # -----------------------------------------------------------------------
    def test_batch_delete_handles_local_session_ids(self):
        """
        Transient session IDs (prefixed 'local-') must be handled gracefully.
        delete_session() already skips DB operations for them; the batch
        endpoint must not fail on these IDs.
        """
        local_id = "local-test-session-1"
        with patch("app.services.chat_service.supabase") as mock_sb:
            # No DB calls should occur for local sessions
            mock_sb.table.return_value.delete.return_value \
                .eq.return_value.execute.return_value = fake_result([])

            resp = client.post(
                "/chat/sessions/batch-delete",
                json={"session_ids": [local_id]},
                headers=DEV_AUTH,
            )

        assert resp.status_code == 200
        assert resp.json()["deleted_count"] == 1

    # -----------------------------------------------------------------------
    # Test 12: Regression — existing single-delete and delete-all still work
    # -----------------------------------------------------------------------
    @patch("app.services.chat_service.supabase")
    def test_existing_single_delete_still_works(self, mock_supabase):
        """
        Regression guard: DELETE /sessions/{session_id} must be unaffected
        by the addition of the batch-delete endpoint.
        """
        # Session owned by test user
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.single.return_value.execute.return_value = fake_single_result({
                "id": TEST_SESSION_ID,
                "user_id": TEST_USER_ID,
                "summary_snapshot": None,
            })
        mock_supabase.table.return_value.delete.return_value \
            .eq.return_value.execute.return_value = fake_result([])

        resp = client.delete(f"/sessions/{TEST_SESSION_ID}", headers=DEV_AUTH)
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    @patch("app.services.chat_service.supabase")
    def test_existing_delete_all_still_works(self, mock_supabase):
        """
        Regression guard: DELETE /sessions must be unaffected by the addition
        of the batch-delete endpoint.
        """
        mock_supabase.table.return_value.select.return_value \
            .eq.return_value.execute.return_value = fake_result([
                {"id": TEST_SESSION_ID},
            ])
        mock_supabase.table.return_value.delete.return_value \
            .eq.return_value.execute.return_value = fake_result([])

        resp = client.delete("/sessions", headers=DEV_AUTH)
        assert resp.status_code == 200
        assert resp.json()["deleted_count"] == 1

