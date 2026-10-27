import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user, AuthenticatedUser

client = TestClient(app)

def mock_auth_user():
    return AuthenticatedUser(
        user_id="user-phase4-0001",
        phone="+919876543210",
    )


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = mock_auth_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


class TestPhase4SessionManagement:
    """Tests for Phase 4 lazy session creation, clean UUIDs, and pagination."""

    @patch("app.routers.chat.list_sessions")
    def test_get_sessions_pagination_defaults(self, mock_list):
        """Verify GET /sessions passes default limit=50 and offset=0."""
        mock_list.return_value = [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "user_id": "user-phase4-0001",
                "started_at": "2026-10-27T12:00:00Z",
                "summary_snapshot": None,
                "heading": "Safe Space Chat",
            }
        ]

        resp = client.get("/sessions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["session_id"] == "11111111-1111-1111-1111-111111111111"
        mock_list.assert_called_once_with(user_id="user-phase4-0001", limit=50, offset=0)

    @patch("app.routers.chat.list_sessions")
    def test_get_sessions_custom_limit_offset(self, mock_list):
        """Verify GET /sessions accepts custom limit and offset query params."""
        mock_list.return_value = []

        resp = client.get("/sessions?limit=10&offset=20")
        assert resp.status_code == 200
        mock_list.assert_called_once_with(user_id="user-phase4-0001", limit=10, offset=20)

    @patch("app.services.chat_service.get_latest_session_summary", return_value="Prior session discussed exam anxiety.")
    @patch("app.services.chat_service.supabase")
    def test_create_session_seeds_prior_summary(self, mock_sb, mock_summary):
        """Verify create_session fetches and seeds previous session's summary."""
        from app.services.chat_service import create_session

        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[{
            "id": "22222222-2222-2222-2222-222222222222",
            "user_id": "user-phase4-0001",
            "started_at": "2026-10-27T12:05:00Z",
        }])

        with patch("app.services.summary_service.save_session_summary") as mock_save_summary:
            row = create_session("user-phase4-0001")
            assert row["id"] == "22222222-2222-2222-2222-222222222222"
            assert row["summary_snapshot"] == "Prior session discussed exam anxiety."
            mock_save_summary.assert_called_once_with(
                "22222222-2222-2222-2222-222222222222",
                "Prior session discussed exam anxiety."
            )

    def test_get_sessions_validation_bounds(self):
        """Verify validation errors on invalid limit / offset."""
        # limit < 1
        resp = client.get("/sessions?limit=0")
        assert resp.status_code == 422

        # limit > 100
        resp = client.get("/sessions?limit=101")
        assert resp.status_code == 422

        # negative offset
        resp = client.get("/sessions?offset=-1")
        assert resp.status_code == 422
