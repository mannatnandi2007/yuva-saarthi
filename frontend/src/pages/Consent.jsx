import React, { useState, useRef } from 'react';
import { ShieldCheck, Info, HeartHandshake, EyeOff, AlertTriangle, ExternalLink, Lock } from 'lucide-react';

/**
 * YUVAA Saarthi Policy Disclosure & Consent Screen
 * Enforces reading safety policies before confirmation checkboxes unlock.
 * Completely free of PRD rule numbers (§3.4a, §5.2).
 */
export default function Consent({ userSession, onAccept, onNavigate, hasReadPolicies = false }) {
  const [policyAck, setPolicyAck] = useState(false);
  const [generalConsent, setGeneralConsent] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(hasReadPolicies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scrollContainerRef = useRef(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user scrolled within 30px of bottom, mark as read
      if (scrollTop + clientHeight >= scrollHeight - 30) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleProceed = () => {
    if (policyAck && generalConsent) {
      onAccept({
        policy_ack_at: new Date().toISOString(),
        consent_given_at: new Date().toISOString()
      });
    }
  };

  const isUnlocked = hasScrolledToBottom || hasReadPolicies;

  return (
    <div style={{ maxWidth: '680px', margin: '30px auto', padding: '20px' }} className="animate-slideup">
      <div className="glass-panel" style={{ padding: '36px 40px' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', marginBottom: '12px' }}>
            <ShieldCheck size={42} color="var(--accent-blue)" />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontFamily: 'var(--font-display)', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Safety Net, Not Surveillance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
            Please scroll through and review our safety charter before starting your first session.
          </p>
        </header>

        {/* Scrollable Policy Viewer Box */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isUnlocked ? 'var(--border-medium)' : 'rgba(59, 130, 246, 0.4)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          {/* Section 1: Confidentiality & Data Stored */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <Info size={22} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                What We Store & Keep Confidential
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.45' }}>
                We securely store your encrypted conversation history, your emergency contact numbers, and a gentle rolling 150-word conversation summary. Your personal chat messages are private and never shared with emergency contacts, advertisers, or third parties.
              </p>
            </div>
          </div>

          {/* Section 2: Contact Flow Rules */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <HeartHandshake size={22} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                When We Reach Out to Emergency Contacts
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.45' }}>
                If our safety system detects immediate, high-severity danger (such as active self-harm ideation), it alerts your designated emergency contacts sequentially via phone call so someone in your life can step in. <strong>They are never shown your chat transcripts.</strong>
              </p>
            </div>
          </div>

          {/* Section 3: Safe Haven Abuse Protection */}
          <div style={{ 
            display: 'flex', 
            gap: '14px', 
            background: 'rgba(59, 130, 246, 0.08)', 
            padding: '14px', 
            borderRadius: '10px', 
            border: '1px solid rgba(59, 130, 246, 0.25)' 
          }}>
            <AlertTriangle size={22} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                The Safe Haven Abuse Protection Safeguard
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.45' }}>
                If you disclose domestic violence, caregiver harm, or physical abuse, <strong>we will NOT alert your listed personal emergency contacts</strong>, as doing so might compromise your safety. Instead, the app connects you directly to national youth protection lines like Childline (1098) or KIRAN (1800-599-0019).
              </p>
            </div>
          </div>

          {/* Section 4: Data control */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <EyeOff size={22} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                Full Data Control & Right to Erase
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.45' }}>
                You have unconditional control over your private records. You can request instant session wiping or complete profile erasure at any time in settings.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.78rem', color: isUnlocked ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: '600' }}>
              {isUnlocked ? "✓ Policy review complete. Checkboxes unlocked below." : "↓ Scroll to the bottom of this box to unlock checkboxes."}
            </span>
          </div>
        </div>

        {/* Link to Dedicated Full Policies Page */}
        <div style={{ textAlign: 'right', marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => onNavigate('policies')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'underline'
            }}
          >
            <span>Read Full Safety Policies on Dedicated Page</span>
            <ExternalLink size={13} />
          </button>
        </div>

        {/* Checkboxes Section (Locked until policy is read) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          borderTop: '1px solid var(--border-subtle)', 
          paddingTop: '20px', 
          marginBottom: '28px',
          opacity: isUnlocked ? 1 : 0.6,
          transition: 'opacity 0.2s ease'
        }}>
          {!isUnlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.82rem', marginBottom: '4px' }}>
              <Lock size={14} />
              <span>Please scroll through the policy box above or open the dedicated policy page to unlock confirmation.</span>
            </div>
          )}

          <label style={{ display: 'flex', gap: '12px', cursor: isUnlocked ? 'pointer' : 'not-allowed', fontSize: '0.92rem', alignItems: 'flex-start' }}>
            <input 
              type="checkbox" 
              checked={policyAck}
              disabled={!isUnlocked}
              onChange={(e) => setPolicyAck(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', marginTop: '2px', cursor: isUnlocked ? 'pointer' : 'not-allowed' }}
            />
            <span style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              I have reviewed the safety policies, including the <strong>Abuse Protection Safeguard</strong> and emergency escalation protocols.
            </span>
          </label>

          <label style={{ display: 'flex', gap: '12px', cursor: isUnlocked ? 'pointer' : 'not-allowed', fontSize: '0.92rem', alignItems: 'flex-start' }}>
            <input 
              type="checkbox" 
              checked={generalConsent}
              disabled={!isUnlocked}
              onChange={(e) => setGeneralConsent(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', marginTop: '2px', cursor: isUnlocked ? 'pointer' : 'not-allowed' }}
            />
            <span style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              I consent to the YUVAA Saarthi safety agreement and agree to prioritize my well-being.
            </span>
          </label>
        </div>

        {error && (
          <div style={{ color: '#f87171', marginBottom: '16px', textAlign: 'center', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => onNavigate('signup')} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.88rem' }}
          >
            Back to Sign Up
          </button>
          
          <button 
            onClick={handleProceed}
            disabled={!policyAck || !generalConsent || loading}
            className="hallmark-btn-primary"
            style={{ 
              padding: '12px 26px', 
              borderRadius: '8px', 
              opacity: (!policyAck || !generalConsent || loading) ? 0.45 : 1,
              cursor: (!policyAck || !generalConsent || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'I Accept & Continue'}
          </button>
        </div>

      </div>
    </div>
  );
}
