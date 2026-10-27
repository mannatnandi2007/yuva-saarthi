/**
 * Yuva Saarthi — Mood Pill Component
 * Phase 6: Real-text mood pill displayed below Yusa mascot.
 * Solid pastel fill, solid #16131F text for WCAG AA compliance, solid stroke.
 */

import React from 'react';

const MOOD_META = {
  normal: { label: 'Peaceful', color: 'var(--lilac)', emoji: '🌸' },
  happy: { label: 'Happy', color: 'var(--yellow)', emoji: '✨' },
  overjoyed: { label: 'Overjoyed', color: 'var(--pink)', emoji: '🎉' },
  sad: { label: 'Gentle Care', color: 'var(--sky)', emoji: '💗' },
  angry: { label: 'Deep Breaths', color: 'var(--coral)', emoji: '🌿' },
  anxious: { label: 'Grounded', color: 'var(--mint)', emoji: '🛡️' },
  tired: { label: 'Resting', color: 'var(--surface-2)', emoji: '🌙' },
};

export function MoodPill({ mood = 'normal', className = '' }) {
  const norm = (mood || 'normal').toLowerCase();
  const meta = MOOD_META[norm] || MOOD_META.normal;

  return (
    <div
      className={`yusa-mood-pill ${className}`}
      role="status"
      aria-label={`Current emotional companion mood is ${meta.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: meta.color,
        color: '#16131F', // Strict rule: Pastel-filled elements always use #16131F text in both themes
        border: 'var(--border-width) solid var(--stroke)',
        borderRadius: 'var(--radius-pill)',
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        boxShadow: 'var(--shadow-hard-sm)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
        userSelect: 'none',
      }}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      <span>{meta.label}</span>
    </div>
  );
}

export default MoodPill;
