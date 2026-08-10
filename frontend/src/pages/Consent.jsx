// YUVAA Saarthi Policy Disclosure & Consent Screen
// Reference: PRD §3.5 (Policy disclosure & consent) & Execution Plan Day 5

import React, { useState } from 'react';
import { ShieldCheck, Info, HeartHandshake, EyeOff, AlertTriangle } from 'lucide-react';

export default function Consent({ onAccept, onNavigate }) {
  const [policyAck, setPolicyAck] = useState(false);
  const [generalConsent, setGeneralConsent] = useState(false);

  const handleProceed = () => {
    if (policyAck && generalConsent) {
      onAccept({
        policy_ack_at: new Date().toISOString(),
        consent_given_at: new Date().toISOString()
      });
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', padding: '20px' }} className="animate-slideup">
      <div className="glass-container" style={{ padding: '40px' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <ShieldCheck size={48} color="#a855f7" style={{ marginBottom: '12px' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Safety Net, Not Surveillance</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Please review how we keep you safe and protect your privacy before starting.</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
          
          {/* Section 1: Data Stored */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <Info size={24} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>What we store</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                We securely store your chat messages, emergency contact details, a rolling 150-word conversation summary, and the safety analysis results (risk ratings and logic rationales).
              </p>
            </div>
          </div>

          {/* Section 2: Contact Flow Rules */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <HeartHandshake size={24} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>When we reach out</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                If our AI safety engine detects high-severity danger (like self-harm or severe emotional distress), it will call or text your emergency contacts to alert them that you need support. <strong>They are never shown your chat messages.</strong>
              </p>
            </div>
          </div>

          {/* Section 3: Abuse Safeguard Routing */}
          <div style={{ display: 'flex', gap: '16px', background: 'rgba(239, 68, 68, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--danger)', marginBottom: '4px' }}>The Abuse Safeguard Rule (§3.4a)</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                If you disclose high-severity abuse, <strong>we will NOT contact your listed personal emergency contacts</strong>, since they may not be a safe reference. Instead, the app will instantly connect you directly with counselor lines like KIRAN (1800-599-0019) or Childline (1098).
              </p>
            </div>
          </div>

          {/* Section 4: Deletion policy */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <EyeOff size={24} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Data control</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                All conversation histories are private. You can trigger a data deletion request at any point in settings to completely wipe your session records.
              </p>
            </div>
          </div>

        </section>

        {/* Checkboxes for distinct user acknowledgements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', marginBottom: '32px' }}>
          
          <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input 
              type="checkbox" 
              checked={policyAck}
              onChange={(e) => setPolicyAck(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)' }}
            />
            <span>
              I acknowledge the data storage policies, including the <strong>Abuse Safeguard routing</strong> details (Captures <code>policy_ack_at</code>).
            </span>
          </label>

          <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input 
              type="checkbox" 
              checked={generalConsent}
              onChange={(e) => setGeneralConsent(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-indigo)' }}
            />
            <span>
              I consent to the YUVAA Saarthi safety agreement and promise to prioritize my well-being (Captures <code>consent_given_at</code>).
            </span>
          </label>

        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => onNavigate('signup')} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Back to Sign Up
          </button>
          
          <button 
            onClick={handleProceed}
            disabled={!policyAck || !generalConsent}
            className="gradient-btn"
            style={{ 
              padding: '12px 24px', 
              borderRadius: '8px', 
              opacity: (policyAck && generalConsent) ? 1 : 0.5,
              cursor: (policyAck && generalConsent) ? 'pointer' : 'not-allowed'
            }}
          >
            I Accept & Start Chatting
          </button>
        </div>

      </div>
    </div>
  );
}
