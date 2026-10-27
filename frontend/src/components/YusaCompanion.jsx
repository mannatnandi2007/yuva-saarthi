/**
 * Yuva Saarthi — Yusa Companion Mascot
 * Powered by interactive 3D WebGL (Three.js / React Three Fiber).
 * Features real-time mood reactivity, cursor eye-tracking, breathing animations,
 * dynamic eyelids, brows, blush, and custom expressions for all emotional states.
 */

import React, { useState } from 'react';
import Yusa3D from './Yusa3D.jsx';
import { MOOD_META, normalizeMood } from '../utils/emotionEngine.js';

export function YusaCompanion({
  mood = 'normal',
  size = 200,
  showBubble = true,
  customMessage = null,
  className = '',
  onClick = null,
}) {
  const [bounced, setBounced] = useState(false);
  const canonicalMood = normalizeMood(mood);
  const meta = MOOD_META[canonicalMood] || MOOD_META.normal;

  const bubbleColor = meta.color;
  const bubbleText = customMessage || meta.message;

  const handleMascotClick = (e) => {
    setBounced(true);
    setTimeout(() => setBounced(false), 800);
    if (onClick) onClick(e);
  };

  const dim = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`yusa-companion-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: dim,
        userSelect: 'none',
      }}
      onClick={handleMascotClick}
      title="Yusa 3D Companion — tracks cursor and reacts to your emotions"
    >
      {/* Dynamic Floating Speech Bubble */}
      {showBubble && (
        <div
          role="status"
          aria-live="polite"
          className="yusa-speech-bubble"
          style={{
            backgroundColor: bubbleColor,
            color: '#16131F',
            border: 'var(--border-width) solid var(--stroke)',
            borderRadius: 'var(--radius-lg)',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            boxShadow: 'var(--shadow-hard-sm)',
            marginBottom: '8px',
            textAlign: 'center',
            maxWidth: '92%',
            position: 'relative',
            zIndex: 10,
            transform: bounced ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color var(--transition-normal)',
          }}
        >
          {bubbleText}
          {/* Speech bubble pointer */}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--stroke)',
            }}
          />
        </div>
      )}

      {/* 3D WebGL Mascot Canvas Container */}
      <div
        className="yusa-3d-stage"
        style={{
          width: dim,
          height: dim,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: bounced ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }}
      >
        <Yusa3D mood={meta.yusa3d} />
      </div>
    </div>
  );
}

export default YusaCompanion;
