/**
 * Yuva Saarthi — Mood Pill Component
 * Displays empathetic real-time emotional resonance badge below 3D mascot.
 * Fully wired to Emotion Engine with support for distressed, stressed, anxious, sad, angry, etc.
 */

import React from 'react';
import { MOOD_META, normalizeMood } from '../../utils/emotionEngine.js';

export function MoodPill({ mood = 'normal', className = '' }) {
  const norm = normalizeMood(mood);
  const meta = MOOD_META[norm] || MOOD_META.normal;

  return (
    <div
      className={`yusa-mood-pill ${className}`}
      role="status"
      aria-label={`Current emotional companion resonance is ${meta.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: meta.color,
        color: '#16131F', // Pastel-filled elements always use #16131F text in both themes
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
