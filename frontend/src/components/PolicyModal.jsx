import React from 'react';
import { Shield, AlertTriangle, X, Lock, Sparkles } from 'lucide-react';
import BrainLogo from './BrainLogo.jsx';

/**
 * Policy Disclosure & Safety Protocols Modal
 * Clean, human-centered safety charter without PRD numbering.
 * Refined Electric Blue and Navy Theme.
 */
export default function PolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.15)',
          padding: '28px',
          position: 'relative',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-slideup"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <BrainLogo size={34} />
            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                SAFETY & TRANSPARENCY
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }} className="off-register-text">
                Safety & Escalation Charter
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          
          {/* Pointer 1: Confidentiality */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '6px' }}>
              <Lock size={16} />
              <span>1. Private & Confidential Space</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem' }}>
              Your messages are strictly private. Everyday feelings, academic stress, and emotions are never shared with parents, schools, or third parties.
            </p>
          </div>

          {/* Pointer 2: Safe Haven Abuse Protection */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '6px' }}>
              <Shield size={16} />
              <span>2. The Safe Haven Abuse Protection Safeguard</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem' }}>
              If you disclose domestic violence, caregiver harm, or physical abuse, <strong>your personal emergency contacts are strictly NOT contacted</strong>. To protect your safety, the system suppresses notifications to personal contacts and connects you directly to national youth protection lines (Childline 1098 & KIRAN).
            </p>
          </div>

          {/* Pointer 3: Sequential Crisis Escalation */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '6px' }}>
              <AlertTriangle size={16} color="var(--accent-blue)" />
              <span>3. Acute Self-Harm Loved-One Outreach</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem' }}>
              If an imminent self-harm or suicide crisis is identified, an automated voice escalation loop alerts your chosen emergency contacts sequentially in order of priority so you receive timely real-world support. Your chat transcripts are never revealed.
            </p>
          </div>

          {/* Pointer 4: Rolling Context Memory */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '6px' }}>
              <Sparkles size={16} color="var(--accent-cyan)" />
              <span>4. Rolling Conversational Memory</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem' }}>
              A brief 150-word rolling context summary is remembered between visits so you don't have to re-explain yourself every time you check in.
            </p>
          </div>

          {/* Hotlines */}
          <div>
            <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              24/7 Verified National Helplines
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '0.86rem' }}>Tele-MANAS</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Mental Health: <strong>14416</strong></div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '0.86rem' }}>Childline India</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Youth Protection: <strong>1098</strong></div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="hallmark-btn-primary"
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '0.88rem'
            }}
          >
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  );
}
