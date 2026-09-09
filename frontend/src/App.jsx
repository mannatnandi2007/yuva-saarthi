// YUVAA Saarthi Main Application Container
// Clean ChatGPT-style layout with seamless auth transitions

import React, { useState } from 'react';
import Signup from './pages/Signup.jsx';
import Consent from './pages/Consent.jsx';
import OtpVerification from './pages/OtpVerification.jsx';
import Chat from './pages/Chat.jsx';
import { Heart, PhoneCall } from 'lucide-react';

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
    setCurrentPage('chat'); // Direct entry into ChatGPT workspace
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

  const handleLogout = () => {
    setUserSession(null);
    setCurrentPage('signup');
  };

  // If in chat workspace, render full-screen ChatGPT view
  if (currentPage === 'chat') {
    return (
      <Chat 
        userSession={userSession} 
        onLogout={handleLogout}
      />
    );
  }

  // Onboarding / Auth flow
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Clean minimal navbar for onboarding */}
      <nav style={{ 
        background: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Heart size={18} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: '800', letterSpacing: '-0.02em' }}>
            YUVAA <span className="gradient-text">Saarthi</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <PhoneCall size={14} style={{ color: 'var(--accent-teal)' }} />
          <span>24/7 National Helpline: <strong style={{ color: 'var(--text-primary)' }}>14416</strong></span>
        </div>
      </nav>

      {/* Main Auth View */}
      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        {currentPage === 'signup' && (
          <Signup 
            onComplete={handleSignupComplete} 
            onNavigate={(page) => setCurrentPage(page)} 
          />
        )}
        
        {currentPage === 'consent' && (
          <Consent 
            userSession={userSession}
            onAccept={handleConsentAccept} 
            onNavigate={(page) => setCurrentPage(page)} 
          />
        )}

        {currentPage === 'otp' && (
          <OtpVerification 
            userSession={userSession}
            onVerify={handleOtpVerify}
            onNavigate={(page) => setCurrentPage(page)} 
          />
        )}
      </main>

    </div>
  );
}
