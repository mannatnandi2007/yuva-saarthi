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
import YusaCompanion from '../components/YusaCompanion.jsx';

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
  const chatSectionRef = useRef(null);

  // Mood Detection Logic
  const detectMood = (messages) => {
    const recentUserMsgs = messages.filter(m => m.sender === 'user').slice(-3);
    if (recentUserMsgs.length === 0) return 'NORMAL';

    const dictionaries = {
      VERY_SCARED: ['suicide', 'kill myself', 'self harm', 'die', 'want to die', 'end my life', 'cut myself', 'don\'t want to live', 'no reason to live', 'better off dead', 'suicidal', 'self-harm', 'harm myself'],
      HAPPY: ['happy', 'happier', 'joyful', 'glad', 'cheerful', 'excited', 'great', 'good', 'amazing', 'wonderful', 'fantastic', 'awesome', 'positive', 'peaceful', 'content', 'satisfied', 'relieved', 'feeling good', 'feeling better', 'feeling great', 'made my day', 'best day', 'so happy', 'really happy', 'pretty happy', "i'm doing good", 'things are going well', 'khush', 'bahut khush', 'bohot khush', 'aaj khush hoon', 'mann khush hai', 'dil khush hai', 'acha lag raha hai', 'accha lag raha hai', 'bahut acha lag raha hai', 'bohot acha lag raha hai', 'mast', 'ekdum mast', 'sab badhiya', 'sab badiya', 'sahi hai', 'maza aa raha hai', 'kaafi acha', 'relaxed hoon', 'sukoon hai', 'aaj mood acha hai'],
      OVERJOYED: ['overjoyed', 'extremely happy', 'extremely excited', 'thrilled', 'ecstatic', 'delighted', 'elated', 'on top of the world', 'best day ever', 'so excited', 'super happy', 'really excited', "can't believe it", 'this is amazing', "i'm so happy", "i'm extremely happy", 'bahut zyada khush', 'bohot zyada khush', 'ekdum khush', 'bahut excited', 'bohot excited', 'aaj toh maza aa gaya', 'dil garden garden', 'aaj toh kamaal ho gaya', 'kya mast din hai', 'bahut hi acha', 'bohot hi acha', 'life mast chal rahi hai'],
      SAD: ['sad', 'unhappy', 'upset', 'crying', 'cried', 'tears', 'hurt', 'heartbroken', 'depressed', 'miserable', 'down', 'low', 'hopeless', 'disappointed', 'broken', 'empty', 'nothing feels good', 'feel terrible', 'feel horrible', 'i feel bad', 'i feel sad', 'i want to cry', 'feeling low', 'feeling down', 'lost', 'emotionally drained', 'dukhi', 'udaas', 'bahut dukhi', 'bohot dukhi', 'mann udaas hai', 'dil udaas hai', 'rona aa raha hai', 'ro raha hoon', 'ro rahi hoon', 'aankhon mein aansu', 'dil toot gaya', 'andar se toot gaya', 'bahut bura lag raha hai', 'bohot bura lag raha hai', 'mann nahi lag raha', 'kuch acha nahi lag raha', 'akela feel ho raha hai', 'andar se khali lag raha hai', 'low feel ho raha hai', 'mood off hai'],
      ANGRY: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', 'rage', 'enraged', 'pissed', 'fed up', 'hate this', 'so angry', 'really angry', 'very angry', "can't control my anger", "i'm furious", 'this makes me angry', "i'm frustrated", 'gussa', 'gusse mein', 'bahut gussa', 'bohot gussa', 'gussa aa raha hai', 'gussa chadh raha hai', 'dimag kharab', 'dimag garam', 'pak gaya hoon', 'pak chuka hoon', 'irritate ho raha hoon', 'irritated hoon', 'frustrate ho gaya', 'frustrated hoon', 'bahut irritate', 'bohot irritate', 'mann kar raha hai chillane ka', 'bahut chidh ho rahi hai', 'chidh raha hoon'],
      ANXIOUS: ['anxious', 'anxiety', 'anxious about', 'worried', 'worry', 'worrying', 'nervous', 'stressed', 'stress', 'panic', 'panicking', 'overthinking', 'restless', 'uneasy', 'tense', 'scared about the future', "can't stop thinking", "can't calm down", 'feeling stressed', 'feeling anxious', "i'm worried", "i'm nervous", "i'm panicking", "my mind won't stop", 'tension', 'tension ho rahi hai', 'tension mein hoon', 'bahut tension', 'bohot tension', 'chinta', 'chinta ho rahi hai', 'pareshan', 'bahut pareshan', 'bohot pareshan', 'ghabrahat', 'ghabra raha hoon', 'ghabrahat ho rahi hai', 'dar lag raha hai', 'overthinking ho rahi hai', 'bahut overthink kar raha hoon', 'dimag ruk nahi raha', 'dimag mein bahut kuch chal raha hai', 'chain nahi hai', 'restless hoon', 'stress ho raha hai', 'stress mein hoon'],
      SCARED: ['scared', 'afraid', 'frightened', 'terrified', 'fear', 'fearful', 'i am scared', "i'm afraid", "i'm terrified", "i'm really scared", 'something bad will happen', "i don't feel safe", "i'm afraid of", "i'm frightened", 'dar', 'dar lag raha hai', 'bahut dar lag raha hai', 'bohot dar lag raha hai', 'darr gaya', 'darr gayi', 'bahut darr gaya', 'ghabra raha hoon', 'mujhe dar lag raha hai', 'safe feel nahi ho raha', 'mujhe khauf lag raha hai', 'bahut ghabrahat hai'],
      LONELY: ['lonely', 'alone', 'isolated', 'nobody understands me', 'no one understands me', 'no one is there', 'i have nobody', 'i feel alone', 'i feel lonely', 'feeling isolated', 'no one cares', 'nobody cares', 'i have no friends', 'i need someone', 'i want company', 'akela', 'akeli', 'akela feel ho raha hai', 'akeli feel ho rahi hai', 'bahut akela', 'bohot akela', 'koi nahi hai', 'mere saath koi nahi hai', 'koi samajhta nahi', 'mujhe koi nahi samajhta', 'kisi se baat nahi hoti', 'baat karne wala koi nahi', 'koi care nahi karta', 'sabse door ho gaya hoon', 'bahut lonely feel ho raha hai'],
      TIRED: ['tired', 'exhausted', 'drained', 'sleepy', 'fatigued', 'burnt out', 'burned out', 'no energy', 'low energy', "can't focus", 'mentally exhausted', 'emotionally exhausted', 'physically exhausted', 'i need rest', 'i need sleep', "i'm exhausted", "i'm so tired", 'thak gaya', 'thak gayi', 'bahut thak gaya', 'bohot thak gaya', 'thak chuka hoon', 'energy nahi hai', 'bilkul energy nahi', 'dimag thak gaya', 'mentally tired', 'bahut exhaustion hai', 'neend aa rahi hai', 'so jaana hai', 'rest chahiye', 'break chahiye', 'dimaag kaam nahi kar raha', 'bilkul drained hoon'],
      CONFUSED: ['confused', 'confusing', "don't understand", "i don't know", "i don't know what to do", 'overwhelmed', 'too much', 'too many things', "can't handle everything", 'everything is happening at once', 'my head is full', 'my mind is overloaded', 'i feel lost', "i don't know what i'm doing", "can't decide", 'unable to decide', 'stuck', 'i feel stuck', 'confuse hoon', 'confused ho gaya', 'samajh nahi aa raha', 'kuch samajh nahi aa raha', 'kya karu samajh nahi aa raha', 'bahut kuch ho raha hai', 'sab kuch ek saath ho raha hai', 'bahut load hai', 'dimaag mein bahut load hai', 'handle nahi ho raha', 'sab handle nahi ho raha', 'kahan se start karu', 'decision nahi le paa raha', 'decision nahi le paa rahi', 'atak gaya hoon', 'stuck hoon', 'lost feel ho raha hai', 'dimag overload ho gaya'],
      NORMAL: ['normal', 'okay', 'fine', 'alright', 'calm', 'calm down', 'peaceful', 'relaxed', 'stable', 'neutral', "i'm okay", "i'm fine", 'doing okay', 'feeling okay', 'nothing much', 'just normal', "i'm alright", 'normal hoon', 'theek hoon', 'thik hoon', 'sab theek', 'theek hai', 'kuch nahi', 'bas normal', 'shaant hoon', 'shant hoon', 'relaxed hoon', 'chill hoon', 'sab normal hai', 'theek chal raha hai', 'koi problem nahi', 'main okay hoon']
    };

    const negationPhrases = ['not', "don't", 'dont', "doesn't", 'doesnt', 'never', 'no longer', 'not feeling', "don't feel", 'dont feel'];

    const priorityLevels = {
      VERY_SCARED: 5,
      ANXIOUS: 4, SCARED: 4, SAD: 4, ANGRY: 4, LONELY: 4, CONFUSED: 4, // HIGH
      TIRED: 3, // MEDIUM
      OVERJOYED: 2, HAPPY: 2, // POSITIVE
      NORMAL: 1 // DEFAULT
    };

    const isNegated = (text, matchIndex) => {
      if (matchIndex === 0) return false;
      const prefix = text.substring(Math.max(0, matchIndex - 20), matchIndex);
      return negationPhrases.some(neg => prefix.endsWith(neg + " ") || prefix.endsWith(neg));
    };

    // Always prefer the newest message. Only fallback if the newest has absolutely NO detectable mood.
    for (let i = recentUserMsgs.length - 1; i >= 0; i--) {
      const text = recentUserMsgs[i].content.toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
      
      let messageMood = 'NORMAL';
      let messagePriority = 0;
      let moodFoundInMessage = false;

      for (const [mood, phrases] of Object.entries(dictionaries)) {
        const priority = priorityLevels[mood] || 1;

        for (const phrase of phrases) {
          const idx = text.indexOf(phrase);
          if (idx !== -1) {
            if (!isNegated(text, idx)) {
              moodFoundInMessage = true;
              if (priority > messagePriority) {
                messagePriority = priority;
                messageMood = mood;
              }
            }
          }
        }
      }

      if (moodFoundInMessage) {
        return messageMood;
      }
    }
    
    return 'NORMAL';
  };
  
  const currentMood = detectMood(messages);

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
        content: errDetail 
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1 }}>
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
                    padding: '10px 12px',
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
                    <MessageSquare size={15} color={isActive ? '#818cf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? '600' : '400', display: 'block' }}>
                        {displayHeading}
                      </span>
                      {s.started_at && (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                          {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
        </header>

        {/* ── CHAT VIEWPORT WITH DYNAMIC ENVIRONMENT (Task 2) ── */}
        <div 
          className={`chat-viewport dynamic-env env-${currentMood ? currentMood.toLowerCase() : 'normal'}`} 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
        >
          {/* ── YUSA TOP SECTION WITH EMOTION ANIMATIONS ── */}
          <YusaCompanion mood={currentMood} />

          {/* Chat Messages — this scrolls independently */}
          <div className="messages-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', zIndex: 2 }}>
            
            {/* Empty State / Surreal Hero */}
            {messages.length === 0 ? (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  paddingTop: '5px',
                  paddingBottom: '10px',
                  gap: '12px'
                }} 
                className="animate-slideup empty-chat-content"
              >
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>
                    How can I support you today?
                  </h1>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '560px', margin: '10px auto 0', lineHeight: '1.6' }}>
                    Main aapka confidential companion hoon. English ya Hinglish me apni feelings, exam stress, ya overthinking bina kisi jhijhak share karein.
                  </p>
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
                      gap: '12px', 
                      alignItems: 'flex-start',
                      justifyContent: isUser ? 'flex-end' : 'flex-start'
                    }}
                    className="animate-slideup"
                  >
                    {!isUser && (
                      <BrainLogo size={30} animated={false} />
                    )}

                    <div style={{
                      maxWidth: '78%',
                      padding: '14px 20px',
                      borderRadius: isUser ? '20px 20px 6px 20px' : '6px 20px 20px 20px',
                      background: isUser ? '#EAD8FF' : 'rgba(255, 255, 255, 0.85)',
                      border: 'none',
                      color: isUser ? '#1e293b' : '#374151',
                      fontSize: '0.92rem',
                      lineHeight: '1.7',
                      whiteSpace: 'pre-wrap',
                      boxShadow: isUser ? '0 3px 12px rgba(168, 85, 247, 0.15)' : '0 3px 14px rgba(168, 85, 247, 0.05)'
                    }}>
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
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '500' }}>Thinking...</span>
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
