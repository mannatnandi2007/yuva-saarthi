/**
 * Yuva Saarthi — Policy Modal Component
 * Phase 6: Human-centered safety and escalation charter.
 * Flat pastel design system, solid strokes, zero gradients.
 */

import React from 'react';
import { Shield, AlertTriangle, X, Lock } from 'lucide-react';

export default function PolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Safety & Escalation Charter"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(22, 19, 31, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--surface)',
          border: 'var(--border-width) solid var(--stroke)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-hard-lg)',
          padding: '28px',
          position: 'relative',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: 'var(--border-width) solid var(--stroke)',
            paddingBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--lilac)',
                border: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16131F',
              }}
            >
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Safety & Transparency
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: 0 }}>
                Safety & Escalation Charter
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close policy modal"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-pill)',
              border: 'var(--border-width) solid var(--stroke)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
              <Lock size={16} strokeWidth={2.5} />
              <span>1. Total Confidentiality by Default</span>
            </div>
            All chats are private. Your conversations are never shared with parents, teachers, schools, or third parties unless severe imminent danger is detected.
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--coral)',
              color: '#16131F',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
              <AlertTriangle size={16} strokeWidth={2.5} />
              <span>2. Emergency Contact Escalation</span>
            </div>
            If extreme self-harm is detected, Yuva Saarthi notifies your designated emergency contacts sequentially via phone calls and emergency SMS/Telegram alerts.
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--mint)',
              color: '#16131F',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
              <Shield size={16} strokeWidth={2.5} />
              <span>3. Abuse Disclosure Protection</span>
            </div>
            If you disclose abuse or domestic violence, we strictly DO NOT notify personal contacts, keeping you safe from retaliatory harm. National helpline numbers (1098 Childline) are provided directly to you.
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--stroke)',
              color: 'var(--bg)',
              border: 'var(--border-width) solid var(--stroke)',
              boxShadow: 'var(--shadow-hard-sm)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
