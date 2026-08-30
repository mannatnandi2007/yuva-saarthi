// YUVAA Saarthi Frontend Coordinator
// Reference: PRD §3 (Features walkthrough) & Execution Plan

import React, { useState } from 'react';
import Signup from './pages/Signup.jsx';
import Consent from './pages/Consent.jsx';
import OtpVerification from './pages/OtpVerification.jsx';
import Chat from './pages/Chat.jsx';
import { Heart } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('signup');
  const [userSession, setUserSession] = useState(null);

  const handleSignupComplete = (data) => {
    setUserSession(data);
  };

  const handleConsentAccept = (consentTimestamps) => {
    setUserSession(prev => ({
      ...prev,
      ...consentTimestamps
    }));
    // After consent and API call succeeds, go to OTP
    setCurrentPage('otp');
  };

  const handleOtpVerify = (sessionId) => {
    setUserSession(prev => ({
      ...prev,
      session_id: sessionId,
      access_token: sessionId,
      is_verified: true
    }));
    setCurrentPage('chat');
  };

  const handleNavigation = (page) => {
    setCurrentPage(page);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation Header */}
      <nav style={{ 
        background: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => handleNavigation('signup')}>
          <Heart size={22} color="var(--accent-purple)" fill="var(--accent-purple)" />
          <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: '800' }}>
            YUVAA <span className="gradient-text">Saarthi</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
          <button 
            onClick={() => handleNavigation('signup')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: currentPage === 'signup' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            1. Onboarding
          </button>
          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <button 
            onClick={() => handleNavigation('consent')}
            disabled={!userSession}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage === 'consent' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: currentPage === 'consent' ? 'bold' : 'normal',
              cursor: userSession ? 'pointer' : 'not-allowed'
            }}
          >
            2. Privacy & Consent
          </button>
          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <button 
            onClick={() => handleNavigation('otp')}
            disabled={!userSession?.policy_ack_at}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage === 'otp' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: currentPage === 'otp' ? 'bold' : 'normal',
              cursor: userSession?.policy_ack_at ? 'pointer' : 'not-allowed'
            }}
          >
            3. Verification
          </button>
          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <button 
            onClick={() => handleNavigation('chat')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage === 'chat' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: currentPage === 'chat' ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            4. Chat Workspace
          </button>
        </div>
      </nav>

      {/* Render Current Page Stub */}
      <main style={{ flexGrow: 1 }}>
        {currentPage === 'signup' && (
          <Signup 
            onComplete={handleSignupComplete} 
            onNavigate={handleNavigation} 
          />
        )}
        
        {currentPage === 'consent' && (
          <Consent 
            userSession={userSession}
            onAccept={handleConsentAccept} 
            onNavigate={handleNavigation} 
          />
        )}

        {currentPage === 'otp' && (
          <OtpVerification 
            userSession={userSession}
            onVerify={handleOtpVerify}
            onNavigate={handleNavigation}
          />
        )}
        
        {currentPage === 'chat' && (
          <Chat 
            userSession={userSession} 
            onNavigate={handleNavigation} 
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '16px', 
        color: 'var(--text-muted)', 
        fontSize: '0.75rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.02)',
        background: 'rgba(0,0,0,0.1)'
      }}>
        YUVAA Saarthi &copy; 2026. Safety net well-being system. Stubs for Day 1 - Day 8 builds.
      </footer>

    </div>
  );
}
