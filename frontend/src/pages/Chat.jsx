// YUVAA Saarthi — Surreal Companion Interface
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // Initialize fresh chat on startup
  useEffect(() => {
    const initChat = async () => {
      const headers = getAuthHeaders();

      // Fetch session history for sidebar
      try {
        const listRes = await axios.get(`${API_BASE_URL}/sessions`, { headers, timeout: 3000 });
        if (Array.isArray(listRes.data)) {
          setSessionsList(listRes.data);
        }
      } catch (err) {
        console.debug("Could not fetch sessions list; local fallback active.");
      }

      await createNewChat();
    };

    initChat();
  }, [userSession]);

  const createNewChat = async () => {
    setIsLoading(true);
    setActiveHelplines([]);
    setActiveSafeguard(null);
    setMessages([]);

    try {
      const headers = getAuthHeaders();
      const res = await axios.post(`${API_BASE_URL}/sessions`, {}, { headers, timeout: 3000 });
      if (res.data?.session_id) {
        const newId = res.data.session_id;
        setActiveSessionId(newId);
        setSessionsList(prev => [
          { session_id: newId, started_at: new Date().toISOString(), heading: "New Safe Chat", title: "New Safe Chat" },
          ...prev.filter(s => s.session_id !== newId)
        ]);
      }
    } catch (err) {
      const fallbackId = 'local-' + Date.now();
      setActiveSessionId(fallbackId);
      setSessionsList(prev => [
        { session_id: fallbackId, started_at: new Date().toISOString(), heading: "New Safe Chat", title: "New Safe Chat" },
        ...prev
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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

  const loadSession = async (sessionId) => {
    if (sessionId === activeSessionId) return;
    setIsLoading(true);
    setActiveSessionId(sessionId);
    setActiveHelplines([]);
    setActiveSafeguard(null);

    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`, { headers, timeout: 4000 });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setMessages(res.data.map(m => ({ sender: m.sender, content: m.content })));
      } else {
        setMessages([]);
      }
    } catch (err) {
      setMessages([]);
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

    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        session_id: activeSessionId || 'default-session',
        message: textToSend.trim()
      }, { headers, timeout: 45000 });

      const data = response.data;
      const assistantMessage = { sender: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.heading) {
        setSessionsList(prev => prev.map(s => 
          s.session_id === activeSessionId ? { ...s, heading: data.heading, title: data.heading } : s
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
      const errDetail = error.response?.data?.detail || "Could not connect to the YUVAA Saarthi server. Please make sure the backend is running.";
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        content: `⚠️ ${errDetail}` 
      }]);
    } finally {
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
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 61px)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      
      {/* Hyperlane Left Sidebar */}
      <aside 
        style={{
          width: sidebarOpen ? '280px' : '0px',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          borderRight: sidebarOpen ? '1px solid var(--border-medium)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 20
        }}
      >
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '280px' }}>
          
          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="hallmark-btn-primary"
            style={{ width: '100%', padding: '10px 16px', fontSize: '0.86rem' }}
          >
            <Plus size={16} />
            <span>New Safe Chat</span>
          </button>

          {/* Session History Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', marginTop: '6px' }}>
            <span className="mono-telemetry" style={{ fontSize: '0.66rem' }}>CONVERSATION LOG</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
            {sessionsList.map((s) => {
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: isActive ? '1px solid var(--border-glow)' : '1px solid transparent',
                    background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    <MessageSquare size={14} color={isActive ? 'var(--accent-blue-core)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? '600' : '400' }}>
                      {displayHeading}
                    </span>
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

          {/* Sidebar Footer Controls */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={onOpenContacts}
              className="hallmark-btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <Users size={14} color="var(--accent-pink)" />
              <span>Safety Network ({emergencyContacts.length})</span>
            </button>

            <button
              onClick={onOpenPolicy}
              className="hallmark-btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <Shield size={14} color="var(--accent-crimson)" />
              <span>Safety Charter & Protocol</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main Chat Stream Container */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Top Header Bar with Active Chat Heading & Controls */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(5, 9, 20, 0.75)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {sessionsList.find(s => s.session_id === activeSessionId)?.heading || 
                 sessionsList.find(s => s.session_id === activeSessionId)?.title || 
                 (messages.length > 0 ? "Active Conversation" : "Safe Neural Chat")}
              </span>
              <span className="mono-telemetry" style={{ fontSize: '0.62rem', color: 'var(--accent-blue-core)' }}>
                CONFIDENTIAL NEURAL COMPANION // END-TO-END SECURE
              </span>
            </div>
          </div>

          {activeSessionId && (
            <button
              onClick={(e) => handleDeleteSession(activeSessionId, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                background: 'rgba(255, 30, 86, 0.08)',
                border: '1px solid rgba(255, 30, 86, 0.22)',
                borderRadius: 'var(--radius-pill)',
                color: 'var(--accent-rose)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Delete current conversation"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 30, 86, 0.18)';
                e.currentTarget.style.borderColor = 'var(--accent-crimson)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 30, 86, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 30, 86, 0.22)';
              }}
            >
              <Trash2 size={12} />
              <span>Delete Chat</span>
            </button>
          )}
        </header>

        {/* Chat Messages Scrolling Window */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{ width: '100%', maxWidth: '768px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Empty State / Surreal Hero */}
            {messages.length === 0 ? (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  paddingTop: '40px',
                  gap: '20px'
                }} 
                className="animate-slideup"
              >
                <BrainLogo size={68} animated={true} />

                <div>
                  <div className="mono-telemetry" style={{ marginBottom: '6px' }}>
                    YUVAA SAARTHI // NEURAL COMPANION
                  </div>
                  <h1 style={{ fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }} className="off-register-text">
                    How can I support you today?
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '520px', margin: '10px auto 0', lineHeight: '1.5' }}>
                    Main aapka confidential companion hoon. English ya Hinglish me apni feelings, exam stress, ya overthinking bina kisi jhijhak share karein.
                  </p>
                </div>

                {/* 4 Prompt Pills (Cold Snap high-contrast cards) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                  width: '100%',
                  marginTop: '12px'
                }}>
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="glass-panel"
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        background: 'rgba(18, 7, 12, 0.65)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{prompt.label}</span>
                        <span className="mono-telemetry" style={{ fontSize: '0.62rem', opacity: 0.7 }}>{prompt.tag}</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: '1.4' }}>{prompt.text}</span>
                    </button>
                  ))}
                </div>

              </div>
            ) : (
              /* Message Stream */
              messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'flex', 
                      gap: '14px', 
                      alignItems: 'flex-start',
                      justifyContent: isUser ? 'flex-end' : 'flex-start'
                    }}
                    className="animate-slideup"
                  >
                    {!isUser && (
                      <BrainLogo size={32} animated={false} />
                    )}

                    <div style={{
                      maxWidth: '82%',
                      padding: isUser ? '12px 18px' : '12px 16px',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      background: isUser ? 'linear-gradient(135deg, rgba(255, 30, 86, 0.18), rgba(244, 114, 182, 0.14))' : 'rgba(255, 255, 255, 0.03)',
                      border: isUser ? '1px solid var(--border-glow)' : '1px solid var(--border-subtle)',
                      color: isUser ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.94rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      boxShadow: isUser ? '2px 2px 0 rgba(255, 30, 86, 0.2)' : 'none'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {/* Thinking / Loader Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <BrainLogo size={28} animated={true} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-pink)', fontSize: '0.84rem' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="mono-telemetry" style={{ fontSize: '0.74rem' }}>PROCESSING NEURAL CONTEXT...</span>
                </div>
              </div>
            )}

            {/* Crisis Alert Card (When High Risk / Rule 3.4a triggered) */}
            {activeHelplines.length > 0 && (
              <div 
                style={{
                  background: 'rgba(255, 30, 86, 0.08)',
                  border: '1px solid var(--accent-crimson)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 8px 30px rgba(255, 30, 86, 0.2)'
                }} 
                className="animate-slideup"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-crimson)' }}>
                  <ShieldAlert size={22} />
                  <span style={{ fontWeight: '800', fontSize: '1rem' }} className="off-register-text">
                    {activeSafeguard === 'abuse_bypass' 
                      ? 'Confidential Helpline Support Surfaced (Rule §3.4a Active)' 
                      : 'Immediate 24/7 Crisis Support Lines'}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
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
                        background: 'rgba(7, 2, 4, 0.7)',
                        border: '1px solid var(--border-glow)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 30, 86, 0.15)';
                        e.currentTarget.style.borderColor = 'var(--accent-pink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(7, 2, 4, 0.7)';
                        e.currentTarget.style.borderColor = 'var(--border-glow)';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.94rem', color: 'var(--accent-rose)' }}>
                          {helpline.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {helpline.desc}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-crimson)', fontWeight: '700', fontSize: '0.9rem' }}>
                        <PhoneCall size={16} />
                        <span>{helpline.number}</span>
                      </div>
                    </a>
                  ))}
                </div>

              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

        </div>

        {/* Bottom Floating Input Bar (Hyperlane style) */}
        <div style={{
          padding: '14px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(to top, var(--bg-primary) 85%, transparent)'
        }}>
          
          <div style={{
            width: '100%',
            maxWidth: '768px',
            position: 'relative',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-pill)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(244, 114, 182, 0.08)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px 6px 20px',
            transition: 'border-color 0.2s ease'
          }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Message YUVAA Saarthi... (English ya Hinglish me baat karein)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                padding: '8px 0',
                fontFamily: 'inherit'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                background: inputText.trim() && !isLoading ? 'linear-gradient(135deg, var(--accent-crimson), var(--accent-cherry))' : 'rgba(255, 255, 255, 0.05)',
                color: inputText.trim() && !isLoading ? '#ffffff' : 'var(--text-muted)',
                cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: inputText.trim() && !isLoading ? '0 0 12px rgba(255, 30, 86, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>YUVAA Saarthi is a youth well-being companion. In acute danger, call <strong>14416</strong> or <strong>1098</strong>.</span>
          </div>

        </div>

      </section>

    </div>
  );
}
