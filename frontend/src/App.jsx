/**
 * Yuva Saarthi — Main Application Container
 * Phase 6: Flat pastel design system, zero gradients, solid strokes.
 * Pure SVG Yusa, Theme toggle, resilient navigation and state management.
 */

import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import Signup from './pages/Signup.jsx';
import Consent from './pages/Consent.jsx';
import OtpVerification from './pages/OtpVerification.jsx';
import Chat from './pages/Chat.jsx';
import PoliciesPage from './pages/PoliciesPage.jsx';
import useTheme from './hooks/useTheme.js';
import { Shield, Users, LogOut, MessageCircle, Home } from 'lucide-react';
import apiClient, { pingBackendWarmup } from './api/client.js';

export default function App() {
  // Enforce system default theme (dark if system/browser is dark, light if light)
  useTheme();

  const [userSession, setUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('user_session') || localStorage.getItem('yuvaa_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = localStorage.getItem('user_session') || localStorage.getItem('yuvaa_user_session');
      return saved ? 'chat' : 'landing';
    } catch (e) {
      return 'landing';
    }
  });

  const [previousPage, setPreviousPage] = useState('landing');
  const [hasReadPolicies, setHasReadPolicies] = useState(false);
  const [warmupStatus, setWarmupStatus] = useState('checking');

  // Ping backend on app boot to wake up cold-start server
  useEffect(() => {
    pingBackendWarmup((status) => {
      setWarmupStatus(status);
    });
  }, []);

  // Sync user session to localStorage
  useEffect(() => {
    if (userSession) {
      const serialized = JSON.stringify(userSession);
      localStorage.setItem('user_session', serialized);
      localStorage.setItem('yuvaa_user_session', serialized);
    } else {
      localStorage.removeItem('user_session');
      localStorage.removeItem('yuvaa_user_session');
    }
  }, [userSession]);

  const handleSignupComplete = (data) => {
    setUserSession(data);
    setCurrentPage('chat');
  };

  const handleConsentAccept = (consentTimestamps) => {
    setUserSession((prev) => ({
      ...prev,
      ...consentTimestamps,
    }));
    setCurrentPage('chat');
  };

  const handleOtpVerify = (sessionId) => {
    setUserSession((prev) => ({
      ...prev,
      session_id: sessionId,
      access_token: sessionId,
      is_verified: true,
    }));
    setCurrentPage('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    localStorage.removeItem('yuvaa_user_session');
    setUserSession(null);
    setCurrentPage('landing');
  };

  const handleOpenPoliciesPage = () => {
    setPreviousPage(currentPage);
    setCurrentPage('policies');
  };

  // If in chat, Chat component provides its own full viewport layout
  if (currentPage === 'chat') {
    return <Chat />;
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── TOP NAVBAR ── */}
      <nav
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: 'var(--border-width) solid var(--stroke)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div
          onClick={() => setCurrentPage(userSession ? 'chat' : 'landing')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          title="Yuva Saarthi Home"
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--lilac)',
              border: '2px solid var(--stroke)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px',
              color: '#16131F',
              fontFamily: 'var(--font-heading)',
            }}
          >
            YS
          </div>
          <div>
            <div
              style={{
                fontSize: '18px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                lineHeight: 1.1,
                color: 'var(--text)',
              }}
            >
              Yuva Saarthi
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Youth Well-Being Companion
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!userSession && (
            <>
              <button
                type="button"
                onClick={() => setCurrentPage('landing')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid var(--stroke)',
                  backgroundColor: currentPage === 'landing' ? 'var(--lilac)' : 'var(--surface)',
                  color: currentPage === 'landing' ? '#16131F' : 'var(--text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Home size={14} strokeWidth={2.5} />
                <span className="hide-on-mobile">About</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPoliciesPage}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid var(--stroke)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shield size={14} strokeWidth={2.5} />
                <span className="hide-on-mobile">Safety Charter</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('signup')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'var(--border-width-control) solid var(--stroke)',
                  backgroundColor: 'var(--stroke)',
                  color: 'var(--bg)',
                  boxShadow: 'var(--shadow-hard-sm)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MessageCircle size={15} strokeWidth={2.5} />
                <span>Chat with Yusa</span>
              </button>
            </>
          )}

          {userSession && (
            <>
              <button
                type="button"
                onClick={() => setCurrentPage('chat')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'var(--border-width-control) solid var(--stroke)',
                  backgroundColor: 'var(--stroke)',
                  color: 'var(--bg)',
                  boxShadow: 'var(--shadow-hard-sm)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MessageCircle size={15} strokeWidth={2.5} />
                <span>Back to Chat</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid var(--stroke)',
                  backgroundColor: 'var(--coral)',
                  color: '#16131F',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LogOut size={14} strokeWidth={2.5} />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'landing' && (
          <LandingPage
            onGetStarted={() => setCurrentPage('signup')}
            onLogin={() => setCurrentPage('signup')}
            onOpenPolicies={handleOpenPoliciesPage}
            onComplete={handleSignupComplete}
          />
        )}

        {currentPage === 'signup' && (
          <div style={{ padding: '24px 20px', maxWidth: '1020px', margin: '0 auto', width: '100%' }}>
            <Signup
              onComplete={handleSignupComplete}
              onNavigate={(page) => setCurrentPage(page)}
              onBackToLanding={() => setCurrentPage('landing')}
            />
          </div>
        )}

        {currentPage === 'consent' && (
          <Consent
            userSession={userSession}
            onAccept={handleConsentAccept}
            onNavigate={(page) => setCurrentPage(page)}
            hasReadPolicies={hasReadPolicies}
          />
        )}

        {currentPage === 'otp' && (
          <OtpVerification
            userSession={userSession}
            onVerify={handleOtpVerify}
            onNavigate={(page) => setCurrentPage(page)}
          />
        )}

        {currentPage === 'policies' && (
          <PoliciesPage
            onBack={() => setCurrentPage(previousPage || 'landing')}
            onMarkAsRead={() => setHasReadPolicies(true)}
          />
        )}
      </main>
    </div>
  );
}
