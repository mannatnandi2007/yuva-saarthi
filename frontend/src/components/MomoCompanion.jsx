import React, { useMemo, useState, useEffect } from 'react';

export default function MomoCompanion({ mood }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1100;

  // Mood-adaptive speech bubble
  const speechText = useMemo(() => {
    switch (mood) {
      case 'SAD': return "I'm here for you 💙";
      case 'ANGRY': return "Take a deep breath 🌿";
      case 'HAPPY': return "Love to see you smile! 💜";
      case 'OVERJOYED': return "You're glowing! ✨";
      default: return "I'm here with you 💜";
    }
  }, [mood]);

  // Momo visual states based on mood — DO NOT CHANGE DETECTION LOGIC
  const visualState = useMemo(() => {
    switch (mood) {
      case 'HAPPY':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="110" rx="12" ry="18" fill="#1e293b" />
              <circle cx="93" cy="103" r="5" fill="white" />
              <circle cx="85" cy="118" r="2" fill="white" />
              <ellipse cx="150" cy="110" rx="12" ry="18" fill="#1e293b" />
              <circle cx="153" cy="103" r="5" fill="white" />
              <circle cx="145" cy="118" r="2" fill="white" />
            </g>
          ),
          mouth: (
            <path d="M 110 135 Q 120 150 130 135" fill="none" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" />
          ),
          blush: true,
          color: '#d8b4fe',
          scale: 'scale(1)',
          animation: 'momoFloat 3s infinite ease-in-out'
        };
      case 'OVERJOYED':
        return {
          eyes: (
            <g>
              <path d="M 75 110 Q 90 95 105 110" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
              <path d="M 135 110 Q 150 95 165 110" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 105 130 Q 120 160 135 130 Z" fill="#f472b6" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" />
          ),
          blush: true,
          color: '#c084fc',
          scale: 'scale(1.05)',
          animation: 'momoFloat 2s infinite ease-in-out'
        };
      case 'SAD':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="115" rx="12" ry="12" fill="#1e293b" />
              <circle cx="93" cy="112" r="4" fill="white" />
              <path d="M 75 100 Q 90 90 105 105" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="150" cy="115" rx="12" ry="12" fill="#1e293b" />
              <circle cx="153" cy="112" r="4" fill="white" />
              <path d="M 135 105 Q 150 90 165 100" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 112 145 Q 120 135 128 145" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          ),
          blush: false,
          color: '#e2e8f0',
          scale: 'scale(0.95)',
          animation: 'none'
        };
      case 'ANGRY':
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="110" rx="10" ry="10" fill="#1e293b" />
              <path d="M 75 95 Q 90 100 105 90" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="150" cy="110" rx="10" ry="10" fill="#1e293b" />
              <path d="M 135 90 Q 150 100 165 95" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
            </g>
          ),
          mouth: (
            <path d="M 112 135 L 128 135" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          ),
          blush: false,
          color: '#cbd5e1',
          scale: 'scale(0.98)',
          animation: 'none'
        };
      case 'NORMAL':
      default:
        return {
          eyes: (
            <g>
              <ellipse cx="90" cy="110" rx="10" ry="14" fill="#1e293b" />
              <circle cx="93" cy="105" r="4" fill="white" />
              <ellipse cx="150" cy="110" rx="10" ry="14" fill="#1e293b" />
              <circle cx="153" cy="105" r="4" fill="white" />
            </g>
          ),
          mouth: (
            <path d="M 115 135 Q 120 142 125 135" fill="none" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
          ),
          blush: true,
          color: '#e9d5ff',
          scale: 'scale(1)',
          animation: 'momoFloat 4s infinite ease-in-out'
        };
    }
  }, [mood]);

  // Mobile: small fixed companion
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '90px',
        right: '12px',
        width: '70px',
        height: '70px',
        zIndex: 30,
        pointerEvents: 'none',
        transition: 'all 0.5s ease',
        transform: visualState.scale,
      }}>
        <style>{`
          @keyframes momoFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
        <div style={{ animation: visualState.animation, width: '100%', height: '100%' }}>
          <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ overflow: 'visible' }}>
            <path d="M 120 30 C 180 30 220 80 220 140 C 220 200 180 230 120 230 C 60 230 20 200 20 140 C 20 80 60 30 120 30 Z" fill={visualState.color} style={{ transition: 'fill 0.5s ease' }} />
            <path d="M 105 35 Q 120 10 135 35 Q 120 25 105 35 Z" fill={visualState.color} style={{ transition: 'fill 0.5s ease' }} />
            {visualState.eyes}
            {visualState.blush && (<g style={{ opacity: 0.5 }}><ellipse cx="65" cy="125" rx="12" ry="6" fill="#f472b6" /><ellipse cx="175" cy="125" rx="12" ry="6" fill="#f472b6" /></g>)}
            {visualState.mouth}
          </svg>
        </div>
      </div>
    );
  }

  const panelWidth = isTablet ? '220px' : '300px';
  const momoSvgSize = isTablet ? '190px' : '300px';

  return (
    <aside style={{
      width: panelWidth,
      flexShrink: 0,
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(175deg, #E8E2FF 0%, #EDE8FF 30%, #F5F0FF 55%, #FDF2F8 80%, #F8F0FF 100%)',
    }}>
      <style>{`
        @keyframes momoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes leafSway {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(-5px); }
        }
        @keyframes blobPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
        @keyframes floatCloud {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-15px); }
        }
        @keyframes floatCloudSlow {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
      `}</style>

      {/* Decorative pastel blobs */}
      <div style={{ position: 'absolute', top: '-30px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(216, 180, 254, 0.4) 0%, transparent 70%)', pointerEvents: 'none', animation: 'blobPulse 8s infinite ease-in-out' }} />
      <div style={{ position: 'absolute', bottom: '80px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129, 140, 248, 0.3) 0%, transparent 70%)', pointerEvents: 'none', animation: 'blobPulse 10s infinite ease-in-out 2s' }} />
      <div style={{ position: 'absolute', top: '40%', right: '10px', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244, 114, 182, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Clouds at the bottom */}
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '-10%',
        width: '120%',
        height: '140px',
        animation: 'floatCloudSlow 8s infinite ease-in-out',
        background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1440 320\'%3E%3Cpath fill=\'%23ffffff\' fill-opacity=\'0.4\' d=\'M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,213.3C672,224,768,192,864,176C960,160,1056,160,1152,176C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z\'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom',
        backgroundSize: 'cover',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-20%',
        width: '140%',
        height: '160px',
        animation: 'floatCloud 6s infinite ease-in-out',
        background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1440 320\'%3E%3Cpath fill=\'%23ffffff\' fill-opacity=\'1\' d=\'M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,186.7C840,171,960,117,1080,101.3C1200,85,1320,107,1380,117.3L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z\'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom',
        backgroundSize: 'cover',
        pointerEvents: 'none',
      }} />

      {/* Decorative leaf/plant shapes like reference */}
      <svg width="70" height="100" viewBox="0 0 70 100" style={{ position: 'absolute', top: '15px', right: '5px', opacity: 0.5, animation: 'leafSway 6s infinite ease-in-out', transformOrigin: 'bottom center' }}>
        <ellipse cx="35" cy="32" rx="16" ry="30" fill="#86efac" transform="rotate(-15, 35, 32)" />
        <ellipse cx="50" cy="38" rx="12" ry="26" fill="#6ee7b7" transform="rotate(10, 50, 38)" />
        <line x1="35" y1="62" x2="35" y2="32" stroke="#4ade80" strokeWidth="2.5" />
      </svg>
      <svg width="50" height="80" viewBox="0 0 50 80" style={{ position: 'absolute', top: '5px', left: '10px', opacity: 0.35, animation: 'leafSway 7s infinite ease-in-out 1s', transformOrigin: 'bottom center' }}>
        <ellipse cx="25" cy="28" rx="14" ry="26" fill="#c4b5fd" transform="rotate(-10, 25, 28)" />
        <line x1="25" y1="54" x2="25" y2="28" stroke="#8b5cf6" strokeWidth="2" />
      </svg>

      {/* STICKY inner container — this is what keeps Momo fixed */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 10px',
        zIndex: 2,
      }}>
        {/* Content wrapper with scale transition */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          transition: 'transform 0.5s ease',
          transform: visualState.scale,
        }}>
          {/* Speech Bubble */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            padding: '9px 16px',
            borderRadius: '18px',
            fontSize: '0.78rem',
            fontWeight: '600',
            color: '#6b6f8d',
            boxShadow: '0 4px 18px rgba(124, 58, 237, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'opacity 0.3s ease',
            whiteSpace: 'nowrap',
          }}>
            {speechText}
          </div>

          {/* Momo SVG — LARGE */}
          <div style={{
            width: momoSvgSize,
            height: momoSvgSize,
            animation: visualState.animation,
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <path d="M 120 30 C 180 30 220 80 220 140 C 220 200 180 230 120 230 C 60 230 20 200 20 140 C 20 80 60 30 120 30 Z" fill={visualState.color} style={{ transition: 'fill 0.5s ease' }} />
              <path d="M 105 35 Q 120 10 135 35 Q 120 25 105 35 Z" fill={visualState.color} style={{ transition: 'fill 0.5s ease' }} />
              {visualState.eyes}
              {visualState.blush && (
                <g style={{ opacity: 0.5 }}>
                  <ellipse cx="65" cy="125" rx="12" ry="6" fill="#f472b6" />
                  <ellipse cx="175" cy="125" rx="12" ry="6" fill="#f472b6" />
                </g>
              )}
              {visualState.mouth}
            </svg>
          </div>

          {/* Current Mood Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '14px 26px',
            borderRadius: '18px',
            boxShadow: '0 4px 22px rgba(124, 58, 237, 0.07)',
            border: '1px solid rgba(167, 139, 250, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            minWidth: '130px',
          }}>
            <span style={{
              fontSize: '0.6rem',
              color: '#8b8fa8',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontWeight: '600',
            }}>Current Mood</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {mood === 'HAPPY' ? '😊' :
                 mood === 'OVERJOYED' ? '🤩' :
                 mood === 'SAD' ? '😔' :
                 mood === 'ANGRY' ? '😠' : '😌'}
              </span>
              <span style={{
                fontWeight: '700',
                color: '#7c3aed',
                fontSize: '1.05rem',
                textTransform: 'capitalize',
                fontFamily: "'Outfit', sans-serif",
              }}>
                {mood.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
