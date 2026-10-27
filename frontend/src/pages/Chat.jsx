// Yuva Saarthi — Surreal Companion Interface
// Hallmark: Cold Snap × Hyperlane × Off-Register (Red & Pink Theme)
// Featuring Synaptic Brain Avatars, Chromatic Shadows, & Crisis Escalation Card

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Plus, MessageSquare, Heart, PhoneCall, 
  PanelLeftClose, PanelLeft, ShieldAlert, 
  Users, Shield, Loader2, Sparkles, Trash2
} from 'lucide-react';
import axios from 'axios';
import BrainLogo from '../components/BrainLogo.jsx';
import YusaCompanion from '../components/YusaCompanion.jsx';
import { pingBackendWarmup } from '../api/client.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function groupSessionsByDate(sessions) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: []
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfThisWeek = startOfToday - 7 * 86400000;

  (sessions || []).forEach((s) => {
    const time = s.started_at ? new Date(s.started_at).getTime() : 0;
    if (time >= startOfToday) {
      groups.today.push(s);
    } else if (time >= startOfYesterday) {
      groups.yesterday.push(s);
    } else if (time >= startOfThisWeek) {
      groups.thisWeek.push(s);
    } else {
      groups.earlier.push(s);
    }
  });

  return [
    { label: 'Today', items: groups.today },
    { label: 'Yesterday', items: groups.yesterday },
    { label: 'This Week', items: groups.thisWeek },
    { label: 'Earlier', items: groups.earlier }
  ].filter((g) => g.items.length > 0);
}

const SUGGESTED_PROMPTS = [
  { 
    label: "Exam Stress & Pressure", 
    text: "Exams ko lekar bohot zyada stress aur pressure feel ho raha hai, padhai me dhyan nahi lag raha.",
    tag: "ACADEMIC" 
  },
  { 
    label: "Feeling Overwhelmed", 
    text: "I am feeling extremely overwhelmed today and my chest feels heavy.",
    tag: "SOMATIC" 
  },
  { 
    label: "Family Conflict", 
    text: "Ghar pe bohot tension chal rahi hai parents ke sath, bohot comparisons ho rahe hain.",
    tag: "INTERPERSONAL" 
  },
  { 
    label: "Loneliness & Isolation", 
    text: "I feel really isolated and alone right now, aisa lagta hai koi samajhta nahi hai.",
    tag: "SUPPORT" 
  }
];

export default function Chat({ 
  userSession, 
  onLogout, 
  onOpenContacts, 
  onOpenPolicy, 
  emergencyContacts = [] 
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  

  // Active crisis state if triggered
  const [activeHelplines, setActiveHelplines] = useState([]);
  const [activeSafeguard, setActiveSafeguard] = useState(null);
    /* ===========================
      PHASE 6 STATES
  =========================== */

  const [conversationSummary, setConversationSummary] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [conversationInsights, setConversationInsights] = useState({
    totalMessages: 0,
    dominantMood: "NORMAL",
    supportLevel: "Low"
  });

  const [typingStage, setTypingStage] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatSectionRef = useRef(null);

  // Phase 3: Backend-driven mood state with emotion smoothing
  const [currentMood, setCurrentMood] = useState("NORMAL");
  const [backendStatus, setBackendStatus] = useState("ready");
  const abortControllerRef = useRef(null);

    /* ===========================
      PHASE 6 HELPERS
  =========================== */

  useEffect(() => {
    if (messages.length === 0) return;

    setEmotionHistory(prev => [
      ...prev,
      {
        mood: currentMood,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      }
    ]);

    setConversationInsights({
      totalMessages: messages.length,
      dominantMood: currentMood,
      supportLevel:
        currentMood === "VERY_SCARED" || currentMood === "ANXIOUS"
          ? "Critical"
          : currentMood === "SAD" || currentMood === "ANGRY"
          ? "High"
          : currentMood === "TIRED"
          ? "Medium"
          : "Low"
    });
  }, [messages, currentMood]);



  const updateConversationSummary = (allMessages) => {
    const userMessages = allMessages
      .filter(m => m.sender === "user")
      .map(m => m.content);

    if (userMessages.length === 0) return;

    const recent = userMessages.slice(-5).join(" ");

    setConversationSummary(recent.substring(0, 220));
  };



  const generateFollowUpQuestion = (mood) => {
    switch (mood) {

      case "SAD":
        return "Would you like to tell me what happened today?";

      case "ANXIOUS":
        return "What is worrying you the most right now?";

      case "ANGRY":
        return "Can you share what made you feel this way?";

      case "LONELY":
        return "Is there someone you wish you could talk to?";

      case "VERY_SCARED":
        return "Are you safe right now? I'm here with you.";

      case "CONFUSED":
        return "Which part feels the most overwhelming?";

      case "TIRED":
        return "Have you had a chance to rest today?";

      case "HAPPY":
        return "That's wonderful! What made today better?";

      case "OVERJOYED":
        return "I'd love to hear more about this happy moment.";

      default:
        return "Would you like to tell me a little more?";
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const getAuthHeaders = () => {
    const headers = {};
    const token = userSession?.access_token || userSession?.session_id;
    if (token && token.length > 20) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const devUserId = userSession?.user_id || '00000000-0000-0000-0000-000000000001';
    headers['X-Dev-User-Id'] = devUserId;
    return headers;
  };

  // Initialize fresh chat and ping backend on startup (Phase 4)
  useEffect(() => {
    let isMounted = true;
    const initChat = async () => {
      pingBackendWarmup((status) => {
        if (isMounted) setBackendStatus(status);
      });

      const headers = getAuthHeaders();
      try {
        const listRes = await axios.get(`${API_BASE_URL}/sessions`, { headers, timeout: 5000 });
        if (isMounted && Array.isArray(listRes.data)) {
          setSessionsList(listRes.data);
        }
      } catch (err) {
        console.debug("Could not fetch sessions list:", err);
      }

      if (isMounted) {
        createNewChat();
      }
    };

    initChat();
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userSession]);

  // Phase 4: Lazy session creation — do NOT create session row in DB until first message is sent
  const createNewChat = () => {
    setActiveHelplines([]);
    setActiveSafeguard(null);
    setMessages([]);
    setActiveSessionId(null);
    setCurrentMood("NORMAL");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDeleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`, { headers, timeout: 5000 });
    } catch (err) {
      console.warn("Delete session error:", err);
    } finally {
      setSessionsList(prev => prev.filter(s => s.session_id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessionsList.filter(s => s.session_id !== sessionId);
        setSessionsList(prev => {
          const updated = prev.filter(s => s.session_id !== sessionId);

          if (activeSessionId === sessionId) {
            if (updated.length > 0) {
              loadSession(updated[0].session_id);
            } else {
              createNewChat();
            }
          }

          return updated;
        });
        if (remaining.length > 0) {
          loadSession(remaining[0].session_id);
        } else {
          createNewChat();
        }
      }
    }
  };

  const handleDeleteAllSessions = async () => {
    if (!window.confirm("Are you sure you want to delete ALL previous conversation history? This cannot be undone.")) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/sessions`, { headers, timeout: 5000 });
    } catch (err) {
      console.warn("Delete all sessions error:", err);
    } finally {
      setSessionsList([]);
      createNewChat();
    }
  };
  

 

  // Phase 4: Session loading with AbortController for rapid switching
  const loadSession = async (sessionId) => {
    if (sessionId === activeSessionId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setActiveSessionId(sessionId);
    setActiveHelplines([]);
    setActiveSafeguard(null);

    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`, {
        headers,
        timeout: 8000,
        signal: controller.signal
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setMessages(res.data.map(m => ({
          sender: m.sender,
          content: m.content,
          mood: m.mood,
          mood_confidence: m.mood_confidence,
        })));
        const latestWithMood = [...res.data].reverse().find(m => m.mood);
        if (latestWithMood?.mood) {
          setCurrentMood(latestWithMood.mood.toUpperCase());
        } else {
          setCurrentMood("NORMAL");
        }
      } else {
        setMessages([]);
        setCurrentMood("NORMAL");
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }
      setMessages([]);
      setCurrentMood("NORMAL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textOverride) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = { sender: 'user', content: textToSend.trim() };
    setMessages(prev => [...prev, userMessage]);
    if (!textOverride) setInputText('');
    setIsLoading(true);

    const headers = getAuthHeaders();
    let currentSessionId = activeSessionId;

    // Phase 4: Lazy session creation on first message
    if (!currentSessionId) {
      setTypingStage("Creating safe space...");
      try {
        const sessionRes = await axios.post(`${API_BASE_URL}/sessions`, {}, { headers, timeout: 8000 });
        if (sessionRes.data?.session_id) {
          currentSessionId = sessionRes.data.session_id;
          setActiveSessionId(currentSessionId);
          setSessionsList(prev => [
            {
              session_id: currentSessionId,
              started_at: new Date().toISOString(),
              heading: "Safe Space Chat",
              title: "Safe Space Chat"
            },
            ...prev.filter(s => s.session_id !== currentSessionId)
          ]);
        } else {
          throw new Error("No session_id returned from /sessions");
        }
      } catch (sessErr) {
        console.error("Failed to lazily create session:", sessErr);
        setIsLoading(false);
        setTypingStage("");
        setMessages(prev => [
          ...prev,
          {
            sender: "assistant",
            content: "Could not establish secure session. Please check your connection and try again."
          }
        ]);
        return;
      }
    }

    setTypingStage("Thinking carefully...");

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        session_id: currentSessionId,
        message: textToSend.trim()
      }, { headers, timeout: 45000 });

      const data = response.data;
      const assistantMessage = {
        sender: "assistant",
        content: data.reply,
        mood: data.mood,
        mood_confidence: data.mood_confidence,
      };

      const updatedMessages = [
        ...messages,
        userMessage,
        assistantMessage
      ];

      setMessages(updatedMessages);

      // Emotion engine: backend-driven mood with smoothing
      const rawMood = (data.mood || 'normal').toUpperCase();
      const conf = data.mood_confidence ?? 0.8;
      let effectiveMood = rawMood;
      setCurrentMood(prev => {
        // Smoothing: ignore a single NORMAL following a strong mood unless confidence >= 0.7
        if (rawMood === 'NORMAL' && prev !== 'NORMAL' && conf < 0.7) {
          effectiveMood = prev;
          return prev;
        }
        return rawMood;
      });

      setFollowUpQuestion(generateFollowUpQuestion(effectiveMood));
      updateConversationSummary(updatedMessages);

      if (data.heading) {
        setSessionsList(prev => prev.map(s => 
          s.session_id === currentSessionId ? { ...s, heading: data.heading, title: data.heading } : s
        ));
      }

      const risk = data.risk_classification;
      const action = data.action_taken;

      setActiveHelplines([]);
      setActiveSafeguard(null);

      // Handle safety routing
      if (action === 'routed_to_helpline' || (risk?.category === 'abuse' && risk?.severity === 'high')) {
        setActiveSafeguard("abuse_bypass");
        setActiveHelplines([
          { name: "Childline India (Youth Protection)", number: "1098", desc: "24/7 Toll-Free Child & Youth Distress Support" },
          { name: "KIRAN National Helpline", number: "1800-599-0019", desc: "Govt of India Mental Health Helpline" }
        ]);
      } else if (action === 'call_placed' || risk?.severity === 'high') {
        setActiveSafeguard("escalation_triggered");
        setActiveHelplines([
          { name: "Tele-MANAS National Helpline", number: "14416", desc: "24/7 Comprehensive Mental Health Support" },
          { name: "Vandrevala Foundation", number: "+91 9999 666 555", desc: "24/7 Crisis Intervention & Counseling" }
        ]);
      }

    } catch (error) {
      console.error("Chat error:", error);

      const errDetail =
        error.response?.data?.detail ||
        "Could not connect to the Yuva Saarthi server. Please make sure the backend is running.";

      setMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          content: errDetail
        }
      ]);

    } finally {
      setTypingStage("");
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      
      {/* Left Sidebar */}
      <aside 
        style={{
          width: sidebarOpen ? '250px' : '0px',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(12px)',
          borderRight: sidebarOpen ? '1px solid rgba(167, 139, 250, 0.1)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 20
        }}
      >
        <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '250px' }}>
          
          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="hallmark-btn-primary"
            style={{ width: '100%', padding: '12px 16px', fontSize: '0.88rem', borderRadius: '14px' }}
          >
            <Plus size={16} />
            <span>New Safe Chat</span>
          </button>

          {/* Session History Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Conversation Log</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sessionsList.length}</span>
              {sessionsList.length > 0 && (
                <button
                  onClick={handleDeleteAllSessions}
                  title="Clear all chat history"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.68rem',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-crimson)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={11} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Sessions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
            {sessionsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                <MessageSquare size={22} style={{ margin: '0 auto 8px', opacity: 0.45, display: 'block' }} />
                <p style={{ margin: 0, fontWeight: 500, color: '#64748b' }}>No conversations yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem', opacity: 0.8 }}>Send a message to start your safe space.</p>
              </div>
            ) : (
              groupSessionsByDate(sessionsList).map((group) => (
                <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 8px 2px'
                  }}>
                    {group.label}
                  </div>
                  {group.items.map((s) => {
                    const isActive = s.session_id === activeSessionId;
                    const displayHeading = s.heading || s.title || (s.summary_snapshot ? s.summary_snapshot.replace(/^Heading:\s*/, '').slice(0, 26) + '...' : `Chat ${s.session_id.slice(0, 6)}`);
                    return (
                      <div
                        key={s.session_id}
                        onClick={() => loadSession(s.session_id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isActive ? 'rgba(167, 139, 250, 0.12)' : 'transparent',
                          color: isActive ? '#1e293b' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(167, 139, 250, 0.06)';
                            e.currentTarget.style.color = '#475569';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                          <MessageSquare size={14} color={isActive ? '#818cf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? '600' : '400', display: 'block' }}>
                              {displayHeading}
                            </span>
                            {s.started_at && (
                              <span style={{ fontSize: '0.67rem', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                                {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(s.session_id, e)}
                          title="Delete this conversation"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            opacity: isActive ? 0.8 : 0.4,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--accent-crimson)';
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.opacity = isActive ? '0.8' : '0.4';
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer Controls */}
          <div style={{ borderTop: '1px solid rgba(167, 139, 250, 0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={onOpenContacts}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', padding: '10px 12px', fontSize: '0.82rem', background: 'transparent', border: 'none', borderRadius: '12px', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s ease', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Users size={15} color="#818cf8" />
              <span>Safety Network ({emergencyContacts.length})</span>
              <span style={{ marginLeft: 'auto', color: '#cbd5e1' }}>›</span>
            </button>

            <button
              onClick={onOpenPolicy}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', padding: '10px 12px', fontSize: '0.82rem', background: 'transparent', border: 'none', borderRadius: '12px', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s ease', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Shield size={15} color="#a78bfa" />
              <span>Safety Charter & Protocol</span>
              <span style={{ marginLeft: 'auto', color: '#cbd5e1' }}>›</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main Chat Stream Container */}
      <section ref={chatSectionRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
        
        {/* Chat Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 22px',
          borderBottom: '1px solid rgba(167, 139, 250, 0.08)',
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(167, 139, 250, 0.12)',
                borderRadius: '10px',
                color: '#94a3b8',
                padding: '7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167, 139, 250, 0.12)'; e.currentTarget.style.color = '#818cf8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b', letterSpacing: '-0.01em' }}>
                {sessionsList.find(s => s.session_id === activeSessionId)?.heading || 
                 sessionsList.find(s => s.session_id === activeSessionId)?.title || 
                 (messages.length > 0 ? "Active Conversation" : "New Safe Chat")}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#a855f7', letterSpacing: '0.04em', fontWeight: '600' }}>
                100% Confidential • Always Here for You
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {backendStatus === 'warming' && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '0.72rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Loader2 size={12} className="animate-spin" />
                <span>Warming up safe server...</span>
              </div>
            )}

            {activeSessionId && (
              <button
                onClick={(e) => handleDeleteSession(activeSessionId, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-pill)',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Delete current conversation"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                <Trash2 size={12} />
                <span>Delete Chat</span>
              </button>
            )}
          </div>
        </header>

        {/* ── CHAT VIEWPORT WITH DYNAMIC ENVIRONMENT (Task 2) ── */}
        <div 
          className={`chat-viewport dynamic-env env-${currentMood ? currentMood.toLowerCase() : 'normal'}`} 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}
        >
          {/* ── YUSA TOP SECTION WITH EMOTION ANIMATIONS ── */}
          <YusaCompanion mood={currentMood} />

          {/* Chat Messages — this scrolls independently */}
          <div className="messages-scroll" style={{ flex: 1, overflowY: 'auto', padding: '240px 24px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', zIndex: 2 }}>
            
            {/* Empty State / Surreal Hero */}
            {messages.length === 0 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    paddingTop: "5px",
                    paddingBottom: "18px"
                  }}
                  className="animate-slideup empty-chat-content"
                >
                  <h1
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      color: "#1e293b",
                      marginBottom: "12px"
                    }}
                  >
                    How can I support you today?
                  </h1>

                  <p
                    style={{
                      color: "#64748b",
                      maxWidth: 560,
                      lineHeight: 1.7
                    }}
                  >
                    Main aapka confidential companion hoon.
                    English ya Hinglish me apni feelings,
                    exam stress, anxiety ya overthinking
                    bina kisi jhijhak share karein.
                  </p>
                </div>

                {/* Suggested Prompts */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,1fr)",
                    gap: "14px",
                    marginTop: "24px"
                  }}
                >
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => handleSendMessage(prompt.text)}
                      style={{
                        padding: "18px",
                        borderRadius: "18px",
                        border: "1px solid rgba(219,39,119,.18)",
                        background: "rgba(255,255,255,.82)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: ".2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 30px rgba(219,39,119,.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "";
                        e.currentTarget.style.boxShadow = "";
                      }}
                    >
                      <div
                        style={{
                          color: "#db2777",
                          fontWeight: 700,
                          marginBottom: "6px"
                        }}
                      >
                        {prompt.label}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: ".86rem",
                          lineHeight: 1.5
                        }}
                      >
                        {prompt.text}
                      </div>
                    </button>
                  ))}
                </div>
              </>

            ) : (
              /* Message Stream */
              messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      alignItems: 'flex-start',
                      justifyContent: isUser ? 'flex-end' : 'flex-start'
                    }}
                    className="animate-slideup"
                  >
                    {!isUser && (
                      <BrainLogo size={30} animated={false} />
                    )}

                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "14px 20px",
                        borderRadius: isUser
                          ? "20px 20px 6px 20px"
                          : "6px 20px 20px 20px",
                        background: isUser
                          ? "#EAD8FF"
                          : "rgba(255,255,255,0.90)",
                        color: "#374151",
                        position: "relative",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.7",
                        fontSize: "0.92rem",
                        boxShadow: isUser
                          ? "0 3px 12px rgba(168,85,247,.15)"
                          : "0 3px 14px rgba(168,85,247,.05)"
                      }}
                    >

                      {/* Assistant Copy Button */}

                      {!isUser && (
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "11px",
                            color: "#a855f7"
                          }}
                        >
                          Copy
                        </button>
                      )}

                      {/* Message */}

                      {msg.content}

                    </div>
                  </div>
                );
              })
            )}

            {/* Thinking / Loader Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '4px 0' }}>
                <BrainLogo size={28} animated={true} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '0.84rem' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "#94a3b8",
                      fontWeight: "500"
                    }}
                  >
                    {typingStage || "Thinking..."}
                  </span>
                </div>
              </div>
            )}

            {/* Crisis Alert Card */}
            {activeHelplines.length > 0 && (
              <div 
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '18px',
                  padding: '22px',
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)'
                }} 
                className="animate-slideup"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
                  <ShieldAlert size={22} />
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                    {activeSafeguard === 'abuse_bypass' 
                      ? 'Confidential Helpline Support Surfaced' 
                      : 'Immediate 24/7 Crisis Support Lines'}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                  {activeSafeguard === 'abuse_bypass' 
                    ? 'Your physical safety comes first. Personal emergency contacts have been BYPASSED completely. You can speak confidentially with dedicated youth support officers right now:' 
                    : 'You do not have to carry this alone. Free, confidential professional counselors are available 24/7:'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {activeHelplines.map((helpline, i) => (
                    <a
                      key={i}
                      href={`tel:${helpline.number.replace(/\D/g, '')}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: '#db2777',
                        border: 'none',
                        borderRadius: '14px',
                        color: '#ffffff',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 14px rgba(168, 85, 247, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(168, 85, 247, 0.2)';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#ffffff' }}>
                          {helpline.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)', marginTop: '3px' }}>
                          {helpline.desc}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', fontWeight: '700', fontSize: '0.88rem' }}>
                        <PhoneCall size={16} />
                        <span>{helpline.number}</span>
                      </div>
                    </a>
                  ))}
                </div>

              </div>
            )}
            {followUpQuestion && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: "#fff7fb",
                  border: "1px solid #f9a8d4",
                  color: "#be185d",
                  fontSize: "0.9rem",
                  lineHeight: 1.6
                }}
              >
                <strong>💬 Follow-up Question</strong>

                <div style={{ marginTop: "8px" }}>
                  {followUpQuestion}
                </div>
              </div>
            )}
            {conversationSummary && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  fontSize: "0.88rem",
                  lineHeight: 1.6
                }}
              >
                <strong>📝 Conversation Summary</strong>

                <div style={{ marginTop: "8px" }}>
                  {conversationSummary}
                </div>
              </div>
            )}  
            {messages.length > 0 && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: "#fdf4ff",
                  border: "1px solid #e9d5ff",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  textAlign: "center"
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b"
                    }}
                  >
                    Messages
                  </div>

                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "1.2rem"
                    }}
                  >
                    {conversationInsights.totalMessages}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b"
                    }}
                  >
                    Mood
                  </div>

                  <div
                    style={{
                      fontWeight: "700",
                      color: "#db2777"
                    }}
                  >
                    {conversationInsights.dominantMood}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b"
                    }}
                  >
                    Support
                  </div>

                  <div
                    style={{
                      fontWeight: "700",
                      color: "#7c3aed"
                    }}
                  >
                    {conversationInsights.supportLevel}
                  </div>
                </div>
              </div>
            )}         
            <div ref={messagesEndRef} />
          </div>

          </div>



        </div>

        {/* Bottom Input Bar — stays anchored */}
        <div style={{
          padding: '10px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(167, 139, 250, 0.06)',
          flexShrink: 0,
        }}>

          
          <div style={{
            width: '100%',
            maxWidth: '680px',
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1.5px solid rgba(167, 139, 250, 0.18)',
            borderRadius: '26px',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.06)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px 6px 22px',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
          }}
          onFocus={() => {}}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Message Yuva Saarthi... (English ya Hinglish me baat karein)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#1e293b',
                fontSize: '0.92rem',
                padding: '10px 0',
                fontFamily: 'inherit'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              aria-label="Send message"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: 'none',
                background: inputText.trim() && !isLoading ? '#db2777' : '#f1f5f9',
                color: inputText.trim() && !isLoading ? '#ffffff' : '#cbd5e1',
                cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: inputText.trim() && !isLoading ? '0 4px 14px rgba(192, 132, 252, 0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={16} />
            </button>
          </div>

        </div>

      </section>


    </div>
  );
}
