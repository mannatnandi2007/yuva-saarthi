// YUVAA Saarthi Chat Companion Interface
// Reference: PRD §3.2 (Memory summary), §3.4a (Abuse helplines), & §3.6 (Hinglish mirroring)
// Co-owned by Yashika (UI/Test sets) & Mannat (Final glue) (Execution Plan Day 2)

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, BookOpen, AlertCircle, PhoneCall, RotateCcw, ShieldCheck, Wifi, WifiOff, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export default function Chat({ userSession, onNavigate }) {
  const [messages, setMessages] = useState([
    { sender: 'assistant', content: "Hello! Main aapka YUVAA Saarthi companion hoon. How are you feeling today? Share whatever is on your mind." }
  ]);
  const [inputText, setInputText] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected' | 'offline' | 'checking'
  
  const [rollingSummary, setRollingSummary] = useState(
    "User started session. Age group: " + (userSession?.age_band || "Youth") + ". No previous risk flags logged."
  );
  
  // Real safety engine state from backend (PRD §3.4 & §3.4a)
  const [activeHelplines, setActiveHelplines] = useState([]);
  const [currentRisk, setCurrentRisk] = useState(null);
  const [actionTaken, setActionTaken] = useState('logged_only');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auth headers builder supporting real Supabase JWT and dev-bypass
  const getAuthHeaders = () => {
    const headers = {};
    const token = userSession?.access_token || userSession?.session_id;
    if (token && token.length > 30) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Dev bypass header for local development / testing
    const devUserId = userSession?.user_id || '00000000-0000-0000-0000-000000000001';
    headers['X-Dev-User-Id'] = devUserId;
    return headers;
  };

  // Initialize or fetch existing session on component mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const headers = getAuthHeaders();
        // Check health
        await axios.get(`${API_BASE_URL}/`, { timeout: 3000 });
        setBackendStatus('connected');

        // Create new session or fetch latest
        const sessionRes = await axios.post(`${API_BASE_URL}/sessions`, {}, { headers });
        if (sessionRes.data?.session_id) {
          setActiveSessionId(sessionRes.data.session_id);
          
          // Try loading history if any
          try {
            const histRes = await axios.get(
              `${API_BASE_URL}/chat/history/${sessionRes.data.session_id}`,
              { headers }
            );
            if (histRes.data && histRes.data.length > 0) {
              setMessages(histRes.data.map(m => ({
                sender: m.sender,
                content: m.content
              })));
            }
          } catch (e) {
            // New session has no history yet
          }
        }
      } catch (err) {
        console.warn("Backend API not reachable or session init error; running in local resilient mode:", err.message);
        setBackendStatus('offline');
        // Generate client-side fallback session ID
        setActiveSessionId('local-' + Date.now());
      }
    };

    initSession();
  }, [userSession]);

  const startNewSession = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      const sessionRes = await axios.post(`${API_BASE_URL}/sessions`, {}, { headers });
      if (sessionRes.data?.session_id) {
        setActiveSessionId(sessionRes.data.session_id);
      }
      setBackendStatus('connected');
    } catch (err) {
      setActiveSessionId('local-' + Date.now());
    } finally {
      setMessages([
        { sender: 'assistant', content: "Hello! New session start ho gaya hai. Main aapka YUVAA Saarthi companion hoon. How are you feeling right now?" }
      ]);
      setActiveHelplines([]);
      setCurrentRisk(null);
      setActionTaken('logged_only');
      setRollingSummary("New session started. Waiting for user input.");
      setIsLoading(false);
    }
  };

  const sendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    // Add user message to state immediately
    const userMsg = { sender: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const headers = getAuthHeaders();
      const currentSession = activeSessionId || 'local-' + Date.now();

      // Call real backend POST /chat endpoint
      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        {
          session_id: currentSession,
          message: text
        },
        { headers, timeout: 8000 }
      );

      setBackendStatus('connected');
      const data = response.data;
      const risk = data.risk_classification;
      const action = data.action_taken;

      // Add assistant response
      setMessages(prev => [...prev, { sender: 'assistant', content: data.reply }]);

      // Update safety and risk status
      if (risk) {
        setCurrentRisk({
          severity: risk.severity.toUpperCase(),
          category: risk.category,
          rationale: risk.rationale
        });
      }
      setActionTaken(action);

      // Handle Helplines & Escalation routing
      // RULE §3.4a: Abuse detected -> Surface helplines & BYPASS personal contacts
      if (action === 'routed_to_helpline' || (risk?.category === 'abuse' && risk?.severity?.toLowerCase() === 'high')) {
        setActiveHelplines([
          { name: "Childline India", phone: "1098", details: "Confidential 24/7 helpline for minors & youth needing protection/support." },
          { name: "KIRAN Mental Health", phone: "1800-599-0019", details: "National mental health helpline, 24/7 toll-free support." }
        ]);
        setRollingSummary("⚠️ High-severity ABUSE flagged. Emergency personal contact escalation bypassed (PRD §3.4a). Direct helpline resources surfaced.");
      }
      // RULE §3.4: Self-harm detected -> Surface crisis helplines
      else if (risk?.severity?.toLowerCase() === 'high' && risk?.category === 'self_harm') {
        setActiveHelplines([
          { name: "KIRAN Helpline", phone: "1800-599-0019", details: "Free, confidential 24/7 crisis response line." },
          { name: "Tele-MANAS", phone: "14416", details: "Govt of India 24/7 tele-mental health assistance." }
        ]);
        setRollingSummary("⚠️ High-severity SELF_HARM flagged. Safety escalation initiated. Surfaced urgent crisis helplines.");
      }
      // General distress or normal conversation
      else if (risk?.severity?.toLowerCase() === 'medium') {
        setRollingSummary(`User expressing moderate distress (${risk.category}). Empathy and active listening provided.`);
      } else {
        setRollingSummary("Normal conversational flow. Tone: stable, no risk triggers detected.");
      }

    } catch (err) {
      console.error("Chat API error; falling back to client-side triage:", err);
      setBackendStatus('offline');

      // Client-side graceful fallback simulation if backend is temporarily disconnected
      const textLower = text.toLowerCase();
      if (textLower.includes('marte') || textLower.includes('beat') || textLower.includes('abuse') || textLower.includes('galat chhua')) {
        setCurrentRisk({ severity: 'HIGH', category: 'abuse', rationale: "Abuse indicators detected in Roman Hindi/English." });
        setActionTaken('routed_to_helpline');
        setActiveHelplines([
          { name: "Childline India", phone: "1098", details: "For children and minors requiring immediate protection / counseling." },
          { name: "KIRAN Helpline", phone: "1800-599-0019", details: "National mental health helpline, 24/7 toll-free support." }
        ]);
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "Tumhari safety humare liye sabse important hai. Aapki privacy protected hai aur personal contacts ko contact nahi kiya jayega. Please Childline 1098 ya KIRAN 1800-599-0019 se help lo."
        }]);
        setRollingSummary("⚠️ High severity ABUSE flagged. Emergency personal contact escalation bypassed (PRD §3.4a). Direct helpline resources surfaced.");
      } else if (textLower.includes('suicide') || textLower.includes('marna') || textLower.includes('kill myself') || textLower.includes('jaan de')) {
        setCurrentRisk({ severity: 'HIGH', category: 'self_harm', rationale: "Self-harm indicators detected." });
        setActionTaken('call_placed');
        setActiveHelplines([
          { name: "KIRAN Support", phone: "1800-599-0019", details: "Toll-free 24/7 counselor connection." }
        ]);
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "Main tumhari baat sun raha hoon. Please kisi trusted adult ya KIRAN Helpline (1800-599-0019) se baat karo. You are not alone."
        }]);
        setRollingSummary("⚠️ High severity SELF_HARM flagged. Safety escalation initiated.");
      } else {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "I understand yaar. Sab theek ho jayega, tension mat lo. Take a deep breath — main yahan hoon sunne ke liye. Batao kya chal raha hai?"
        }]);
        setRollingSummary("Conversational register matched (Hinglish mirroring).");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', padding: '20px', height: 'calc(100vh - 120px)' }}>
      
      {/* Sidebar: Session Summary Context Display */}
      <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
        
        {/* Backend Status indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: '8px',
          background: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {backendStatus === 'connected' ? (
              <Wifi size={14} color="var(--success)" />
            ) : (
              <WifiOff size={14} color="var(--danger)" />
            )}
            <span style={{ fontWeight: '600' }}>
              {backendStatus === 'connected' ? 'FastAPI Backend Online' : 'FastAPI Backend Offline'}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {activeSessionId ? activeSessionId.slice(0, 8) + '...' : 'No session'}
          </span>
        </div>

        {/* Rolling summary panel (PRD §3.2) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <BookOpen size={16} color="var(--accent-indigo)" />
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rolling Summary</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            {rollingSummary}
          </p>
        </div>

        {/* Real-time Risk classification details */}
        {currentRisk && (
          <div style={{ 
            background: currentRisk.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)', 
            border: `1px solid ${currentRisk.severity === 'HIGH' ? 'var(--danger)' : '#f59e0b'}`, 
            borderRadius: '8px', 
            padding: '12px',
            fontSize: '0.8rem'
          }} className="animate-slideup">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: currentRisk.severity === 'HIGH' ? 'var(--danger)' : '#f59e0b', fontWeight: 'bold', marginBottom: '6px' }}>
              <AlertCircle size={14} /> Risk Classification
            </div>
            <p><strong>Severity:</strong> <span style={{ color: currentRisk.severity === 'HIGH' ? 'var(--danger)' : '#f59e0b' }}>{currentRisk.severity}</span></p>
            <p><strong>Category:</strong> {currentRisk.category}</p>
            <p><strong>Action Taken:</strong> <code>{actionTaken}</code></p>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}><strong>Rationale:</strong> {currentRisk.rationale}</p>
          </div>
        )}

        {/* Abuse-Aware Routing Safeguard Note (PRD §3.4a) */}
        {actionTaken === 'routed_to_helpline' && (
          <div style={{
            background: 'rgba(20, 184, 166, 0.08)',
            border: '1px solid var(--accent-teal)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.78rem'
          }} className="animate-slideup">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-teal)', fontWeight: 'bold', marginBottom: '4px' }}>
              <ShieldCheck size={14} /> Safeguard §3.4a Active
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Personal emergency contacts are <strong>NOT dialed</strong> or notified. Abuse cases are routed exclusively to professional helplines for user safety.
            </p>
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={startNewSession}
            disabled={isLoading}
            style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.05)', 
              color: 'var(--text-secondary)', 
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '10px', 
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <RotateCcw size={14} /> Start New Session
          </button>

          <button 
            onClick={() => onNavigate('signup')}
            style={{ 
              width: '100%', 
              background: 'none', 
              color: 'var(--text-muted)', 
              border: 'none',
              padding: '6px', 
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.8rem'
            }}
          >
            Edit Onboarding & Contacts
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        
        {/* Chat Window */}
        <div className="glass-container" style={{ flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '1.15rem' }}>YUVAA Companion (Hinglish Active)</h2>
            <div style={{ 
              background: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              color: backendStatus === 'connected' ? 'var(--success)' : 'var(--danger)', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.75rem', 
              marginLeft: 'auto' 
            }}>
              {backendStatus === 'connected' ? 'FastAPI Active' : 'Fallback Mode'}
            </div>
          </header>

          {/* Messages Stream */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'var(--bg-tertiary)',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  fontSize: '0.95rem',
                  lineHeight: '1.45'
                }}
              >
                {msg.content}
              </div>
            ))}

            {isLoading && (
              <div style={{ 
                alignSelf: 'flex-start', 
                background: 'var(--bg-tertiary)', 
                padding: '10px 14px', 
                borderRadius: '16px 16px 16px 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
              }}>
                <Loader2 size={16} className="animate-spin" /> YUVAA Saarthi is listening...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Suggestions (Hinglish examples matching PRD §3.6) */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button 
              onClick={() => sendMessage("I'm fine yaar bas thoda low feel ho raha hai")}
              disabled={isLoading}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: '14px', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              "bas thoda low feel ho raha hai"
            </button>
            <button 
              onClick={() => sendMessage("mumma bahut marte hai roz bhaiya ke samne")}
              disabled={isLoading}
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)', padding: '6px 10px', borderRadius: '14px', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ⚠️ "mumma bahut marte hai" (Abuse Bypass Test)
            </button>
            <button 
              onClick={() => sendMessage("tension ho rha hai exams ka, what should I do?")}
              disabled={isLoading}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: '14px', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              "tension ho rha hai exams ka"
            </button>
            <button 
              onClick={() => sendMessage("i want to suicide, sab khatam ho gaya")}
              disabled={isLoading}
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)', padding: '6px 10px', borderRadius: '14px', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ⚠️ "suicide, sab khatam" (Self-Harm Test)
            </button>
          </div>

          {/* Form input */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <input 
              type="text" 
              placeholder="Type in English, Hindi, or Hinglish (e.g. 'bohot stress ho raha hai')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
              className="form-input"
              style={{ flexGrow: 1 }}
            />
            <button 
              onClick={() => sendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="gradient-btn"
              style={{ width: '45px', height: '45px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: (!inputText.trim() || isLoading) ? 0.6 : 1 }}
            >
              <Send size={16} />
            </button>
          </div>

        </div>

        {/* Dynamic Helpline surface on Abuse trigger (PRD §3.4a) or Crisis trigger */}
        {activeHelplines.length > 0 && (
          <div className="glass-container animate-slideup" style={{ padding: '16px', borderLeft: '5px solid var(--danger)', background: 'rgba(239,68,68,0.03)' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--danger)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={16} /> Verified Safety Helplines (Routed under Safeguard §3.4a)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {activeHelplines.map((helpline, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{helpline.name}</strong>
                    <span style={{ color: 'var(--accent-teal)', fontSize: '0.9rem', fontWeight: 'bold' }}>{helpline.phone}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{helpline.details}</p>
                  
                  {/* One-tap dial button (PRD §3.4a) */}
                  <a 
                    href={`tel:${helpline.phone}`}
                    style={{ 
                      display: 'inline-block', 
                      background: 'rgba(20, 184, 166, 0.15)', 
                      color: 'var(--accent-teal)', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      textDecoration: 'none', 
                      fontWeight: 'bold' 
                    }}
                  >
                    Tap to Dial: {helpline.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
