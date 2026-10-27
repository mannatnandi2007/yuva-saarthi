/**
 * Yuva Saarthi — Policy Disclosure & Consent Screen
 * Phase 5 & 6: Mentions phone, SMS, Telegram, and Email multi-channel alerts.
 * Flat pastel design tokens, solid strokes, zero gradients.
 */

import React, { useState, useRef } from 'react';
import { ShieldCheck, Info, HeartHandshake, EyeOff, AlertTriangle, ExternalLink } from 'lucide-react';

export default function Consent({ userSession, onAccept, onNavigate, hasReadPolicies = false }) {
  const [policyAck, setPolicyAck] = useState(false);
  const [generalConsent, setGeneralConsent] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(hasReadPolicies);

  const scrollContainerRef = useRef(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 30) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleProceed = () => {
    if (policyAck && generalConsent) {
      onAccept({
        policy_ack_at: new Date().toISOString(),
        consent_given_at: new Date().toISOString(),
      });
    }
  };

  const isUnlocked = hasScrolledToBottom || hasReadPolicies;

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '30px auto',
        padding: '20px',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          padding: '36px 32px',
          backgroundColor: 'var(--surface)',
          border: 'var(--border-width) solid var(--stroke)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-hard)',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--lilac)',
              border: 'var(--border-width) solid var(--stroke)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16131F',
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={28} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '6px' }}>
            Safety Net, Not Surveillance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Please scroll through and review our safety charter before starting your first session.
          </p>
        </header>

        {/* Scrollable Policy Viewer Box */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-2)',
            border: `var(--border-width) solid ${isUnlocked ? 'var(--stroke)' : 'var(--text-muted)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            marginBottom: '20px',
          }}
        >
          {/* Section 1: Confidentiality */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Info size={20} strokeWidth={2.5} style={{ color: 'var(--lilac)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                What We Store & Keep Confidential
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                We securely store your encrypted conversation history, your emergency contact numbers, and a gentle rolling conversation summary. Your personal chat messages are private and never shared with emergency contacts, advertisers, schools, or third parties.
              </p>
            </div>
          </div>

          {/* Section 2: Contact Flow Rules */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <HeartHandshake size={20} strokeWidth={2.5} style={{ color: 'var(--pink)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                When We Reach Out to Emergency Contacts
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                If our safety system detects immediate, high-severity danger (active self-harm ideation), it alerts your designated emergency contacts sequentially via phone call and SMS/Telegram/Email notifications so someone in your life can check in. <strong>They are never shown your chat transcripts.</strong>
              </p>
            </div>
          </div>

          {/* Section 3: Safe Haven Abuse Protection */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              backgroundColor: 'var(--coral)',
              color: '#16131F',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <AlertTriangle size={20} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                Safe Haven Abuse Protection Safeguard
              </h3>
              <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
                If you disclose domestic violence, caregiver harm, or physical abuse, <strong>we will NOT alert your listed personal emergency contacts</strong>, protecting you from retaliatory harm. Instead, the app connects you directly to national youth protection helplines like Childline (1098).
              </p>
            </div>
          </div>

          {/* Section 4: Data control */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <EyeOff size={20} strokeWidth={2.5} style={{ color: 'var(--mint)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                Full Data Control & Right to Erase
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                You have unconditional control over your private records. You can delete individual conversations or bulk-delete past history at any time.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--stroke)' }}>
            <span style={{ fontSize: '12px', color: isUnlocked ? 'var(--text)' : 'var(--text-muted)', fontWeight: 700 }}>
              {isUnlocked
                ? '✓ Charter review complete. Checkboxes unlocked below.'
                : '↓ Scroll to the bottom of this box to unlock checkboxes.'}
            </span>
          </div>
        </div>

        {/* Link to Dedicated Policies Page */}
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => onNavigate('policies')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Read Complete Safety & Terms Document</span>
            <ExternalLink size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: isUnlocked ? 'pointer' : 'not-allowed',
              opacity: isUnlocked ? 1 : 0.5,
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              disabled={!isUnlocked}
              checked={policyAck}
              onChange={(e) => setPolicyAck(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--stroke)',
                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                marginTop: '2px',
              }}
            />
            <span>
              I understand that Yuva Saarthi notifies my designated emergency contacts via calls and notifications <strong>only</strong> during acute self-harm crises, and that abuse disclosures are strictly shielded.
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: isUnlocked ? 'pointer' : 'not-allowed',
              opacity: isUnlocked ? 1 : 0.5,
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              disabled={!isUnlocked}
              checked={generalConsent}
              onChange={(e) => setGeneralConsent(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--stroke)',
                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                marginTop: '2px',
              }}
            />
            <span>
              I consent to processing my messages to receive supportive, empathetic conversational guidance with Yusa.
            </span>
          </label>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={!policyAck || !generalConsent}
          onClick={handleProceed}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--stroke)',
            color: 'var(--bg)',
            border: 'var(--border-width-control) solid var(--stroke)',
            boxShadow: policyAck && generalConsent ? 'var(--shadow-hard)' : 'none',
            fontSize: '15px',
            fontWeight: 700,
            cursor: policyAck && generalConsent ? 'pointer' : 'not-allowed',
            opacity: policyAck && generalConsent ? 1 : 0.45,
            transition: 'transform var(--transition-fast)',
          }}
        >
          Accept & Enter Chat
        </button>
      </div>
    </div>
  );
}
