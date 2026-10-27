/**
 * Yuva Saarthi — Landing Page
 * Phase 6: Flat pastel design system, pure SVG YusaCompanion, zero gradients, solid strokes.
 * Responsive layout with Fraunces serif headings and Outfit sans body.
 */

import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Lock,
  Smile,
  Clock,
  Shield
} from 'lucide-react';
import YusaCompanion from '../components/YusaCompanion.jsx';
import Signup from './Signup.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function LandingPage({ onGetStarted, onLogin, onOpenPolicies, onComplete }) {
  const [authView, setAuthView] = useState(null); // null (Center Landing), 'signup', or 'login'

  const handleStartSignup = () => {
    setAuthView('signup');
  };

  const handleStartLogin = () => {
    setAuthView('login');
  };

  const handleBackToCenter = () => {
    setAuthView(null);
  };

  return (
    <div
      className="landing-page-root"
      style={{
        width: '100%',
        maxWidth: '1160px',
        margin: '0 auto',
        padding: '24px 20px 80px',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── HERO SECTION WITH YUSA MASCOT ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: authView ? 'minmax(280px, 1fr) minmax(340px, 1.25fr)' : '1fr',
          gap: authView ? '32px' : '24px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: authView ? '20px 0 40px' : '36px 16px 50px',
          width: '100%',
          transition: 'all var(--transition-normal)',
        }}
      >
        {/* Left Column (or Center when authView is null): Yusa Companion */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: authView ? '16px' : '22px',
            width: '100%',
          }}
        >
          {/* Top Trust Chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--lilac)',
              color: '#16131F',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: 'var(--shadow-hard-sm)',
            }}
          >
            <Shield size={14} strokeWidth={2.5} />
            <span>Confidential & Safe AI Space for Indian Youth</span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: authView ? '28px' : '44px',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              lineHeight: 1.15,
              maxWidth: '740px',
              color: 'var(--text)',
            }}
          >
            Talk freely without fear of judgment.
          </h1>

          <p
            style={{
              fontSize: authView ? '15px' : '18px',
              color: 'var(--text-muted)',
              lineHeight: 1.55,
              maxWidth: '580px',
            }}
          >
            Meet <strong>Yusa</strong>, your warm mental well-being companion. Share what’s on your mind in English, Hindi, or Hinglish anytime, 24/7.
          </p>

          {/* Yusa Vector Mascot */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '8px 0 16px',
              position: 'relative',
              width: '100%',
              maxWidth: authView ? '240px' : '320px',
            }}
          >
            <YusaCompanion
              mood="normal"
              size={authView ? 180 : 230}
              showBubble={true}
              customMessage="Hello! I'm Yusa 🌸"
            />
          </div>

          {/* Action CTAs when on Landing */}
          {!authView && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '14px',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={handleStartSignup}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 700,
                    backgroundColor: 'var(--stroke)',
                    color: 'var(--bg)',
                    border: 'var(--border-width-control) solid var(--stroke)',
                    borderRadius: 'var(--radius-pill)',
                    boxShadow: 'var(--shadow-hard)',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)',
                  }}
                >
                  <span>Start Chatting Free</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={handleStartLogin}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 28px',
                    fontSize: '15px',
                    fontWeight: 600,
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    border: 'var(--border-width-control) solid var(--stroke)',
                    borderRadius: 'var(--radius-pill)',
                    boxShadow: 'var(--shadow-hard-sm)',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)',
                  }}
                >
                  <span>Already have an account? Sign In</span>
                </button>
              </div>

              {/* Value Micro-labels */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  justifyContent: 'center',
                  paddingTop: '10px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} strokeWidth={2.5} color="var(--pink)" />
                  <span>100% Private & Confidential</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={15} strokeWidth={2.5} color="var(--lilac)" />
                  <span>English & Hinglish Friendly</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} strokeWidth={2.5} color="var(--mint)" />
                  <span>Always Here, 24/7</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Embedded Auth Card */}
        {authView && (
          <div style={{ width: '100%' }}>
            <Signup
              initialMode={authView}
              hideSideMascot={true}
              onBackToLanding={handleBackToCenter}
              onComplete={(data) => {
                if (onComplete) onComplete(data);
                else if (onGetStarted) onGetStarted();
              }}
              onNavigate={(page) => {
                if (page === 'policies') {
                  if (onOpenPolicies) onOpenPolicies();
                } else if (page === 'landing') {
                  handleBackToCenter();
                }
              }}
            />
          </div>
        )}
      </section>

      {/* ── RELATABLE FEATURES (What Makes Yuva Saarthi Different) ── */}
      <section style={{ padding: '40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
            Why talking to Yusa feels like talking to a real friend
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Traditional mental health apps often feel robotic or clinical. Yuva Saarthi is designed for how Indian youth actually feel and communicate.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--surface)',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--yellow)',
                border: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16131F',
              }}
            >
              <Smile size={22} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Zero Judgment & Zero Lectures
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              No relatives giving you gyaan, no guilt-tripping, and no unsolicited advice. Yusa listens, validates your feelings, and helps untangle your thoughts.
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--surface)',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--lilac)',
                border: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16131F',
              }}
            >
              <MessageCircle size={22} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Speaks Everyday Hinglish
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              Say "yaar bohot anxiety ho rahi hai" or "exams ka stress handle nahi ho raha". Yusa naturally understands your linguistic context.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--surface)',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--coral)',
                border: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16131F',
              }}
            >
              <ShieldCheck size={22} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Real Emergency Safety Net
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              Designate trusted contacts. If you ever face acute panic or danger, Yusa can discreetly alert them via calls and SMS or connect you to verified 24/7 helplines.
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--surface)',
              border: 'var(--border-width) solid var(--stroke)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--mint)',
                border: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16131F',
              }}
            >
              <Heart size={22} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Yusa Reacts to Your Mood
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              When you're happy, Yusa celebrates with you! When you feel overwhelmed or sad, Yusa grounds the space so you can catch your breath.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3 EASY STEPS ── */}
      <section
        style={{
          backgroundColor: 'var(--surface)',
          border: 'var(--border-width) solid var(--stroke)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-hard)',
          padding: '36px 28px',
          margin: '20px 0 40px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Get started in 3 simple steps
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--lilac)',
                border: '2px solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#16131F',
              }}
            >
              1
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Quick Registration</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Enter your name and add at least one emergency contact who cares about you.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--pink)',
                border: '2px solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#16131F',
              }}
            >
              2
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Review Safety Terms</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Transparent consent informing you how we protect your privacy and when emergency alerts trigger.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--mint)',
                border: '2px solid var(--stroke)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#16131F',
              }}
            >
              3
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Talk to Yusa</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Begin your conversation freely. Your chat history and mood mirror stay synced safely.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: 'var(--border-width) solid var(--stroke)',
          paddingTop: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}
      >
        <div>© 2026 Yuva Saarthi. All rights reserved. Built for youth mental well-being.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={onOpenPolicies}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Safety Charter & Policies
          </button>
          <ThemeToggle compact />
        </div>
      </footer>
    </div>
  );
}
