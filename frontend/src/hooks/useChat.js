/**
 * Yuva Saarthi — useChat Hook
 * Real-time emotional resonance, optimistic updates, session management,
 * degraded-mode handling, and automatic helpline triggers.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';
import { normalizeMood, detectEmotionFromText } from '../utils/emotionEngine';

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

  // Smooth mood transitions & enforce canonical emotion states
  const updateSmoothedMood = useCallback((newMood, confidence = 1.0) => {
    if (!newMood) return;
    const resolved = normalizeMood(newMood);

    if (resolved === 'normal') {
      if (lastStrongMoodRef.current !== 'normal' && confidence < 0.6) {
        // Keep previous strong mood briefly for stability
        return;
      }
      lastStrongMoodRef.current = 'normal';
    } else {
      lastStrongMoodRef.current = resolved;
    }

    setCurrentMood(resolved);
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

        // Restore latest emotional state from history
        const lastAssistant = [...normalized].reverse().find((m) => m.role === 'assistant' && m.mood);
        if (lastAssistant && lastAssistant.mood) {
          const canonical = normalizeMood(lastAssistant.mood, lastAssistant.content);
          updateSmoothedMood(canonical, lastAssistant.mood_confidence);
        } else {
          // Check last user message for emotion keywords if assistant mood not set
          const lastUser = [...normalized].reverse().find((m) => m.role === 'user');
          if (lastUser) {
            const userDetected = detectEmotionFromText(lastUser.content);
            if (userDetected) updateSmoothedMood(userDetected, 0.85);
            else setCurrentMood('normal');
          } else {
            setCurrentMood('normal');
          }
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

      // Real-time emotional resonance: immediately detect user's emotion and update Yusa
      const immediateUserMood = detectEmotionFromText(trimmed);
      if (immediateUserMood) {
        updateSmoothedMood(immediateUserMood, 0.9);
      }

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
        const rawMood = data.mood || data.risk_classification?.category || (data.severity === 'high' ? 'distressed' : null);
        const resolvedMood = normalizeMood(rawMood, trimmed);
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
          mood: resolvedMood,
          mood_confidence: confidence,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        updateSmoothedMood(resolvedMood, confidence);

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
          mood: 'distressed',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        updateSmoothedMood('distressed', 0.9);
        setDegraded(true);
      } finally {
        setIsSending(false);
      }
    },
    [currentSessionId, isSending, onSessionCreated, onSessionsRefresh, updateSmoothedMood]
  );

  return {
    messages,
    sendMessage,
    isSending,
    currentMood,
    moodConfidence,
    isLoadingMessages,
    error,
    degraded,
    activeHelplines,
  };
}

export default useChat;
