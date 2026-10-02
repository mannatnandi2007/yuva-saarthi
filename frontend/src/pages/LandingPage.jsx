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
  ChevronRight,
  Shield
} from 'lucide-react';
import YusaSideMascot from '../components/YusaSideMascot.jsx';
import Signup from './Signup.jsx';

/**
 * LandingPage — Youth-Friendly, Compassionate, Non-Technical Introduction (Tasks 4, 5, 8, 9, 10, 11)
 * Features:
 * - Solid colors ONLY across all sections (Zero gradients)
 * - 3D Yusa Modak character positioned at the center covering the screen on landing
 * - Smooth animated transition sliding Yusa to the side when directed to Login / Signup
 * - Real 3D interactive mesh (Three.js WebGL canvas with mouse cursor tracking)
 */
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
    <div className="page-transition" style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', padding: '20px 20px 80px' }}>
      
      {/* ── PERSISTENT HERO SECTION WITH ANIMATED CENTER-TO-SIDE 3D YUSA ── */}
      <section 
        style={{
          display: 'grid',
          gridTemplateColumns: authView ? 'minmax(300px, 1fr) minmax(360px, 1.25fr)' : '1fr',
          gap: authView ? '32px' : '20px',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          padding: authView ? '20px 0 50px' : '30px 16px 60px',
          width: '100%',
        }}
      >
        {/* Left Column (or Center when authView is null): Persistent 3D Yusa */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: authView ? '14px' : '20px',
            width: '100%',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Top Trust Chip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fce7f3',
            border: '1px solid #fbcfe8',
            borderRadius: '9999px',
            padding: '6px 18px',
            color: '#be185d',
            fontSize: '0.84rem',
            fontWeight: '700',
            letterSpacing: '0.02em'
          }}>
            <Sparkles size={15} color="#db2777" />
            <span>A Safe, Confidential Companion for Indian Youth</span>
          </div>

          {!authView ? (
            <>
              {/* Hero Main Headline */}
              <h1 style={{
                fontSize: 'clamp(2.3rem, 6vw, 3.6rem)',
                fontWeight: '900',
                lineHeight: 1.15,
                color: '#2e1065',
                margin: 0,
                maxWidth: '850px',
                letterSpacing: '-0.025em'
              }}>
                Your safe space to <span style={{ color: '#db2777' }}>breathe</span>, vent, and be heard.
              </h1>

              {/* Subtitle */}
              <p style={{
                fontSize: '1.1rem',
                lineHeight: 1.65,
                color: '#581c87',
                margin: '0 auto',
                maxWidth: '640px'
              }}>
                Board exam pressure, parent expectations, late-night overthinking, or just feeling lonely? 
                <strong style={{ color: '#2e1065' }}> YUVAA Saarthi</strong> is here for you 24/7. No judgment, no unsolicited lectures — just genuine care and a friendly 3D companion who actually understands you.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', maxWidth: '340px' }}>
              <button
                type="button"
                onClick={handleBackToCenter}
                style={{
                  background: '#fdf2f8',
                  border: '1px solid #fbcfe8',
                  color: '#db2777',
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ← Back to Overview
              </button>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#2e1065', margin: '0 0 6px' }}>
                {authView === 'login' ? "Welcome Back to YUVAA!" : "Say Hi to Yusa ✨"}
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#581c87', margin: 0, lineHeight: '1.5' }}>
                {authView === 'login' 
                  ? "Enter your unique username to resume your confidential conversations." 
                  : "Yusa is jumping with excitement to meet you! Everything stays 100% private."}
              </p>
            </div>
          )}

          {/* ── CENTER / SIDE 3D YUSA (PERSISTENT Three.js WebGL MESH) ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '8px 0 16px',
            position: 'relative',
            width: '100%',
            maxWidth: authView ? '280px' : '440px',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <YusaSideMascot stageMode={authView ? 'side' : 'center'} size={authView ? 220 : 330} />
            <div style={{ fontSize: '0.78rem', color: '#8b729e', marginTop: '-4px', fontWeight: '600' }}>
              Hover & move your cursor to tilt Yusa in 3D space
            </div>
          </div>

          {/* Action CTAs when on Landing */}
          {!authView && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', alignItems: 'center' }}>
                <button
                  onClick={handleStartSignup}
                  className="hallmark-btn-primary"
                  style={{ 
                    padding: '16px 36px', 
                    fontSize: '1.02rem', 
                    background: '#db2777', 
                    border: '1px solid #be185d', 
                    gap: '10px',
                    boxShadow: '0 6px 20px rgba(219, 39, 119, 0.35)'
                  }}
                >
                  <span>Start Chatting Free</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={handleStartLogin}
                  className="hallmark-btn-secondary"
                  style={{ 
                    padding: '16px 28px', 
                    fontSize: '0.98rem', 
                    background: '#ffffff', 
                    border: '1.5px solid #e9d5ff', 
                    color: '#581c87',
                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.08)'
                  }}
                >
                  <span>Already have an account? Sign In</span>
                </button>
              </div>

              {/* Quick Value Micro-labels */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', justifyContent: 'center', paddingTop: '10px', color: '#581c87', fontSize: '0.86rem', fontWeight: '700' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={16} color="#db2777" />
                  <span>100% Private & Confidential</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={16} color="#9333ea" />
                  <span>English & Hinglish Friendly</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="#db2777" />
                  <span>Always Here, 24/7</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Embedded Auth Card */}
        {authView && (
          <div className="auth-form-slidein" style={{ width: '100%' }}>
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

      {/* ── RELATABLE FEATURES (What Makes YUVAA Saarthi Different) ── */}
      <section style={{ padding: '36px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '34px' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#2e1065' }}>
            Why talking to <span style={{ color: '#db2777' }}>Yusa</span> feels like chatting with a real friend
          </h2>
          <p style={{ color: '#581c87', fontSize: '0.95rem', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Traditional mental health apps often feel robotic or clinical. YUVAA Saarthi is designed from the ground up for how Indian students actually talk and feel.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px'
        }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#fce7f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#db2777'
            }}>
              <Smile size={24} />
            </div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#2e1065' }}>
              Zero Judgment & Zero Lectures
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#581c87', lineHeight: '1.6' }}>
              No relatives giving you gyaan, no guilt-tripping, and no unsolicited advice. Yusa simply listens, validates what you feel, and helps untangle your thoughts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9333ea'
            }}>
              <MessageCircle size={24} />
            </div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#2e1065' }}>
              Speaks Your Everyday Hinglish
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#581c87', lineHeight: '1.6' }}>
              Say <em>"yaar bohot anxiety ho rahi hai"</em> or <em>"marks ka stress nahi handle ho raha"</em>. Yusa mirrors your linguistic style naturally without sounding like a textbook.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#fce7f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#db2777'
            }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#2e1065' }}>
              Real Emergency Safety Net
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#581c87', lineHeight: '1.6' }}>
              You designate a guardian or trusted adult when you sign up. If you ever face acute panic or danger, Yusa can discreetly alert them or connect you with national 24/7 helplines.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9333ea'
            }}>
              <Heart size={24} />
            </div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#2e1065' }}>
              Yusa Reacts to Your Mood
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#581c87', lineHeight: '1.6' }}>
              When you're happy, Yusa jumps and wiggles with you! When you feel down, Yusa gently calms the environment so you can breathe easier.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3 EASY STEPS ── */}
      <section style={{
        background: '#ffffff',
        border: '1.5px solid #f3e8ff',
        borderRadius: '28px',
        padding: '36px 30px',
        margin: '30px 0',
        boxShadow: '0 8px 30px rgba(168, 85, 247, 0.06)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#2e1065' }}>
            Getting Started is Easy & Fast
          </h2>
          <p style={{ color: '#581c87', fontSize: '0.92rem', marginTop: '6px' }}>
            No complicated forms. Just a quick setup so you can start feeling supported right away.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#db2777',
              color: '#ffffff',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>1</div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#2e1065' }}>Pick a Nickname</div>
            <div style={{ fontSize: '0.88rem', color: '#581c87', lineHeight: '1.5' }}>
              Choose whatever username feels comfortable. Add a trusted contact who has your back.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#9333ea',
              color: '#ffffff',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>2</div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#2e1065' }}>Know Your Rights</div>
            <div style={{ fontSize: '0.88rem', color: '#581c87', lineHeight: '1.5' }}>
              Read our plain-language Safe Haven policy. Your words are confidential and protected.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#db2777',
              color: '#ffffff',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>3</div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#2e1065' }}>Talk to Yusa Freely</div>
            <div style={{ fontSize: '0.88rem', color: '#581c87', lineHeight: '1.5' }}>
              Vent anytime day or night. Talk about exams, friends, stress, or just your day.
            </div>
          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS ── */}
      <section style={{ padding: '36px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#2e1065' }}>
            Questions on Your Mind?
          </h2>
          <p style={{ color: '#581c87', fontSize: '0.92rem', marginTop: '6px' }}>
            Straightforward answers to the things young people ask us most.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '780px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{ fontWeight: '700', color: '#2e1065', fontSize: '0.98rem' }}>
              🔒 Will my parents or school teachers see my chats?
            </div>
            <div style={{ fontSize: '0.88rem', color: '#581c87', marginTop: '6px', lineHeight: '1.5' }}>
              No. Your conversations are strictly confidential between you and Yusa. Personal contacts are only alerted if acute danger or extreme self-harm is detected, so that you are never left alone in a crisis.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{ fontWeight: '700', color: '#2e1065', fontSize: '0.98rem' }}>
              💜 Is YUVAA Saarthi free to use?
            </div>
            <div style={{ fontSize: '0.88rem', color: '#581c87', marginTop: '6px', lineHeight: '1.5' }}>
              Yes, 100% free. Mental well-being support should be accessible to every young person in India.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff', border: '1.5px solid #f3e8ff' }}>
            <div style={{ fontWeight: '700', color: '#2e1065', fontSize: '0.98rem' }}>
              🛡️ What happens if someone is facing domestic violence or abuse at home?
            </div>
            <div style={{ fontSize: '0.88rem', color: '#581c87', marginTop: '6px', lineHeight: '1.5' }}>
              Under our Safe Haven policy, personal contacts are strictly NOT called if abuse is detected. Instead, verified professional helplines like Childline 1098 and KIRAN 1800-599-0019 are provided directly to keep you safe.
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION (Solid Purple Background) ── */}
      <section style={{
        marginTop: '36px',
        background: '#9333ea',
        borderRadius: '30px',
        padding: '44px 32px',
        textAlign: 'center',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
        boxShadow: '0 16px 40px rgba(147, 51, 234, 0.28)'
      }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
          You don't have to navigate everything alone.
        </h2>
        <p style={{ maxWidth: '580px', fontSize: '0.98rem', opacity: 0.95, lineHeight: '1.6', margin: 0 }}>
          Take the first step today. It takes less than 60 seconds to create your confidential profile and say hi to Yusa.
        </p>
        <button
          onClick={handleStartSignup}
          className="hallmark-btn-primary"
          style={{
            background: '#ffffff',
            color: '#9333ea',
            border: 'none',
            padding: '16px 36px',
            fontSize: '1.02rem',
            fontWeight: '800',
            marginTop: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
          }}
        >
          <span>Get Started with Yusa</span>
          <ArrowRight size={18} color="#9333ea" />
        </button>
      </section>

    </div>
  );
}
