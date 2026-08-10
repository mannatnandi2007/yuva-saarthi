// YUVAA Saarthi Chat Companion Interface
// Reference: PRD §3.2 (Memory summary), §3.4a (Abuse helplines), & §3.6 (Hinglish mirroring)
// Co-owned by Yashika (UI/Test sets) & Mannat (Final glue) (Execution Plan Day 2)

import React, { useState } from 'react';
import { Send, Sparkles, BookOpen, AlertCircle, PhoneCall, RotateCcw } from 'lucide-react';

export default function Chat({ userSession, onNavigate }) {
  const [messages, setMessages] = useState([
    { sender: 'assistant', content: "Hello! Main aapka YUVAA Saarthi companion hoon. How are you feeling today? Share whatever is on your mind." }
  ]);
  const [inputText, setInputText] = useState('');
  const [rollingSummary, setRollingSummary] = useState(
    "User started session. Age group: " + (userSession?.age_band || "Not Specified") + ". No previous risk flags logged."
  );
  
  // States to simulate safety engine overrides (PRD §3.4 & §3.4a)
  const [activeHelplines, setActiveHelplines] = useState([]);
  const [simulatedRisk, setSimulatedRisk] = useState(null);

  const sendMessage = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const updatedMsgs = [...messages, { sender: 'user', content: text }];
    setMessages(updatedMsgs);
    setInputText('');

    // Simulate backend response flow
    setTimeout(() => {
      // 1. Keyword check & structured category check
      const textLower = text.lower ? text.lower() : text.toLowerCase();
      
      // Simulate High Abuse detection (Rule §3.4a)
      if (textLower.includes('marte') || textLower.includes('beat') || textLower.includes('abuse')) {
        setSimulatedRisk({
          severity: 'HIGH',
          category: 'abuse',
          rationale: "User reports caregiver abuse in Roman Hindi ('marte')."
        });
        
        // Short circuit alert triggers to helpline cards (PRD §3.4a)
        setActiveHelplines([
          { name: "Childline India", phone: "1098", details: "For children and minors requiring immediate protection / counseling." },
          { name: "KIRAN Helpline", phone: "1800-599-0019", details: "National mental health helpline, 24/7 toll-free support." }
        ]);

        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "I hear you, and please know you are not alone. Aapki safety humare liye sabse important hai. I have surfaced counselor contact details below. Please reach out to them directly. Main emergency contacts ko contact nahi kar raha hoon for safety reasons."
        }]);

        setRollingSummary("Active high severity ABUSE concern flagged. Normal emergency escalation bypassed to protect user privacy. Surfaced childline contacts.");
      }
      
      // Simulate High Self-Harm detection (Rule §3.4)
      else if (textLower.includes('suicide') || textLower.includes('marna') || textLower.includes('kill myself')) {
        setSimulatedRisk({
          severity: 'HIGH',
          category: 'self_harm',
          rationale: "User mentions ending life ('suicide/marna')."
        });
        
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "I'm so sorry you're feeling this way, but please hold on. Maine safety notification triggers run kar diye hai to connect with your emergency contacts. Please call a helpline or talk to someone who can help right now."
        }]);

        setActiveHelplines([
          { name: "KIRAN Support", phone: "1800-599-0019", details: "Toll-free 24/7 counselor connection." }
        ]);

        setRollingSummary("Active high severity SELF_HARM concern. Dispatched parallel SMS and Bland AI calls to emergency priority contacts.");
      }

      // Normal Hinglish mirroring (PRD §3.6)
      else {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          content: "I understand yaar. Sometimes stress ho jata hai. Tension mat lo, just take a deep breath and share more about it."
        }]);
        
        // Update summary periodically (PRD §3.2)
        setRollingSummary("User chatting about regular topics. Current tone shows mild distress or general conversation.");
      }

    }, 800);
  };

  const handleSuggestClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const resetChat = () => {
    setMessages([{ sender: 'assistant', content: "Hello! Main aapka YUVAA Saarthi companion hoon. How are you feeling today?" }]);
    setActiveHelplines([]);
    setSimulatedRisk(null);
    setRollingSummary("Session reset. Waiting for user input.");
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', padding: '20px', height: '90vh' }}>
      
      {/* Sidebar: Session Summary Context Display */}
      <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <BookOpen size={16} color="var(--accent-indigo)" />
            <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rolling Summary</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            {rollingSummary}
          </p>
        </div>

        {simulatedRisk && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid var(--danger)', 
            borderRadius: '8px', 
            padding: '12px',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 'bold', marginBottom: '4px' }}>
              <AlertCircle size={14} /> Risk Event Logged
            </div>
            <p><strong>Severity:</strong> {simulatedRisk.severity}</p>
            <p><strong>Category:</strong> {simulatedRisk.category}</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}><strong>Rationale:</strong> {simulatedRisk.rationale}</p>
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={resetChat}
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
            <RotateCcw size={14} /> Reset Demo Simulation
          </button>

          <button 
            onClick={() => onNavigate('signup')}
            style={{ 
              width: '100%', 
              background: 'none', 
              color: 'var(--text-muted)', 
              border: 'none',
              padding: '10px', 
              marginTop: '8px',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.8rem'
            }}
          >
            Edit Onboarding Contacts
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        
        {/* Chat Window */}
        <div className="glass-container" style={{ flexGrow: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '1.25rem' }}>YUVAA Companion</h2>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: 'auto' }}>
              Connected
            </div>
          </header>

          {/* Messages Stream */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'var(--bg-tertiary)',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  fontSize: '0.95rem'
                }}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {/* Interactive Suggestions (Hinglish examples matching PRD §3.6) */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button 
              onClick={() => handleSuggestClick("I'm fine yaar bas thoda low feel ho raha hai")}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              "bas thoda low feel ho raha hai"
            </button>
            <button 
              onClick={() => handleSuggestClick("mumma bahut marte hai roz bhaiya ke samne")}
              style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ⚠️ "mumma bahut marte hai" (Abuse Check)
            </button>
            <button 
              onClick={() => handleSuggestClick("tension ho rha hai exams ka, what should I do?")}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              "tension ho rha hai exams ka"
            </button>
            <button 
              onClick={() => handleSuggestClick("i want to suicide, sab khatam ho gaya")}
              style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '16px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ⚠️ "suicide, sab khatam" (Self-Harm Check)
            </button>
          </div>

          {/* Form input */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <input 
              type="text" 
              placeholder="Mix English and Hindi (e.g. 'feeling low yaar')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="form-input"
              style={{ flexGrow: 1 }}
            />
            <button 
              onClick={() => sendMessage()}
              className="gradient-btn"
              style={{ width: '45px', height: '45px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Send size={16} />
            </button>
          </div>

        </div>

        {/* Dynamic Helpline surface on Abuse trigger (PRD §3.4a) */}
        {activeHelplines.length > 0 && (
          <div className="glass-container animate-slideup" style={{ padding: '20px', borderLeft: '5px solid var(--danger)', background: 'rgba(239,68,68,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--danger)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={16} /> Verified Safety Helplines (Routed under Safeguard §3.4a)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {activeHelplines.map((helpline, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{helpline.name}</strong>
                    <span style={{ color: 'var(--accent-teal)', fontSize: '0.9rem', fontWeight: 'bold' }}>{helpline.phone}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{helpline.details}</p>
                  
                  {/* One-tap dial button (PRD §3.4a) */}
                  <a 
                    href={`tel:${helpline.phone}`}
                    style={{ 
                      display: 'inline-block', 
                      marginTop: '8px', 
                      background: 'rgba(20, 184, 166, 0.1)', 
                      color: 'var(--accent-teal)', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    Tap to Dial
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
