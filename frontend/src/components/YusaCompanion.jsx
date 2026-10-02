import React, { useMemo, useState, useEffect } from 'react';
import Yusa3D from './Yusa3D.jsx';

/**
 * YusaCompanion — YUVAA Saarthi Emotional Companion Mascot
 *
 * Yusa is a Modak-style character that visually reflects the detected
 * conversational mood (NORMAL, SAD, ANGRY, HAPPY, OVERJOYED).
 *
 * POSITIONING (from annotated screenshot reference):
 *   - Fixed overlay inside the main chat section (NOT a separate panel).
 *   - Horizontally at ~70% of the chat area width (red circle centre).
 *   - Vertically at ~48% of the chat area height (slightly above middle).
 *   - Large (300px desktop, 200px tablet, 90px mobile).
 *   - Chat messages scroll BEHIND Yusa.
 *
 * VISUAL:
 *   - Purple → Pink glassmorphism glow zone.
 *   - Speech bubble above Yusa.
 *   - Current Mood card below Yusa.
 *
 * DO NOT modify mood detection logic — it lives in Chat.jsx.
 */
export default function YusaCompanion({ mood }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1100;

  const speechText = useMemo(() => {
    switch (mood) {
      case 'SAD': return "I'm here for you 💙";
      case 'ANGRY': return "Take a slow, deep breath 🌿";
      case 'HAPPY': return "Love to see you smile! 💜";
      case 'OVERJOYED': return "You're glowing today! ✨";
      case 'ANXIOUS': return "We will get through this together 💜";
      case 'SCARED': return "You are safe here 🛡️";
      case 'LONELY': return "I'm right here with you 🫂";
      case 'TIRED': return "Rest is important 🌙";
      case 'CONFUSED': return "Let's take it one step at a time 🧩";
      default: return "I'm here with you 💜";
    }
  }, [mood]);

  // Yusa visual states based on mood (Task 2: jumping & wiggling when happy, drooping when sad, etc.)
  const visualState = useMemo(() => {
    switch (mood) {
      case 'HAPPY':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="110" rx="12" ry="18" fill="#2e1065" />
              <circle cx="93" cy="103" r="5" fill="white" />
              <circle cx="85" cy="118" r="2.5" fill="white" />
              <ellipse cx="150" cy="110" rx="12" ry="18" fill="#2e1065" />
              <circle cx="153" cy="103" r="5" fill="white" />
              <circle cx="145" cy="118" r="2.5" fill="white" />
            </g>
          ),
          mouth: (
            <path d="M 108 134 Q 120 152 132 134" fill="none" stroke="#ec4899" strokeWidth="5" strokeLinecap="round" />
          ),
          blush: true,
          color: '#f472b6', // Vibrant Pink
          scale: 'scale(1.04)',
          animation: 'yusaJumpWiggle 1.3s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
          sparkles: true
        };
      case 'OVERJOYED':
        return {
          eyes: (
            <g>
              <path d="M 75 110 Q 90 92 105 110" fill="none" stroke="#2e1065" strokeWidth="6" strokeLinecap="round" />
              <path d="M 135 110 Q 150 92 165 110" fill="none" stroke="#2e1065" strokeWidth="6" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 105 130 Q 120 162 135 130 Z" fill="#ec4899" stroke="#db2777" strokeWidth="2" strokeLinejoin="round" />
          ),
          blush: true,
          color: '#ec4899', // Rich radiant pink
          scale: 'scale(1.08)',
          animation: 'yusaJumpWiggle 0.95s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
          sparkles: true
        };
      case 'SAD':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="116" rx="11" ry="11" fill="#2e1065" />
              <circle cx="93" cy="113" r="3.5" fill="white" />
              <path d="M 75 102 Q 90 92 105 106" fill="none" stroke="#2e1065" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="150" cy="116" rx="11" ry="11" fill="#2e1065" />
              <circle cx="153" cy="113" r="3.5" fill="white" />
              <path d="M 135 106 Q 150 92 165 102" fill="none" stroke="#2e1065" strokeWidth="4" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 112 146 Q 120 136 128 146" fill="none" stroke="#8b729e" strokeWidth="4" strokeLinecap="round" />
          ),
          blush: false,
          color: '#c4b5fd', // Soft muted purple
          scale: 'scale(0.94)',
          animation: 'yusaDroop 3.6s infinite ease-in-out',
          sparkles: false
        };
      case 'ANGRY':
        return {
          eyes: (
            <g>
              <path d="M 68 90 Q 90 85 105 105" fill="none" stroke="#4a044e" strokeWidth="8" strokeLinecap="round" />
              <path d="M 172 90 Q 150 85 135 105" fill="none" stroke="#4a044e" strokeWidth="8" strokeLinecap="round" />
              <ellipse cx="90" cy="120" rx="11" ry="11" fill="#4a044e" />
              <ellipse cx="150" cy="120" rx="11" ry="11" fill="#4a044e" />
            </g>
          ),
          mouth: (
            <path d="M 98 154 Q 120 136 142 154" fill="none" stroke="#4a044e" strokeWidth="7" strokeLinecap="round" />
          ),
          blush: false,
          color: '#be185d', // Deep ruby rose
          scale: 'scale(0.98)',
          animation: 'yusaAngryPulse 0.8s infinite ease-in-out',
          sparkles: false
        };
      case 'ANXIOUS':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="115" rx="10" ry="10" fill="#2e1065" />
              <path d="M 75 95 Q 90 90 105 100" fill="none" stroke="#2e1065" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="150" cy="115" rx="10" ry="10" fill="#2e1065" />
              <path d="M 135 100 Q 150 90 165 95" fill="none" stroke="#2e1065" strokeWidth="4" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 112 140 Q 116 135 120 140 T 128 140" fill="none" stroke="#8b729e" strokeWidth="4" strokeLinecap="round" />
          ),
          blush: false,
          color: '#fbcfe8', // Pale soft pink
          scale: 'scale(0.96)',
          animation: 'yusaAnxiousTremble 0.28s infinite ease-in-out',
          sparkles: false
        };
      case 'SCARED':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="110" rx="13" ry="13" fill="#2e1065" />
              <circle cx="90" cy="110" r="3.5" fill="white" />
              <path d="M 75 90 Q 90 85 105 95" fill="none" stroke="#2e1065" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="150" cy="110" rx="13" ry="13" fill="#2e1065" />
              <circle cx="150" cy="110" r="3.5" fill="white" />
              <path d="M 135 95 Q 150 85 165 90" fill="none" stroke="#2e1065" strokeWidth="4" strokeLinecap="round" />
              <path d="M 180 80 Q 190 95 180 105 Q 170 95 180 80 Z" fill="#ec4899" opacity="0.85" />
            </g>
          ),
          mouth: (
            <ellipse cx="120" cy="140" rx="6" ry="10" fill="#2e1065" />
          ),
          blush: false,
          color: '#e9d5ff',
          scale: 'scale(0.95)',
          animation: 'yusaAnxiousTremble 0.24s infinite ease-in-out',
          sparkles: false
        };
      case 'VERY_SCARED':
        return {
          eyes: (
            <g>
              <path d="M 70 80 Q 90 65 105 80" fill="none" stroke="#2e1065" strokeWidth="5" strokeLinecap="round" />
              <path d="M 135 80 Q 150 65 170 80" fill="none" stroke="#2e1065" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="90" cy="110" rx="14" ry="16" fill="#2e1065" />
              <ellipse cx="90" cy="110" rx="11" ry="13" fill="white" />
              <circle cx="90" cy="110" r="3" fill="#2e1065" />
              <ellipse cx="150" cy="110" rx="14" ry="16" fill="#2e1065" />
              <ellipse cx="150" cy="110" rx="11" ry="13" fill="white" />
              <circle cx="150" cy="110" r="3" fill="#2e1065" />
            </g>
          ),
          mouth: (
            <path d="M 100 140 C 100 120 140 120 140 140 C 140 160 100 160 100 140 Z" fill="#8b5cf6" stroke="#2e1065" strokeWidth="3" />
          ),
          blush: false,
          color: '#d8b4fe',
          scale: 'scale(0.94)',
          animation: 'yusaAnxiousTremble 0.18s infinite ease-in-out',
          sparkles: false
        };
      case 'LONELY':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="115" rx="11" ry="11" fill="#2e1065" />
              <circle cx="93" cy="112" r="3" fill="white" />
              <path d="M 75 100 Q 90 95 105 105" fill="none" stroke="#2e1065" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="150" cy="115" rx="11" ry="11" fill="#2e1065" />
              <circle cx="153" cy="112" r="3" fill="white" />
              <path d="M 135 105 Q 150 95 165 100" fill="none" stroke="#2e1065" strokeWidth="3" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 115 145 L 125 145" fill="none" stroke="#8b729e" strokeWidth="4" strokeLinecap="round" />
          ),
          blush: false,
          color: '#c4b5fd',
          scale: 'scale(0.96)',
          animation: 'yusaDroop 4.2s infinite ease-in-out',
          sparkles: false
        };
      case 'TIRED':
        return {
          eyes: (
            <g>
              <path d="M 75 115 Q 90 125 105 115" fill="none" stroke="#2e1065" strokeWidth="5" strokeLinecap="round" />
              <path d="M 135 115 Q 150 125 165 115" fill="none" stroke="#2e1065" strokeWidth="5" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <ellipse cx="120" cy="145" rx="5" ry="5" fill="#f472b6" />
          ),
          blush: true,
          color: '#e2e8f0',
          scale: 'scale(0.96)',
          animation: 'yusaSleepySway 4.5s infinite ease-in-out',
          sparkles: false
        };
      case 'CONFUSED':
        return {
          eyes: (
            <g>
              <circle cx="90" cy="110" r="14" fill="white" stroke="#2e1065" strokeWidth="3" />
              <path d="M 90 102 A 4 4 0 0 1 96 110 A 8 8 0 0 0 82 110 A 12 12 0 0 1 100 110" fill="none" stroke="#2e1065" strokeWidth="2.5" />
              <circle cx="150" cy="110" r="14" fill="white" stroke="#2e1065" strokeWidth="3" />
              <path d="M 150 102 A 4 4 0 0 1 156 110 A 8 8 0 0 0 142 110 A 12 12 0 0 1 160 110" fill="none" stroke="#2e1065" strokeWidth="2.5" />
            </g>
          ),
          mouth: (
            <path d="M 112 140 Q 116 135 120 140 T 128 140" fill="none" stroke="#2e1065" strokeWidth="3" strokeLinecap="round" />
          ),
          blush: false,
          color: '#f5d0fe',
          scale: 'scale(1)',
          animation: 'yusaCuriousTilt 2.4s infinite ease-in-out',
          sparkles: false
        };
      case 'CHITTER':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="108" rx="12" ry="17" fill="#2e1065" />
              <circle cx="93" cy="102" r="5" fill="white" />
              <circle cx="85" cy="116" r="2.5" fill="white" />
              <ellipse cx="150" cy="108" rx="12" ry="17" fill="#2e1065" />
              <circle cx="153" cy="102" r="5" fill="white" />
              <circle cx="145" cy="116" r="2.5" fill="white" />
            </g>
          ),
          mouth: (
            <path d="M 106 132 Q 120 156 134 132 Z" fill="#ec4899" stroke="#db2777" strokeWidth="2" strokeLinejoin="round" />
          ),
          blush: true,
          color: '#ec4899',
          scale: 'scale(1.06)',
          animation: 'yusaChitter 0.85s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
          sparkles: true
        };
      case 'NORMAL':
      default:
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="110" rx="10" ry="14" fill="#2e1065" />
              <circle cx="93" cy="105" r="4" fill="white" />
              <ellipse cx="150" cy="110" rx="10" ry="14" fill="#2e1065" />
              <circle cx="153" cy="105" r="4" fill="white" />
            </g>
          ),
          mouth: (
            <path d="M 115 135 Q 120 144 125 135" fill="none" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
          ),
          blush: true,
          color: '#f3e8ff',
          scale: 'scale(1)',
          animation: 'yusaFloat 3.5s infinite ease-in-out',
          sparkles: false
        };
    }
  }, [mood]);

  // ─── Sizing per breakpoint ────────────────────────────────────
  // Desktop: 180px (prominent but fits nicely on screen)
  // Tablet:  150px (slightly smaller)
  // Mobile:  90px  (compact bottom-right)
  const svgSize = isMobile ? 90 : isTablet ? 150 : 180;

  // ═══════════════════════════════════════════════════════════════
  // MOBILE: small fixed companion, bottom-right, never covering input
  // ═══════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '10px',
        zIndex: 30,
        pointerEvents: 'none',
        transition: 'all 0.5s ease',
        transform: visualState.scale,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}>
        <style>{`
          @keyframes yusaFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes yusaGlow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.04); }
          }
        `}</style>

        {/* Opaque Mask Layer for mobile */}
        <div style={{
          position: 'absolute',
          inset: '-10px',
          borderRadius: '50%',
          background: '#FAF8FF',
          boxShadow: '0 0 20px 10px #FAF8FF',
          pointerEvents: 'none',
        }} />

        {/* Glow zone */}
        <div style={{
          position: 'absolute',
          inset: '-18px',
          borderRadius: '50%',
          background: 'rgba(252, 231, 243, 0.45)',
          border: '1px solid rgba(244, 114, 182, 0.2)',
          animation: 'yusaGlow 5s infinite ease-in-out',
          pointerEvents: 'none',
        }} />

        <div style={{ animation: visualState.animation, width: svgSize, height: svgSize, position: 'relative' }}>
          <Yusa3D color={visualState.color} mood={mood} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // DESKTOP / TABLET: absolute overlay inside main chat section
  //
  // Positioning matches the exact user target:
  //   Center = 50% horizontal, 35% vertical of the MAIN CHAT AREA.
  //
  // The Chat.jsx <section> has position: relative and doesn't scroll
  // (its inner div scrolls), so position: absolute makes Yusa perfectly
  // fixed in the viewport relative to the chat area boundaries.
  // ═══════════════════════════════════════════════════════════════

  const overlayStyle = {
    position: 'relative',
    zIndex: 25,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTablet ? '8px' : '10px',
    paddingTop: '55px',
    paddingBottom: '5px',
    transition: 'transform 0.5s ease',
    transform: `${visualState.scale}`,
    flexShrink: 0
  };

  // Glow zone diameter: proportional to SVG size
  const glowSize = svgSize * 1.7;
  const ringSize = svgSize * 2.1;
  const totalHeight = svgSize + 100;

  return (
    <div className="yusa-overlay" style={overlayStyle}>
      <style>{`
        @keyframes yusaFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes yusaGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.06); }
        }
        @keyframes yusaRingPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.25; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.12; }
        }
      `}</style>

      {/* ── Opaque Mask Layer Removed ───────────────────────── */}
      {/* ── Glassy glow zone (purple → pink radial) ────────── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${glowSize}px`,
        height: `${glowSize}px`,
        borderRadius: '50%',
        background: 'rgba(252, 231, 243, 0.5)',
        animation: 'yusaGlow 6s infinite ease-in-out',
        pointerEvents: 'none',
      }} />

      {/* Outer soft ring */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${ringSize}px`,
        height: `${ringSize}px`,
        borderRadius: '50%',
        border: '1.5px solid rgba(192,132,252,0.10)',
        animation: 'yusaRingPulse 8s infinite ease-in-out',
        pointerEvents: 'none',
      }} />



      {/* ── Yusa 3D & Face Overlay ──────────────────────────────────────── */}
      <div style={{
        width: svgSize,
        height: svgSize,
        animation: visualState.animation,
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
      }}>
        <Yusa3D color={visualState.color} mood={mood} />
      </div>


    </div>
  );
}
