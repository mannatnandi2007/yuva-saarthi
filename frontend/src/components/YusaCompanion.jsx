import React, { useMemo, useState, useEffect } from 'react';
import Yusa3D from './Yusa3D.jsx';

/**
 * YusaCompanion — Yuva Saarthi Emotional Companion Mascot
 *
 * Yusa is a cushion-style character that visually reflects the detected
 * conversational mood (NORMAL, SAD, ANGRY, HAPPY, OVERJOYED, etc.).
 *
 * POSITIONING:
 *   - Fixed overlay inside the main chat section (NOT a separate panel).
 *   - Chat messages scroll BEHIND Yusa.
 *
 * COLOR PALETTE: White, Pink, Coral, Red ONLY. No purple.
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
      case 'SAD': return "I'm here for you 💗";
      case 'ANGRY': return "Take a slow, deep breath 🌿";
      case 'HAPPY': return "Love to see you smile! 🌸";
      case 'OVERJOYED': return "You're glowing today! ✨";
      case 'ANXIOUS': return "We will get through this together 💗";
      case 'SCARED': return "You are safe here 🛡️";
      case 'LONELY': return "I'm right here with you 🫂";
      case 'TIRED': return "Rest is important 🌙";
      case 'CONFUSED': return "Let's take it one step at a time 🧩";
      default: return "I'm here with you 🌸";
    }
  }, [mood]);

  // ─── Animation and glow config per mood ───────────────────────────
  const visualConfig = useMemo(() => {
    switch (mood) {
      case 'HAPPY':
        return {
          scale: 'scale(1.04)',
          animation: 'yusaJumpWiggle 1.3s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
          glowColor: 'rgba(255, 158, 189, 0.3)',
        };
      case 'OVERJOYED':
        return {
          scale: 'scale(1.08)',
          animation: 'yusaJumpWiggle 0.95s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
          glowColor: 'rgba(255, 77, 109, 0.35)',
        };
      case 'SAD':
        return {
          scale: 'scale(0.94)',
          animation: 'yusaDroop 3.6s infinite ease-in-out',
          glowColor: 'rgba(147, 197, 253, 0.3)',
        };
      case 'ANGRY':
        return {
          scale: 'scale(0.98)',
          animation: 'yusaAngryPulse 0.8s infinite ease-in-out',
          glowColor: 'rgba(239, 68, 68, 0.25)',
        };
      case 'ANXIOUS':
        return {
          scale: 'scale(0.96)',
          animation: 'yusaAnxiousTremble 0.28s infinite ease-in-out',
          glowColor: 'rgba(251, 146, 60, 0.3)',
        };
      case 'SCARED':
        return {
          scale: 'scale(0.95)',
          animation: 'yusaAnxiousTremble 0.24s infinite ease-in-out',
          glowColor: 'rgba(125, 143, 163, 0.35)',
        };
      case 'VERY_SCARED':
        return {
          scale: 'scale(0.94)',
          animation: 'yusaAnxiousTremble 0.18s infinite ease-in-out',
          glowColor: 'rgba(125, 143, 163, 0.35)',
        };
      case 'LONELY':
        return {
          scale: 'scale(0.96)',
          animation: 'yusaDroop 4.2s infinite ease-in-out',
          glowColor: 'rgba(255, 158, 189, 0.35)',
        };
      case 'TIRED':
        return {
          scale: 'scale(0.96)',
          animation: 'yusaSleepySway 4.5s infinite ease-in-out',
          glowColor: 'rgba(168, 162, 181, 0.35)',
        };
      case 'CONFUSED':
        return {
          scale: 'scale(1)',
          animation: 'yusaCuriousTilt 2.4s infinite ease-in-out',
          glowColor: 'rgba(251, 191, 36, 0.25)',
        };
      case 'CHITTER':
        return {
          scale: 'scale(1.06)',
          animation: 'yusaChitter 0.85s infinite cubic-bezier(0.28, 0.84, 0.42, 1)',
          glowColor: 'rgba(255, 77, 109, 0.3)',
        };
      case 'NORMAL':
      default:
        return {
          scale: 'scale(1)',
          animation: 'yusaFloat 3.5s infinite ease-in-out',
          glowColor: 'rgba(255, 228, 230, 0.5)',
        };
    }
  }, [mood]);

  // ─── Sizing per breakpoint ────────────────────────────────────
  const svgSize = isMobile ? 90 : isTablet ? 150 : 180;

  // ═══════════════════════════════════════════════════════════════
  // MOBILE: small fixed companion, bottom-right
  // ═══════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '25px', // Increased from 10px to give scaling room
        zIndex: 30,
        pointerEvents: 'none',
        transition: 'all 0.5s ease',
        transform: visualConfig.scale,
        transformOrigin: 'bottom right', // Scale inwards away from the screen edge!
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
          background: '#FFF5F7',
          boxShadow: '0 0 20px 10px #FFF5F7',
          pointerEvents: 'none',
        }} />

        {/* Glow zone — pink only */}
        <div style={{
          position: 'absolute',
          inset: '-18px',
          borderRadius: '50%',
          background: visualConfig.glowColor,
          border: '1px solid rgba(244, 114, 182, 0.2)',
          animation: 'yusaGlow 5s infinite ease-in-out',
          pointerEvents: 'none',
        }} />

        <div style={{ animation: visualConfig.animation, width: svgSize, height: svgSize, position: 'relative' }}>
          <Yusa3D mood={mood} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // DESKTOP / TABLET: in-flow element inside main chat section
  // ═══════════════════════════════════════════════════════════════
  const glowSize = svgSize * 1.7;
  const ringSize = svgSize * 2.1;

  const overlayStyle = {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    zIndex: 25,
    pointerEvents: 'none', // Important: don't block chat clicks
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTablet ? '8px' : '10px',
    paddingTop: '55px',
    paddingBottom: '5px',
    transition: 'transform 0.5s ease',
    transform: `${visualConfig.scale}`,
  };

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

      {/* ── Glassy glow zone (pink / coral radial — NO purple) ─── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${glowSize}px`,
        height: `${glowSize}px`,
        borderRadius: '50%',
        background: visualConfig.glowColor,
        animation: 'yusaGlow 6s infinite ease-in-out',
        pointerEvents: 'none',
      }} />

      {/* Outer soft ring — pink tint */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${ringSize}px`,
        height: `${ringSize}px`,
        borderRadius: '50%',
        border: '1.5px solid rgba(244, 114, 182, 0.10)',
        animation: 'yusaRingPulse 8s infinite ease-in-out',
        pointerEvents: 'none',
      }} />

      {/* ── Yusa 3D Character ─────────────────────────────────── */}
      <div style={{
        width: svgSize,
        height: svgSize,
        animation: visualConfig.animation,
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
      }}>
        <Yusa3D mood={mood} />
      </div>
    </div>
  );
}
