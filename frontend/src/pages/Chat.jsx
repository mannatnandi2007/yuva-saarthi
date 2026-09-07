// YUVAA Saarthi — ChatGPT-style Clean Companion Interface
// Modern dark-mode layout with sidebar history, new chat, and seamless crisis routing

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Plus, MessageSquare, LogOut, Heart, PhoneCall, 
  PanelLeftClose, PanelLeft, Sparkles, User, ShieldAlert, 
  ExternalLink, Loader2 
} from 'lucide-react';
import axios from 'axios';

// BUG-010 FIX: Use VITE_API_URL env variable for production deployments (Vercel)
// Set VITE_API_URL=https://your-backend.railway.app in Vercel environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SUGGESTED_PROMPTS = [
  { label: "Exam Stress", text: "Exams ko lekar bohot zyada stress aur pressure feel ho raha hai." },
  { label: "Feeling Overwhelmed", text: "I am feeling overwhelmed and don't know what to do." },
  { label: "Family Tension", text: "Ghar pe bohot tension chal rahi hai, samajh nahi aa raha kaise handle karoon." },
  { label: "Need to Vent", text: "I just feel really lonely today and need someone safe to talk to." }
];

export default function Chat({ userSession, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Active crisis state if triggered
  const [activeHelplines, setActiveHelplines] = useState([]);
  const [activeSafeguard, setActiveSafeguard] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

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

  // Load session history and initialize fresh new chat on startup
  useEffect(() => {
    const initChat = async () => {
      const headers = getAuthHeaders();

      // 1. Fetch prior session list for history sidebar
      try {
        const listRes = await axios.get(`${API_BASE_URL}/sessions`, {
          headers,
          timeout: 3000
        });
      
        if (Array.isArray(listRes.data)) {
          setSessionsList(listRes.data);
        }
      } catch (err) {
        console.debug("Could not fetch sessions list; starting local session.");
      }
      
      // Yashika Phase 5: Load emergency contacts
      try {
        const contactsRes = await axios.get(`${API_BASE_URL}/contacts`, {
          headers,
          timeout: 3000
        });
      
        if (Array.isArray(contactsRes.data)) {
          setEmergencyContacts(contactsRes.data);
        }
      } catch (err) {
        console.debug("Could not load emergency contacts.");
      }
      
      // 2. Start a fresh new chat session on login
      await createNewChat();
    };

    initChat();
  }, [userSession]);

  const createNewChat = async () => {
    setIsLoading(true);
    setActiveHelplines([]);
    setActiveSafeguard(null);
    setMessages([]); // Clean empty state with prompt suggestions like ChatGPT

    try {
      const headers = getAuthHeaders();
      const res = await axios.post(`${API_BASE_URL}/sessions`, {}, { headers, timeout: 3000 });
      if (res.data?.session_id) {
        const newId = res.data.session_id;
        setActiveSessionId(newId);
        setSessionsList(prev => [
          { session_id: newId, started_at: new Date().toISOString(), title: "New Conversation" },
          ...prev.filter(s => s.session_id !== newId)
        ]);
      }
    } catch (err) {
      const fallbackId = 'local-' + Date.now();
      setActiveSessionId(fallbackId);
      setSessionsList(prev => [
        { session_id: fallbackId, started_at: new Date().toISOString(), title: "New Conversation" },
        ...prev
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
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
    const text = (textOverride || inputText).trim();
    if (!text || isLoading) return;

    const userMessage = { sender: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Update session title in history if first message
    if (messages.length === 0 && activeSessionId) {
      setSessionsList(prev => prev.map(s => 
        s.session_id === activeSessionId ? { ...s, title: text.slice(0, 28) + (text.length > 28 ? '...' : '') } : s
      ));
    }

    try {
      const headers = getAuthHeaders();
      const sessionId = activeSessionId || 'local-' + Date.now();

      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        { session_id: sessionId, message: text },
        { headers, timeout: 10000 }
      );

      const data = response.data;
      setMessages(prev => [...prev, { sender: 'assistant', content: data.reply }]);

      const risk = data.risk_classification;
      const action = data.action_taken;
      
      setActiveHelplines([]);
      setActiveSafeguard(null);
      
      // Handle crisis safety routing
      if (action === 'routed_to_helpline' || (risk?.category === 'abuse' && risk?.severity === 'high')) {
        setActiveSafeguard("abuse_bypass");
        setActiveHelplines([
          { name: "Childline India", number: "1098", desc: "Confidential 24/7 child & youth safety line" },
          { name: "KIRAN Helpline", number: "1800-599-0019", desc: "National mental health 24/7 toll-free" }
        ]);
      } else if (risk?.severity === 'high' && risk?.category === 'self_harm') {
        setActiveSafeguard("self_harm_alert");
        setActiveHelplines([
          { name: "KIRAN Helpline", number: "1800-599-0019", desc: "Immediate 24/7 crisis support" },
          { name: "Tele-MANAS", number: "14416", desc: "Govt of India tele-mental health service" }
        ]);
      }

    } catch (err) {
      // Local graceful fallback
      const textLower = text.toLowerCase();
      if (textLower.includes('marte') || textLower.includes('beat') || textLower.includes('abuse')) {
        setActiveSafeguard("abuse_bypass");
        setActiveHelplines([
          { name: "Childline India", number: "1098", desc: "24/7 youth safety & protection" },
          { name: "KIRAN Helpline", number: "1800-599-0019", desc: "Confidential mental health support" }
        ]);
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "Tumhari safety humare liye sabse important hai. Aapki privacy protected hai aur personal contacts ko contact nahi kiya jayega. Please Childline 1098 ya KIRAN 1800-599-0019 se help lo."
        }]);
      } else if (textLower.includes('suicide') || textLower.includes('marna') || textLower.includes('kill myself')) {
        setActiveSafeguard("self_harm_alert");
        setActiveHelplines([
          { name: "KIRAN Helpline", number: "1800-599-0019", desc: "Free, confidential 24/7 crisis line" }
        ]);
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "Main tumhari baat sun raha hoon. Please kisi trusted adult ya KIRAN Helpline (1800-599-0019) se baat karo. You are not alone."
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "I hear you. Main yahan hoon aapke saath. Jo bhi dil me hai, khul ke share karo — I am here to listen."
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const displayPhone = userSession?.user_phone || userSession?.phone || "+91 ••••• •••••";

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#09090b', color: '#f4f4f5', overflow: 'hidden' }}>
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (ChatGPT Style)                                           */}
      {/* ========================================================================= */}
      <aside style={{
        width: sidebarOpen ? '260px' : '0px',
        minWidth: sidebarOpen ? '260px' : '0px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#121215',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Top Header & New Chat Button */}
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Heart size={16} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1rem', letterSpacing: '-0.02em' }}>
                YUVAA <span style={{ color: '#a855f7' }}>Saarthi</span>
              </span>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
              title="Close sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#f4f4f5',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: '500',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} />
              <span>New chat</span>
            </div>
            <Sparkles size={14} style={{ color: '#a855f7' }} />
          </button>

        </div>

        {/* Middle: Chat History Sessions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          <div style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: '600', padding: '8px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Conversations
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sessionsList.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: '0.82rem', color: '#52525b' }}>
                No prior chats yet
              </div>
            ) : (
              sessionsList.map((session) => {
                const isActive = session.session_id === activeSessionId;
                const title = session.title || "Chat Session";
                return (
                  <button
                    key={session.session_id}
                    onClick={() => loadSession(session.session_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: isActive ? '#f4f4f5' : '#a1a1aa',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <MessageSquare size={15} style={{ flexShrink: 0, color: isActive ? '#a855f7' : '#71717a' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom: User Profile & Logout */}
        <div style={{
          padding: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#27272a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4d4d8'
            }}>
              <User size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userSession?.username ? `@${userSession.username}` : (userSession?.first_name ? `${userSession.first_name} ${userSession.last_name}` : displayPhone)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#71717a' }}>
                {userSession?.first_name ? `${userSession.first_name} ${userSession.last_name}` : 'Verified Profile'}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '6px',
              border: 'none',
              background: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.82rem',
              marginTop: '4px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <LogOut size={14} />
            <span>Log out</span>
          </button>

        </div>

      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT AREA (ChatGPT Style)                                         */}
      {/* ========================================================================= */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        
        {/* Top Minimal Bar */}
        <header style={{
          height: '52px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(9, 9, 11, 0.7)',
          backdropFilter: 'blur(10px)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Open sidebar"
              >
                <PanelLeft size={20} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>YUVAA Saarthi</span>
              <span style={{
                background: 'rgba(168, 85, 247, 0.12)',
                color: '#c084fc',
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(168, 85, 247, 0.25)'
              }}>
                Hinglish Companion
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#71717a' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
            <span>Private & Confidential</span>
          </div>
        </header>

        {/* Chat Conversation Scroll Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px'
        }}>
          
          <div style={{ width: '100%', maxWidth: '768px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Empty State: ChatGPT Greeting & Suggestion Pills */}
            {messages.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                paddingTop: '60px',
                gap: '24px'
              }} className="animate-slideup">
                
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(168, 85, 247, 0.25)'
                }}>
                  <Heart size={28} color="#fff" fill="#fff" />
                </div>

                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                    How can I support you today?
                  </h1>
                  <p style={{ color: '#a1a1aa', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto', lineHeight: '1.5' }}>
                    Main aapka confidential companion hoon. English ya Hinglish me apni feelings, stress, ya thoughts bina kisi jhijhak share karein.
                  </p>
                </div>

                {/* 4 Suggestion Pills */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                  width: '100%',
                  marginTop: '16px'
                }}>
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt.text)}
                      style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#d4d4d8',
                        fontSize: '0.86rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <span style={{ fontWeight: '600', color: '#f4f4f5' }}>{prompt.label}</span>
                      <span style={{ color: '#71717a', fontSize: '0.8rem', lineHeight: '1.4' }}>{prompt.text}</span>
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
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        <Sparkles size={16} color="#fff" />
                      </div>
                    )}

                    <div style={{
                      maxWidth: '82%',
                      padding: isUser ? '12px 18px' : '8px 4px',
                      borderRadius: isUser ? '20px' : '0',
                      background: isUser ? '#27272a' : 'transparent',
                      color: isUser ? '#f4f4f5' : '#e4e4e7',
                      fontSize: '0.96rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Loader2 size={16} color="#fff" className="animate-spin" />
                </div>
                <span style={{ color: '#71717a', fontSize: '0.88rem' }}>Thinking...</span>
              </div>
            )}

            {/* Crisis Support Card (Cleanly surfaced without flashy slop) */}
            {activeHelplines.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '14px',
                padding: '18px 20px',
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }} className="animate-slideup">
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
                  <ShieldAlert size={20} />
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                    {activeSafeguard === 'abuse_bypass' 
                      ? 'Confidential Helpline Support Available' 
                      : 'Immediate Crisis Support Lines'}
                  </span>
                </div>

                <p style={{ fontSize: '0.86rem', color: '#d4d4d8', lineHeight: '1.5', margin: 0 }}>
                  {activeSafeguard === 'abuse_bypass' 
                    ? 'Your safety and privacy come first. Your emergency contacts are NOT contacted. You can reach out to dedicated youth protection helplines 24/7:' 
                    : 'You do not have to go through this alone. Professional counselors are available 24/7 to listen and support you:'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {activeHelplines.map((helpline, i) => (
                    <a
                      key={i}
                      href={`tel:${helpline.number.replace(/\D/g, '')}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        color: '#f4f4f5',
                        textDecoration: 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fca5a5' }}>
                          {helpline.name} ({helpline.number})
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                          {helpline.desc}
                        </div>
                      </div>
                      <PhoneCall size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                    </a>
                  ))}
                </div>

              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

        </div>

        {/* Bottom Floating Input Bar (ChatGPT Style) */}
        <div style={{
          padding: '16px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(to top, #09090b 80%, transparent)'
        }}>
          
          <div style={{
            width: '100%',
            maxWidth: '768px',
            position: 'relative',
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 10px 6px 18px',
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
                color: '#f4f4f5',
                fontSize: '0.95rem',
                padding: '8px 0',
                fontFamily: 'inherit'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: inputText.trim() && !isLoading ? '#f4f4f5' : '#27272a',
                color: inputText.trim() && !isLoading ? '#09090b' : '#71717a',
                cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={16} />
            </button>
          </div>

          <p style={{ fontSize: '0.72rem', color: '#52525b', marginTop: '10px', textAlign: 'center' }}>
            YUVAA Saarthi is an empathetic youth companion. If you are in immediate danger or distress, call <strong>14416</strong> or <strong>1098</strong>.
          </p>

        </div>

      </main>

    </div>
  );
}
