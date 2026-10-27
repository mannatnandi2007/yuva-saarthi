/**
 * Yuva Saarthi — Dedicated Safety Policies & Transparency Page
 * Phase 6: Flat pastel design system, solid strokes, zero gradients.
 */

import React, { useEffect } from 'react';
import { ShieldCheck, HeartHandshake, AlertTriangle, EyeOff, ArrowLeft, PhoneCall } from 'lucide-react';

export default function PoliciesPage({ onBack, onMarkAsRead }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    if (onMarkAsRead) {
      onMarkAsRead();
    }
  }, [onMarkAsRead]);

  return (
    <div
      style={{
        maxWidth: '760px',
        margin: '30px auto',
        padding: '24px 20px',
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
        {/* Navigation & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--stroke)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={15} strokeWidth={2.5} />
            <span>Back</span>
          </button>

          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px' }}>
            Yuva Saarthi Charter
          </span>
        </div>

        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
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
          <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '8px' }}>
            Safety Net, Not Surveillance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '540px', margin: '0 auto' }}>
            How Yuva Saarthi protects your privacy, handles sensitive disclosures, and keeps you safe.
          </p>
        </header>

        {/* Safety Pointers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '32px' }}>
          {/* Pointer 1 */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <ShieldCheck size={22} strokeWidth={2.5} style={{ color: 'var(--lilac)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                Total Confidentiality by Default
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.55 }}>
                Your private chats are encrypted and never shared with parents, guardians, teachers, or schools. Only you and your companion have access to your thoughts and conversations.
              </p>
            </div>
          </div>

          {/* Pointer 2 */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <HeartHandshake size={22} strokeWidth={2.5} style={{ color: 'var(--pink)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                When Emergency Escalation Triggers
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.55 }}>
                If you express active self-harm intent, Yuva Saarthi contacts your designated emergency contacts sequentially via phone calls and automated SMS/Telegram/Email notifications to check on you. <strong>Your private message history is NEVER disclosed to them.</strong>
              </p>
            </div>
          </div>

          {/* Pointer 3 */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--coral)',
              color: '#16131F',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <AlertTriangle size={22} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                Safe Haven Protection for Abuse Disclosures
              </h3>
              <p style={{ fontSize: '13px', lineHeight: 1.55 }}>
                If you disclose domestic violence or caregiver abuse, the system <strong>strictly does not notify</strong> your personal contacts, as doing so might put you in danger. We provide direct connections to verified national helplines instead.
              </p>
            </div>
          </div>

          {/* Pointer 4 */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--stroke)',
            }}
          >
            <EyeOff size={22} strokeWidth={2.5} style={{ color: 'var(--mint)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                Right to Delete and Session Reset
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.55 }}>
                You have unconditional right to wipe any conversation session or bulk-delete your entire history.
              </p>
            </div>
          </div>
        </div>

        {/* National Helplines Box */}
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-2)',
            border: 'var(--border-width) solid var(--stroke)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
            Verified 24/7 National Helplines
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <a
              href="tel:14416"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--stroke)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-hard-sm)',
              }}
            >
              <PhoneCall size={14} strokeWidth={2.5} />
              <span>Tele-MANAS: <strong>14416</strong></span>
            </a>

            <a
              href="tel:18005990019"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--stroke)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-hard-sm)',
              }}
            >
              <PhoneCall size={14} strokeWidth={2.5} />
              <span>KIRAN Mental Health: <strong>1800-599-0019</strong></span>
            </a>

            <a
              href="tel:1098"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--stroke)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-hard-sm)',
              }}
            >
              <PhoneCall size={14} strokeWidth={2.5} />
              <span>Childline India: <strong>1098</strong></span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
