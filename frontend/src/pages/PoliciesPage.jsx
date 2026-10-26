import React, { useEffect } from 'react';
import { ShieldCheck, HeartHandshake, AlertTriangle, EyeOff, Sparkles, ArrowLeft, PhoneCall } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

/**
 * Dedicated Safety Policies & Transparency Page
 * Reference: PRD safety charter with all PRD rule numbers (§3.4a, §5.2) removed.
 * Formatted into clear, human-centered safety pointers.
 */
export default function PoliciesPage({ onBack, onMarkAsRead }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    if (onMarkAsRead) {
      onMarkAsRead();
    }
  }, [onMarkAsRead]);

  return (
    <div style={{ maxWidth: '760px', margin: '30px auto', padding: '24px' }} className="animate-slideup">
      <div className="glass-panel" style={{ padding: '36px 40px' }}>
        
        {/* Navigation & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button
            onClick={onBack}
            className="hallmark-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
          >
            <ArrowLeft size={15} />
            <span>Back to Previous Screen</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainLogo size={28} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Yuva Saarthi Charter
            </span>
          </div>
        </div>

        <header style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', marginBottom: '14px' }}>
            <ShieldCheck size={40} color="var(--accent-blue)" />
          </div>
          <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Safety Net, Not Surveillance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', maxWidth: '540px', margin: '0 auto' }}>
            How Yuva Saarthi protects your privacy, handles sensitive disclosures, and keeps you safe.
          </p>
        </header>

        {/* Safety Pointers without PRD numbering */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '36px' }}>
          
          {/* Pointer 1: Confidential Chat Space */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '20px', 
            borderRadius: '14px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <EyeOff size={24} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                1. Complete Conversation Confidentiality
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Your chats, emotions, and journal entries are private. They are never sold, shared with advertisers, or displayed to anyone else. Even if an emergency alert is triggered, <strong>your personal message transcripts are never shown or read out to your emergency contacts</strong>.
              </p>
            </div>
          </div>

          {/* Pointer 2: Emergency Safety Net */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '20px', 
            borderRadius: '14px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <HeartHandshake size={24} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                2. Emergency Loved-One Outreach
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                If our safety system detects imminent life-threatening danger or active self-harm, it will reach out sequentially to your chosen emergency contacts (e.g. parent or trusted friend) so someone in your physical life knows you need support right now.
              </p>
            </div>
          </div>

          {/* Pointer 3: Abuse Safeguard Protection */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '20px', 
            borderRadius: '14px', 
            background: 'rgba(59, 130, 246, 0.07)', 
            border: '1px solid rgba(59, 130, 246, 0.3)' 
          }}>
            <AlertTriangle size={24} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px', color: 'var(--accent-cyan)' }}>
                3. The Safe Haven Abuse Protection Safeguard
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                If you disclose domestic violence, physical violence, or caregiver abuse, <strong>the system will NEVER contact your personal emergency contacts</strong>, because reaching out to personal contacts could put you in greater danger. Instead, the companion connects you directly to verified national protective services like Childline (1098) or KIRAN (1800-599-0019).
              </p>
            </div>
          </div>

          {/* Pointer 4: Gentle Context Memory */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '20px', 
            borderRadius: '14px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <Sparkles size={24} style={{ color: '#93c5fd', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                4. Gentle Conversational Memory
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                To save you from re-explaining your challenges every time you open the app, our system retains a gentle, rolling 150-word summary of past interactions. This context is encrypted and strictly scoped to your private profile.
              </p>
            </div>
          </div>

          {/* Pointer 5: Full Data Control & Deletion */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '20px', 
            borderRadius: '14px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <ShieldCheck size={24} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                5. Total Data Ownership & Right to Be Forgotten
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                You have unconditional control over your data. You can trigger an instant session wipe or request complete account erasure at any time.
              </p>
            </div>
          </div>

        </div>

        {/* Dedicated Helplines Bar */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-medium)',
          borderRadius: '14px',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '32px'
        }}>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
              National Emergency Helplines Available 24/7
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Tele-MANAS: 14416 | Childline: 1098 | KIRAN Mental Health: 1800-599-0019
            </div>
          </div>
          <a
            href="tel:14416"
            className="hallmark-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
          >
            <PhoneCall size={14} color="var(--accent-cyan)" />
            <span>Call 14416</span>
          </a>
        </div>

        {/* Bottom Action */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onBack}
            className="hallmark-btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.92rem' }}
          >
            I Have Reviewed the Safety Policies
          </button>
        </div>

      </div>
    </div>
  );
}
