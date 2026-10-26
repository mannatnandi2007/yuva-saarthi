# Yuva Saarthi — Phase 3 & 5 Escalation Loop & Safety Tests (Mannat)
# Tests:
# 1. Sequential retry escalation loop across priority contacts (1 -> 2 -> 3)
# 2. alert_attempts table insert logging
# 3. Abuse bypass rule §3.4a end-to-end enforcement
# 4. Full chat escalation to Bland AI for high-risk self-harm

import os
import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

os.environ["DEV_BYPASS_AUTH"] = "true"

from app.main import app
from app.services.bland_ai import (
    trigger_bland_ai_call,
    log_alert_attempt,
    trigger_sequential_escalation,
)

client = TestClient(app)

TEST_USER_ID = str(uuid.uuid4())
TEST_SESSION_ID = str(uuid.uuid4())
DEV_AUTH = {"X-Dev-User-Id": TEST_USER_ID}


def fake_result(data):
    m = MagicMock()
    m.data = data
    return m


# ===========================================================================
# 1. Sequential Escalation Loop & Alert Attempts Logging
# ===========================================================================

class TestSequentialEscalationLoop:
    """Test sequential loop across contacts and alert_attempts logging."""

    def test_single_contact_escalation(self):
        result = trigger_sequential_escalation(
            user_id=TEST_USER_ID,
            category="self_harm",
            severity="high",
            contacts=[{
                "id": str(uuid.uuid4()),
                "phone": "+919876543210",
                "relationship": "Mother",
                "first_name": "Mom",
                "priority_order": 1
            }],
            stop_on_first_answer=True
        )
        assert result["status"] == "escalation_triggered"
        assert result["action_taken"] == "call_placed"
        assert result["call_dispatched"] is True
        assert result["total_attempts"] == 1
        assert result["attempts"][0]["relationship"] == "Mother"
        assert result["attempts"][0]["attempt_order"] == 1

    def test_multi_contact_sequential_escalation_simulation(self):
        """Test loop dials sequentially across all contacts when stop_on_first_answer=False."""
        c1 = {"id": str(uuid.uuid4()), "phone": "+919876543211", "first_name": "Father", "priority_order": 1}
        c2 = {"id": str(uuid.uuid4()), "phone": "+919876543212", "first_name": "Sister", "priority_order": 2}
        c3 = {"id": str(uuid.uuid4()), "phone": "+919876543213", "first_name": "Brother", "priority_order": 3}

        result = trigger_sequential_escalation(
            user_id=TEST_USER_ID,
            category="self_harm",
            severity="high",
            contacts=[c3, c1, c2],  # Out of order to verify sorting
            stop_on_first_answer=False
        )
        assert result["total_attempts"] == 3
        # Ensure ordered by priority 1 -> 2 -> 3
        orders = [a["attempt_order"] for a in result["attempts"]]
        assert orders == [1, 2, 3]
        assert result["attempts"][0]["contact_name"] == "Father"
        assert result["attempts"][1]["contact_name"] == "Sister"
        assert result["attempts"][2]["contact_name"] == "Brother"

    @patch("app.supabase_client.supabase")
    def test_alert_attempts_logged_to_db(self, mock_sb):
        """Verify alert_attempts table insert is called with correct parameters."""
        mock_insert = MagicMock()
        mock_insert.execute.return_value = fake_result([{"id": str(uuid.uuid4())}])
        mock_sb.table.return_value.insert.return_value = mock_insert

        risk_event_id = str(uuid.uuid4())
        contact_id = str(uuid.uuid4())

        record = log_alert_attempt(
            risk_event_id=risk_event_id,
            emergency_contact_id=contact_id,
            attempt_order=1,
            outcome="sent",
            channel="call"
        )
        assert record is not None
        mock_sb.table.assert_called_with("alert_attempts")


# ===========================================================================
# 2. Rule §3.4a Abuse Short-Circuit Bypass Safeguard
# ===========================================================================

class TestAbuseSafeguardRule34a:
    """Verify Rule §3.4a strictly prevents emergency contacts from being dialed."""

    def test_abuse_safeguard_in_sequential_escalation(self):
        c1 = {"id": str(uuid.uuid4()), "phone": "+919876543211", "first_name": "Father", "priority_order": 1}
        result = trigger_sequential_escalation(
            user_id=TEST_USER_ID,
            category="abuse",
            severity="high",
            contacts=[c1]
        )
        assert result["status"] == "bypassed_safeguard"
        assert result["action_taken"] == "routed_to_helpline"
        assert result["call_dispatched"] is False
        assert result["total_attempts"] == 0
        assert "Rule §3.4a" in result["details"]

    def test_abuse_safeguard_via_escalation_endpoint(self):
        resp = client.post("/escalation/trigger", json={
            "user_id": TEST_USER_ID,
            "severity": "high",
            "category": "abuse",
            "contacts": [{
                "phone": "+919876543211",
                "relationship": "Parent",
                "name": "Abusive Guardian",
                "priority_order": 1
            }]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "bypassed_safeguard"
        assert data["action_taken"] == "routed_to_helpline"
        assert data["call_dispatched"] is False
        assert data["total_attempts"] == 0


# ===========================================================================
# 3. End-to-End Pipeline & Demo Endpoint Verification
# ===========================================================================

class TestEndToEndEscalationPipeline:
    """Test full pipeline execution via /demo/run and /chat endpoints."""

    def test_demo_run_self_harm_scenario(self):
        resp = client.post("/demo/run", json={"scenario": "self_harm"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["pipeline_results"]["stage_1_prefilter"]["triggered"] is True
        assert data["pipeline_results"]["stage_2_classifier"]["severity"] in ("high", "medium")
        assert "stage_3_escalation" in data["pipeline_results"]
        assert "stage_4_rag" in data["pipeline_results"]

    def test_demo_run_abuse_bypass_scenario(self):
        resp = client.post("/demo/run", json={"scenario": "abuse_bypass"})
        assert resp.status_code == 200
        data = resp.json()
        stage3 = data["pipeline_results"]["stage_3_escalation"]
        assert stage3["action_taken"] == "routed_to_helpline"
        assert stage3["contacts_called"] is False
        assert stage3["helpline_routed"] is True

    def test_demo_run_false_positive_guard(self):
        resp = client.post("/demo/run", json={"scenario": "false_positive_guard"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["summary"]["risk_level"] in ("NONE", "LOW")
        assert data["summary"]["safe_to_proceed"] is True
