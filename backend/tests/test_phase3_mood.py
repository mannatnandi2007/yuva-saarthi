import pytest
from unittest.mock import patch, MagicMock
from app.schemas import MoodEnum, MessageHistoryItem, ChatResponse, RiskClassificationResponse
from app.services.chat_service import save_message, get_message_history, send_chat_message
from app.services.llm_service import AIResponse


def test_mood_enum_values():
    """Verify all 7 MoodEnum values required by Phase 3 spec."""
    expected = {"normal", "happy", "overjoyed", "sad", "angry", "anxious", "tired"}
    actual = {m.value for m in MoodEnum}
    assert expected == actual


def test_message_history_item_mood():
    """Verify MessageHistoryItem schema includes mood and mood_confidence."""
    item = MessageHistoryItem(
        id="msg-1",
        sender="assistant",
        content="I am here with you.",
        mood="anxious",
        mood_confidence=0.85,
        created_at="2026-10-27T12:00:00Z",
    )
    assert item.mood == "anxious"
    assert item.mood_confidence == 0.85

    # Default mood
    item_default = MessageHistoryItem(
        id="msg-2",
        sender="user",
        content="Hello",
        created_at="2026-10-27T12:00:00Z",
    )
    assert item_default.mood == "normal"
    assert item_default.mood_confidence is None


def test_chat_response_mood():
    """Verify ChatResponse schema includes mood and mood_confidence."""
    resp = ChatResponse(
        reply="Take a slow breath.",
        risk_classification=RiskClassificationResponse(
            severity="low",
            category="distress",
            rationale="User feels overwhelmed.",
        ),
        action_taken="logged_only",
        mood="tired",
        mood_confidence=0.9,
    )
    assert resp.mood == "tired"
    assert resp.mood_confidence == 0.9


def test_save_message_with_mood():
    """Verify save_message adds mood and mood_confidence to payload."""
    with patch("app.services.chat_service.supabase") as mock_sb:
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[{
            "id": "msg-123",
            "session_id": "sess-1",
            "sender": "assistant",
            "content": "Take it slow.",
            "mood": "anxious",
            "mood_confidence": 0.82,
        }])

        row = save_message(
            session_id="sess-1",
            sender="assistant",
            content="Take it slow.",
            mood="anxious",
            mood_confidence=0.82,
        )

        # Ensure insert payload contains mood and mood_confidence
        mock_table.insert.assert_called_once()
        inserted_payload = mock_table.insert.call_args[0][0]
        assert inserted_payload["mood"] == "anxious"
        assert inserted_payload["mood_confidence"] == 0.82
        assert row["mood"] == "anxious"


def test_get_message_history_includes_mood():
    """Verify get_message_history selects mood and mood_confidence."""
    with patch("app.services.chat_service.validate_session_ownership"), \
         patch("app.services.chat_service.supabase") as mock_sb:
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_eq = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_order = MagicMock()
        mock_eq.order.return_value = mock_order
        mock_order.execute.return_value = MagicMock(data=[
            {
                "id": "msg-1",
                "sender": "assistant",
                "content": "Take care.",
                "risk_tier": None,
                "mood": "sad",
                "mood_confidence": 0.95,
                "created_at": "2026-10-27T12:00:00Z",
            }
        ])

        rows = get_message_history("sess-1", "user-1")
        assert len(rows) == 1
        assert rows[0]["mood"] == "sad"
        assert rows[0]["mood_confidence"] == 0.95
        # Verify select statement asked for mood and mood_confidence
        select_arg = mock_table.select.call_args[0][0]
        assert "mood" in select_arg
        assert "mood_confidence" in select_arg


@pytest.mark.asyncio
async def test_send_chat_message_persists_mood():
    """Verify send_chat_message passes AI result mood into save_message."""
    fake_ai = AIResponse(
        reply="Take a deep breath, let's pause together.",
        severity="low",
        category="distress",
        rationale="Mild stress",
        mood="anxious",
        mood_confidence=0.88,
    )

    with patch("app.services.chat_service.validate_session_ownership", return_value={"summary_snapshot": None}), \
         patch("app.services.chat_service.get_ai_response", return_value=fake_ai), \
         patch("app.services.chat_service.save_message") as mock_save, \
         patch("app.services.chat_service.supabase") as mock_sb:
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = MagicMock(order=MagicMock(return_value=MagicMock(limit=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))

        mock_save.side_effect = [
            {"id": "usr-msg-1"},  # user save
            {"id": "asst-msg-1"}, # assistant save
        ]

        result = await send_chat_message("sess-1", "user-1", "I feel overwhelmed")

        assert result.mood == "anxious"
        assert result.mood_confidence == 0.88

        # Check assistant save_message call had mood
        assert mock_save.call_count >= 2
        asst_call_kwargs = mock_save.call_args_list[1].kwargs
        assert asst_call_kwargs.get("mood") == "anxious"
        assert asst_call_kwargs.get("mood_confidence") == 0.88
