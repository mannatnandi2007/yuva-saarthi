/**
 * Yuva Saarthi — useChat Hook
 * Phase 3, Phase 4 & Phase 6: Manages messages, backend-driven mood,
 * optimistic updates, lazy session attachment, degraded-mode detection, and helplines.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';

export function useChat({ currentSessionId, onSessionCreated, onSessionsRefresh }) {
  const [messages, setMessages] = useState([]);
  const [currentMood, setCurrentMood] = useState('normal');
  const [moodConfidence, setMoodConfidence] = useState(1.0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [degraded, setDegraded] = useState(false);
  const [activeHelplines, setActiveHelplines] = useState(null);

  const abortControllerRef = useRef(null);
  const lastStrongMoodRef = useRef('normal');

  // Smooth mood transitions: ignore single 'normal' after a strong mood unless confidence >= 0.7
  const updateSmoothedMood = useCallback((newMood, confidence = 1.0) => {
    if (!newMood) return;
    const moodLower = newMood.toLowerCase();

    if (moodLower === 'normal') {
      if (lastStrongMoodRef.current !== 'normal' && confidence < 0.7) {
        // Keep previous strong mood for stability
        return;
      }
      lastStrongMoodRef.current = 'normal';
    } else {
      lastStrongMoodRef.current = moodLower;
    }

    setCurrentMood(moodLower);
    setMoodConfidence(confidence);
  }, []);

  // Load message history when currentSessionId changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      setCurrentMood('normal');
      setDegraded(false);
      setActiveHelplines(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingMessages(true);
    setError(null);

    apiClient
      .get(`/sessions/${currentSessionId}/messages`, { signal: controller.signal })
      .then((res) => {
        const history = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
        // Map messages and extract mood
        const normalized = history.map((m, idx) => ({
          id: m.id || `msg-${idx}`,
          role: m.sender || m.role || 'user',
          content: m.content || m.message || '',
          mood: m.mood || null,
          mood_confidence: m.mood_confidence ?? 1.0,
          created_at: m.created_at || new Date().toISOString(),
        }));
        setMessages(normalized);

        // Restore latest assistant mood from history
        const lastWithMood = [...normalized].reverse().find((m) => m.role === 'assistant' && m.mood);
        if (lastWithMood && lastWithMood.mood) {
          updateSmoothedMood(lastWithMood.mood, lastWithMood.mood_confidence);
        } else {
          setCurrentMood('normal');
        }
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('Failed to load messages for session:', err);
          setError('Could not load chat history. Please try again.');
        }
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });

    return () => {
      controller.abort();
    };
  }, [currentSessionId, updateSmoothedMood]);

  // Send a message
  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim() || isSending) return;
      const trimmed = text.trim();

      setIsSending(true);
      setError(null);

      let targetSessionId = currentSessionId;

      // Lazy creation: if no active session, create one first!
      if (!targetSessionId) {
        try {
          const createRes = await apiClient.post('/sessions', {
            title: trimmed.slice(0, 30) || 'New Conversation',
          });
          targetSessionId = createRes.data?.session_id || createRes.data?.id;
          if (onSessionCreated && targetSessionId) {
            onSessionCreated(targetSessionId);
          }
        } catch (err) {
          console.error('Failed to create session on first send:', err);
          setError('Could not start conversation. Please try again.');
          setIsSending(false);
          return;
        }
      }

      // Optimistically append user message
      const tempUserMsg = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const res = await apiClient.post('/chat', {
          session_id: targetSessionId,
          message: trimmed,
        });

        const data = res.data;
        const replyText = data.reply || data.response || "I'm right here with you.";
        const detectedMood = data.mood || 'normal';
        const confidence = data.mood_confidence ?? 1.0;

        // Check degraded flag
        if (data.degraded) {
          setDegraded(true);
        } else {
          setDegraded(false);
        }

        // Check safety helplines
        if (data.helplines && Array.isArray(data.helplines) && data.helplines.length > 0) {
          setActiveHelplines(data.helplines);
        } else if (data.severity === 'high' || data.severity === 'medium') {
          setActiveHelplines([
            { name: 'Tele-MANAS (24/7 Toll-Free)', number: '14416' },
            { name: 'KIRAN Mental Health', number: '1800-599-0019' },
            { name: 'Childline India', number: '1098' },
          ]);
        }

        // Append assistant response
        const assistantMsg = {
          id: data.message_id || `asst-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          mood: detectedMood,
          mood_confidence: confidence,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        updateSmoothedMood(detectedMood, confidence);

        if (onSessionsRefresh) {
          onSessionsRefresh();
        }
      } catch (err) {
        console.error('Chat error:', err);
        setError('Something went wrong connecting to Yuva Saarthi. Please try again.');
        // If failed, add safe fallback message
        const fallbackMsg = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I'm having a little trouble connecting right now, but please know you're not alone. If you need urgent support, call Tele-MANAS at 14416 (toll-free).",
          mood: 'normal',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setDegraded(true);
      } finally {
        setIsSending(false);
      }
    },
    [currentSessionId, isSending, onSessionCreated, onSessionsRefresh, updateSmoothedMood]
  );

  return {
    messages,
    currentMood,
    moodConfidence,
    isLoadingMessages,
    isSending,
    error,
    degraded,
    activeHelplines,
    sendMessage,
    setMessages,
  };
}

export default useChat;
