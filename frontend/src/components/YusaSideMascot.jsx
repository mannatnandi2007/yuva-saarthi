import React, { useState, useEffect } from 'react';
import Yusa3D from './Yusa3D.jsx';

/**
 * YusaSideMascot — Jumping and Chittering Yusa Companion for Login & Signup (Task 11)
 * Features:
 * - Dynamic jumping, wiggling, and playful chittering animations
 * - Interactive speech bubbles with youth-relatable, warm welcoming messages
 * - Interactive click reaction (bounces joyfully on tap)
 * - Pink and purple palette aesthetic
 */
export default function YusaSideMascot({ size = 180, stageMode = 'side' }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [bounceBonus, setBounceBonus] = useState(false);

  const chitterMessages = [
    "Hey there! I'm Yusa! 👋",
    "So excited to meet you! ✨",
    "Your safe space to vent and breathe 💗",
    "Your safe space to talk, breathe, and unwind 💗",
    "Hop in! Let's talk about whatever's on your mind 🌸",
    "No judgment here, ever. Just pure support 🫂"
  ];

  // Cycle chittering messages every 3.8s
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % chitterMessages.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [chitterMessages.length]);

  const handleMascotClick = () => {
    setBounceBonus(true);
    setMessageIndex((prev) => (prev + 1) % chitterMessages.length);
    setTimeout(() => setBounceBonus(false), 900);
  };

  const isCenter = stageMode === 'center';
  const effectiveSize = isCenter ? (size || 310) : (size || 190);

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCenter ? '18px' : '12px',
        userSelect: 'none',
        cursor: 'pointer',
        padding: isCenter ? '24px' : '14px',
        position: 'relative'
      }}
      onClick={handleMascotClick}
      title="Click me to play with Yusa!"
    >
      {/* Playful Floating Speech Bubble */}
      <div 
        style={{
          background: '#ffffff',
          border: '2px solid #ec4899',
          borderRadius: '18px 18px 18px 4px',
          padding: isCenter ? '12px 22px' : '10px 16px',
          boxShadow: '0 8px 24px rgba(236, 72, 153, 0.12)',
          fontSize: isCenter ? '1rem' : '0.88rem',
          fontWeight: '700',
          color: '#1a1a2e',
          fontFamily: 'var(--font-body)',
          maxWidth: isCenter ? '320px' : '240px',
          textAlign: 'center',
          lineHeight: '1.4',
          position: 'relative',
          animation: 'yusaGlow 3s infinite ease-in-out',
          transform: bounceBonus ? 'scale(1.08)' : 'scale(1)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <span>{chitterMessages[messageIndex]}</span>
        {/* Cute Speech Bubble Tail */}
        <div 
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '30px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            borderRight: '2px solid #ec4899',
            borderBottom: '2px solid #ec4899',
            transform: 'rotate(45deg)'
          }}
        />
      </div>

      {/* 3D Yusa Canvas Container — Zero CSS rotation or halo background to prevent viewport clipping */}
      <div 
        style={{
          width: effectiveSize,
          height: effectiveSize,
          position: 'relative',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: bounceBonus ? 'scale(1.08)' : 'scale(1)',
          filter: 'drop-shadow(0 14px 28px rgba(236, 72, 153, 0.22))'
        }}
      >
        {/* 100% Three.js 3D Yusa Plotted Character (all organic breathing, tilt & wiggles handled in WebGL) */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
          <Yusa3D color="#ec4899" />
        </div>
      </div>

      {/* Interactive Helper Label */}
      <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: '600', letterSpacing: '0.04em' }}>
        ✨ Click Yusa to say hi!
      </span>
    </div>
  );
}
