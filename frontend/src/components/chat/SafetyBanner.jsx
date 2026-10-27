/**
 * Yuva Saarthi — Safety Banner Component
 * Phase 6: Emergency support bar with one-touch verified helpline dialers.
 * Solid coral fill, solid stroke, WCAG compliant high contrast.
 */

import React from 'react';
import { PhoneCall, AlertTriangle, X } from 'lucide-react';

export function SafetyBanner({
  helplines = [
    { name: 'Tele-MANAS (24/7 Toll-Free)', number: '14416' },
    { name: 'KIRAN Mental Health', number: '1800-599-0019' },
    { name: 'Childline India', number: '1098' },
  ],
  onDismiss = null,
  className = '',
}) {
  return (
    <aside
      role="alert"
      aria-label="Emergency mental health helplines"
      className={`safety-banner ${className}`}
      style={{
        backgroundColor: 'var(--coral)',
        color: '#16131F',
        border: 'var(--border-width) solid var(--stroke)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        margin: '8px 16px',
        boxShadow: 'var(--shadow-hard-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} strokeWidth={2.5} aria-hidden="true" />
          <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-heading)' }}>
            Immediate Support Available
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close helpline banner"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              color: '#16131F',
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
        If you or someone you know is in distress, free, confidential professional help is available 24/7:
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '2px',
        }}
      >
        {helplines.map((item, idx) => {
          const rawNum = item.number ? item.number.replace(/[^0-9]/g, '') : '';
          return (
            <a
              key={idx}
              href={`tel:${rawNum}`}
              className="helpline-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                border: '1.5px solid var(--stroke)',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-hard-sm)',
                transition: 'transform var(--transition-fast)',
              }}
            >
              <PhoneCall size={13} strokeWidth={2.5} aria-hidden="true" />
              <span>
                {item.name}: <strong>{item.number}</strong>
              </span>
            </a>
          );
        })}
      </div>
    </aside>
  );
}

export default SafetyBanner;
