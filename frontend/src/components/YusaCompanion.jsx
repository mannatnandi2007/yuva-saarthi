/**
 * Yuva Saarthi — Yusa Companion Mascot
 * Phase 6: Pure 2D SVG vector mascot with 7 mood states, zero WebGL/Three.js.
 * Follows flat pastel design system with solid strokes and zero gradients.
 */

import React, { useMemo } from 'react';

const MOOD_COLORS = {
  normal: 'var(--lilac)',
  happy: 'var(--yellow)',
  overjoyed: 'var(--pink)',
  sad: 'var(--sky)',
  angry: 'var(--coral)',
  anxious: 'var(--mint)',
  tired: 'var(--surface-2)',
};

const MOOD_MESSAGES = {
  normal: "I'm here with you 🌸",
  happy: "Love seeing you smile! ✨",
  overjoyed: "You're doing amazing! 🎉",
  sad: "I'm right here beside you 💗",
  angry: "Take a slow, deep breath 🌿",
  anxious: "One step at a time, you are safe 🛡️",
  tired: "Rest is important, take it easy 🌙",
};

export function YusaCompanion({
  mood = 'normal',
  size = 200,
  showBubble = true,
  customMessage = null,
  className = '',
}) {
  const normalizedMood = (mood || 'normal').toLowerCase();
  const currentMood = ['normal', 'happy', 'overjoyed', 'sad', 'angry', 'anxious', 'tired'].includes(normalizedMood)
    ? normalizedMood
    : 'normal';

  const bubbleColor = MOOD_COLORS[currentMood] || 'var(--lilac)';
  const bubbleText = customMessage || MOOD_MESSAGES[currentMood] || MOOD_MESSAGES.normal;

  return (
    <div
      className={`yusa-companion-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: typeof size === 'number' ? `${size}px` : size,
        userSelect: 'none',
      }}
    >
      {/* Speech Bubble */}
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
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            boxShadow: 'var(--shadow-hard-sm)',
            marginBottom: '8px',
            textAlign: 'center',
            maxWidth: '90%',
            position: 'relative',
            zIndex: 2,
            transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
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

      {/* SVG Mascot */}
      <svg
        viewBox="0 0 240 240"
        width="100%"
        height="100%"
        role="img"
        aria-label={`Yusa mascot feeling ${currentMood}`}
        className={`yusa-svg yusa-mood-${currentMood}`}
        style={{
          display: 'block',
          overflow: 'visible',
          animation: currentMood === 'overjoyed'
            ? 'yusaBounce 1.2s infinite cubic-bezier(0.28, 0.84, 0.42, 1)'
            : 'yusaBreathe 4s infinite ease-in-out',
        }}
      >
        <defs>
          <style>{`
            @keyframes yusaBreathe {
              0%, 100% { transform: scale(1) translateY(0); }
              50% { transform: scale(1.025) translateY(-2px); }
            }
            @keyframes yusaBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-7px); }
            }
            @keyframes yusaBlink {
              0%, 94%, 100% { transform: scaleY(1); }
              97% { transform: scaleY(0.12); }
            }
            .yusa-eye-group {
              transform-origin: 120px 115px;
              animation: yusaBlink 5s infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .yusa-svg, .yusa-eye-group {
                animation: none !important;
              }
            }
          `}</style>
        </defs>

        {/* Shadow base (flat solid pill) */}
        <ellipse
          cx="120"
          cy="214"
          rx="68"
          ry="10"
          fill="var(--surface-2)"
          stroke="var(--stroke)"
          strokeWidth="2"
        />

        {/* Top-knot tuft (curly modak swirl in #7FB8F0) */}
        <g id="yusa-tuft">
          <path
            d="M 112 55 C 102 38, 116 22, 126 24 C 138 26, 134 42, 123 52 Z"
            fill="#7FB8F0"
            stroke="var(--stroke)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M 121 28 C 126 33, 124 40, 119 46"
            fill="none"
            stroke="var(--stroke)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Body (Dumpling / Modak silhouette) */}
        <path
          id="yusa-body"
          d="M 120 50
             C 142 58, 168 85, 180 118
             C 192 152, 194 184, 182 198
             C 168 210, 72 210, 58 198
             C 46 184, 48 152, 60 118
             C 72 85, 98 58, 120 50 Z"
          fill="var(--lilac)"
          stroke="var(--stroke)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Solid Pink Cheeks */}
        <circle cx="78" cy="138" r="10" fill="#F6A9D5" stroke="var(--stroke)" strokeWidth="1.5" />
        <circle cx="162" cy="138" r="10" fill="#F6A9D5" stroke="var(--stroke)" strokeWidth="1.5" />

        {/* Mood-Specific Features: Eyes, Brows, Mouth, Extras, Hands */}

        {/* 1. NORMAL */}
        {currentMood === 'normal' && (
          <g id="mood-normal">
            {/* Gentle curved brows */}
            <path d="M 88 102 Q 100 97 108 102" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 132 102 Q 140 97 152 102" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Eyes */}
            <g className="yusa-eye-group">
              <ellipse cx="98" cy="116" rx="7" ry="9" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="99" cy="116" r="5" fill="#16131F" />
              <circle cx="101" cy="113" r="1.8" fill="#FFFFFF" />

              <ellipse cx="142" cy="116" rx="7" ry="9" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="141" cy="116" r="5" fill="#16131F" />
              <circle cx="143" cy="113" r="1.8" fill="#FFFFFF" />
            </g>
            {/* Gentle smile */}
            <path d="M 112 140 Q 120 148 128 140" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Meditation hands resting together at center */}
            <g id="yusa-hands-meditation">
              <ellipse cx="112" cy="178" rx="10" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
              <ellipse cx="128" cy="178" rx="10" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
              <path d="M 116 178 Q 120 182 124 178" fill="none" stroke="var(--stroke)" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* 2. HAPPY */}
        {currentMood === 'happy' && (
          <g id="mood-happy">
            {/* High cheerful brows */}
            <path d="M 86 98 Q 98 90 108 97" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 132 97 Q 142 90 154 98" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Bright round eyes */}
            <g className="yusa-eye-group">
              <circle cx="98" cy="115" r="9" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="98" cy="115" r="5.5" fill="#16131F" />
              <circle cx="101" cy="112" r="2.2" fill="#FFFFFF" />

              <circle cx="142" cy="115" r="9" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="142" cy="115" r="5.5" fill="#16131F" />
              <circle cx="145" cy="112" r="2.2" fill="#FFFFFF" />
            </g>
            {/* Wide smile */}
            <path d="M 108 137 Q 120 152 132 137" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Cheerful hands */}
            <ellipse cx="94" cy="174" rx="9" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
            <ellipse cx="146" cy="174" rx="9" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
          </g>
        )}

        {/* 3. OVERJOYED */}
        {currentMood === 'overjoyed' && (
          <g id="mood-overjoyed">
            {/* Joyful raised brows */}
            <path d="M 86 94 Q 98 86 108 93" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 132 93 Q 142 86 154 94" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Crescent laughing closed eyes (^ ^) */}
            <path d="M 90 118 Q 98 106 106 118" fill="none" stroke="var(--stroke)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 134 118 Q 142 106 150 118" fill="none" stroke="var(--stroke)" strokeWidth="3.5" strokeLinecap="round" />
            {/* Open laughing mouth */}
            <path d="M 106 135 Q 120 158 134 135 Z" fill="#FF8F7A" stroke="var(--stroke)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M 112 147 Q 120 142 128 147" fill="none" stroke="var(--stroke)" strokeWidth="2" strokeLinecap="round" />
            {/* Raised hands celebrating */}
            <ellipse cx="64" cy="144" rx="8" ry="11" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" transform="rotate(-25 64 144)" />
            <ellipse cx="176" cy="144" rx="8" ry="11" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" transform="rotate(25 176 144)" />
            {/* Little sparkles */}
            <path d="M 52 92 L 56 96 L 52 100 L 48 96 Z" fill="#F8D66D" stroke="var(--stroke)" strokeWidth="1.5" />
            <path d="M 188 92 L 192 96 L 188 100 L 184 96 Z" fill="#F8D66D" stroke="var(--stroke)" strokeWidth="1.5" />
          </g>
        )}

        {/* 4. SAD */}
        {currentMood === 'sad' && (
          <g id="mood-sad">
            {/* Drooped sorrowful brows */}
            <path d="M 88 98 Q 98 104 108 100" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 132 100 Q 142 104 152 98" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Drooped eyes */}
            <g className="yusa-eye-group">
              <ellipse cx="98" cy="116" rx="7" ry="8" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="98" cy="118" r="4.5" fill="#16131F" />
              <circle cx="99" cy="116" r="1.5" fill="#FFFFFF" />

              <ellipse cx="142" cy="116" rx="7" ry="8" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="142" cy="118" r="4.5" fill="#16131F" />
              <circle cx="143" cy="116" r="1.5" fill="#FFFFFF" />
            </g>
            {/* Solid sky-blue teardrop */}
            <path
              d="M 148 126 C 144 132, 142 138, 146 141 C 150 144, 154 138, 151 130 Z"
              fill="#A8D8F5"
              stroke="var(--stroke)"
              strokeWidth="1.5"
            />
            {/* Soft small frown */}
            <path d="M 112 144 Q 120 137 128 144" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Comfort hands */}
            <ellipse cx="112" cy="178" rx="9" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
            <ellipse cx="128" cy="178" rx="9" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
          </g>
        )}

        {/* 5. ANGRY */}
        {currentMood === 'angry' && (
          <g id="mood-angry">
            {/* Furrowed angry brows */}
            <path d="M 88 100 L 108 106" fill="none" stroke="var(--stroke)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 152 100 L 132 106" fill="none" stroke="var(--stroke)" strokeWidth="3" strokeLinecap="round" />
            {/* Determined eyes */}
            <g className="yusa-eye-group">
              <ellipse cx="98" cy="116" rx="7" ry="8" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="101" cy="116" r="4.5" fill="#16131F" />

              <ellipse cx="142" cy="116" rx="7" ry="8" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="139" cy="116" r="4.5" fill="#16131F" />
            </g>
            {/* Flat line mouth */}
            <line x1="110" y1="140" x2="130" y2="140" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Coral anger puff mark */}
            <g id="anger-puff" transform="translate(170, 78)">
              <path d="M 0 6 L 14 6 M 7 0 L 7 14" stroke="#FF8F7A" strokeWidth="3" strokeLinecap="round" />
              <path d="M 3 3 L 11 11 M 11 3 L 3 11" stroke="var(--stroke)" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            {/* Hands firmly planted */}
            <ellipse cx="88" cy="178" rx="10" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
            <ellipse cx="152" cy="178" rx="10" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
          </g>
        )}

        {/* 6. ANXIOUS */}
        {currentMood === 'anxious' && (
          <g id="mood-anxious">
            {/* Uneven worried brows */}
            <path d="M 86 102 Q 98 96 108 104" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 132 104 Q 142 98 154 100" fill="none" stroke="var(--stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Wide alert eyes */}
            <g className="yusa-eye-group">
              <circle cx="98" cy="116" r="9" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="98" cy="116" r="4" fill="#16131F" />
              <circle cx="100" cy="114" r="1.5" fill="#FFFFFF" />

              <circle cx="142" cy="116" r="9" fill="#FFFFFF" stroke="var(--stroke)" strokeWidth="2.5" />
              <circle cx="142" cy="116" r="4" fill="#16131F" />
              <circle cx="144" cy="114" r="1.5" fill="#FFFFFF" />
            </g>
            {/* Solid mint sweat drop */}
            <path
              d="M 68 108 C 64 114, 62 118, 66 122 C 70 125, 74 120, 72 112 Z"
              fill="#B6E8CF"
              stroke="var(--stroke)"
              strokeWidth="1.5"
            />
            {/* Wobbly wavy mouth */}
            <path
              d="M 110 142 Q 115 137 120 142 Q 125 147 130 142"
              fill="none"
              stroke="var(--stroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Clutched hands */}
            <ellipse cx="114" cy="176" rx="9" ry="8" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
            <ellipse cx="126" cy="176" rx="9" ry="8" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
          </g>
        )}

        {/* 7. TIRED */}
        {currentMood === 'tired' && (
          <g id="mood-tired">
            {/* Flat calm brows */}
            <line x1="88" y1="104" x2="108" y2="104" stroke="var(--stroke)" strokeWidth="2" strokeLinecap="round" />
            <line x1="132" y1="104" x2="152" y2="104" stroke="var(--stroke)" strokeWidth="2" strokeLinecap="round" />
            {/* Half-closed drowsy eyes (-_-) */}
            <path d="M 90 118 Q 98 122 106 118" fill="none" stroke="var(--stroke)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 134 118 Q 142 122 150 118" fill="none" stroke="var(--stroke)" strokeWidth="3" strokeLinecap="round" />
            {/* Calm small resting mouth */}
            <line x1="114" y1="140" x2="126" y2="140" stroke="var(--stroke)" strokeWidth="2" strokeLinecap="round" />
            {/* Floating solid "z" markers */}
            <text x="174" y="90" fill="var(--text-muted)" fontSize="18" fontWeight="bold" fontFamily="var(--font-heading)">z</text>
            <text x="186" y="74" fill="var(--text-muted)" fontSize="13" fontWeight="bold" fontFamily="var(--font-heading)">z</text>
            {/* Resting hands */}
            <ellipse cx="112" cy="180" rx="9" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
            <ellipse cx="128" cy="180" rx="9" ry="7" fill="var(--lilac)" stroke="var(--stroke)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default YusaCompanion;
