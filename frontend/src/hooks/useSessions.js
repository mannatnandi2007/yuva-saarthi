/**
 * Yuva Saarthi — useSessions Hook
 * Phase 4 & Phase 6: Session lifecycle management, lazy creation, time grouping,
 * aborting rapid switching, and bulk deletion.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    try {
      return localStorage.getItem('yuva_current_session_id') || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeAbortController = useRef(null);

  const persistSessionId = (id) => {
    try {
      if (id) {
        localStorage.setItem('yuva_current_session_id', id);
      } else {
        localStorage.removeItem('yuva_current_session_id');
      }
    } catch (e) {
      console.warn('Failed to save session ID:', e);
    }
    setCurrentSessionId(id);
  };

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (activeAbortController.current) {
      activeAbortController.current.abort();
    }
    const controller = new AbortController();
    activeAbortController.current = controller;

    try {
      const res = await apiClient.get('/sessions', {
        signal: controller.signal,
      });

      // Backend returns list of sessions with messages >= 1
      const list = Array.isArray(res.data) ? res.data : (res.data?.sessions || []);
      setSessions(list);

      // If currentSessionId is set but not in list, keep it if it was a freshly created one
      return list;
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load sessions:', err);
        setError('Could not load past conversations.');
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const selectSession = useCallback((sessionId) => {
    persistSessionId(sessionId);
  }, []);

  const startNewChat = useCallback(() => {
    // Lazy: sets session to null so it creates only when the user sends a message
    persistSessionId(null);
  }, []);

  const createSession = useCallback(async (title = 'New Conversation') => {
    try {
      const res = await apiClient.post('/sessions', { title });
      const newSession = res.data;
      if (newSession?.id) {
        setSessions((prev) => [newSession, ...prev]);
        persistSessionId(newSession.id);
        return newSession.id;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await apiClient.delete(`/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        persistSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      throw err;
    }
  }, [currentSessionId]);

  const bulkDeleteSessions = useCallback(async (sessionIds) => {
    try {
      await Promise.all(sessionIds.map((id) => apiClient.delete(`/sessions/${id}`)));
      setSessions((prev) => prev.filter((s) => !sessionIds.includes(s.id)));
      if (sessionIds.includes(currentSessionId)) {
        persistSessionId(null);
      }
    } catch (err) {
      console.error('Failed to bulk delete sessions:', err);
      throw err;
    }
  }, [currentSessionId]);

  // Group sessions by Today, Yesterday, This Week, Earlier
  const groupedSessions = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfThisWeek = startOfToday - 86400000 * 7;

  sessions.forEach((s) => {
    const time = new Date(s.updated_at || s.created_at).getTime();
    if (time >= startOfToday) {
      groupedSessions.today.push(s);
    } else if (time >= startOfYesterday) {
      groupedSessions.yesterday.push(s);
    } else if (time >= startOfThisWeek) {
      groupedSessions.thisWeek.push(s);
    } else {
      groupedSessions.earlier.push(s);
    }
  });

  return {
    sessions,
    groupedSessions,
    currentSessionId,
    setCurrentSessionId: persistSessionId,
    isLoading,
    error,
    fetchSessions,
    selectSession,
    startNewChat,
    createSession,
    deleteSession,
    bulkDeleteSessions,
  };
}

export default useSessions;
