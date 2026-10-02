// YUVAA Saarthi Main Application Container
// Theme: Pink & Purple Youth Mental Health Companion (Tasks 5, 8, 9, 10, 11)
// Featuring Landing Page, Animated Yusa Mascot, Smooth Navigations & Real Emergency Escalation

import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import Signup from './pages/Signup.jsx';
import Consent from './pages/Consent.jsx';
import OtpVerification from './pages/OtpVerification.jsx';
import Chat from './pages/Chat.jsx';
import PoliciesPage from './pages/PoliciesPage.jsx';
import BrainLogo from './components/BrainLogo.jsx';
import PolicyModal from './components/PolicyModal.jsx';
import ContactsDrawer from './components/ContactsDrawer.jsx';
import { Shield, Users, LogOut, Sparkles, MessageCircle, Home } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  // Session persistence across page reloads
  const [userSession, setUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('yuvaa_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Default to landing page if not logged in (Task 5)
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = localStorage.getItem('yuvaa_user_session');
      return saved ? 'chat' : 'landing';
    } catch (e) {
      return 'landing';
    }
  });

  const [previousPage, setPreviousPage] = useState('landing');
  const [hasReadPolicies, setHasReadPolicies] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  // Sync session changes to localStorage
  useEffect(() => {
    if (userSession) {
      localStorage.setItem('yuvaa_user_session', JSON.stringify(userSession));
    } else {
      localStorage.removeItem('yuvaa_user_session');
    }
  }, [userSession]);

  // Fetch emergency contacts whenever userSession is active
  useEffect(() => {
    if (!userSession) return;
    const fetchContacts = async () => {
      try {
        const token = userSession.access_token || userSession.session_id;
        const headers = {};
        if (token && token.length > 20) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        headers['X-Dev-User-Id'] = userSession.user_id || '00000000-0000-0000-0000-000000000001';

        const res = await axios.get(`${API_BASE_URL}/contacts`, { headers, timeout: 3000 });
        if (Array.isArray(res.data)) {
          setEmergencyContacts(res.data);
        }
      } catch (err) {
        console.debug("Could not load contacts in App root:", err);
      }
    };
    fetchContacts();
  }, [userSession]);

  const handleSignupComplete = (data) => {
    setUserSession(data);
    setCurrentPage('chat');
  };

  const handleConsentAccept = (consentTimestamps) => {
    setUserSession(prev => ({
      ...prev,
      ...consentTimestamps
    }));
    setCurrentPage('chat');
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
    localStorage.removeItem('yuvaa_user_session');
    setUserSession(null);
    setCurrentPage('landing');
    setIsContactsOpen(false);
    setIsPolicyOpen(false);
  };

  const handleOpenPoliciesPage = () => {
    setPreviousPage(currentPage);
    setCurrentPage('policies');
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* ── CLEAN TOP NAVBAR (Pink & Purple Palette, Task 9) ── */}
      <nav style={{ 
        background: 'rgba(255, 255, 255, 0.75)', 
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(168, 85, 247, 0.15)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Left: Logo + Brand Wordmark */}
        <div 
          onClick={() => setCurrentPage(userSession ? 'chat' : 'landing')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="YUVAA Saarthi Home"
        >
          <BrainLogo size={34} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '1.25rem', 
              fontFamily: 'var(--font-display)', 
              fontWeight: '900', 
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: '#2e1065'
            }}>
              YUVAA <span style={{ color: '#db2777' }}>Saarthi</span>
            </span>
            <span style={{ fontSize: '0.66rem', color: '#9333ea', letterSpacing: '0.04em', fontWeight: '700', textTransform: 'uppercase' }}>
              Youth Well-Being Companion
            </span>
          </div>
        </div>

        {/* Right: Purposeful Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* If NOT logged in: Show landing nav links */}
          {!userSession && (
            <>
              <button
                onClick={() => setCurrentPage('landing')}
                className="hallmark-btn-secondary"
                style={{ 
                  padding: '7px 14px', 
                  fontSize: '0.84rem', 
                  gap: '6px',
                  background: currentPage === 'landing' ? '#fdf2f8' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: currentPage === 'landing' ? '#f472b6' : 'rgba(168, 85, 247, 0.18)',
                  color: currentPage === 'landing' ? '#ec4899' : '#581c87'
                }}
              >
                <Home size={14} />
                <span>About</span>
              </button>

              <button
                onClick={handleOpenPoliciesPage}
                className="hallmark-btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.84rem', gap: '6px' }}
                title="View Safety & Confidentiality Policies"
              >
                <Shield size={14} color="#a855f7" />
                <span>Safety Policies</span>
              </button>

              <button
                onClick={() => setCurrentPage('signup')}
                className="hallmark-btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.84rem', gap: '6px' }}
              >
                <MessageCircle size={15} />
                <span>Chat with Yusa</span>
              </button>
            </>
          )}

          {/* If LOGGED IN: Show Safety, Contacts & Logout */}
          {userSession && (
            <>
              <button
                onClick={handleOpenPoliciesPage}
                className="hallmark-btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
                title="View Safety & Confidentiality Policies"
              >
                <Shield size={14} color="#ec4899" />
                <span>Safety Policies</span>
              </button>

              <button
                onClick={() => setIsContactsOpen(true)}
                className="hallmark-btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
                title="View Emergency Contacts"
              >
                <Users size={14} color="#a855f7" />
                <span>Contacts ({emergencyContacts.length})</span>
              </button>

              <button
                onClick={handleLogout}
                style={{
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fdf2f8',
                  border: '1px solid #fbcfe8',
                  borderRadius: 'var(--radius-pill)',
                  color: '#be185d',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Sign Out"
                onMouseEnter={e => { e.currentTarget.style.background = '#fce7f3'; e.currentTarget.style.borderColor = '#f472b6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fdf2f8'; e.currentTarget.style.borderColor = '#fbcfe8'; }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT WORKSPACE WITH SMOOTH PAGE TRANSITIONS (Task 10) ── */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
        
        {currentPage === 'landing' && (
          <div key="landing" className="page-transition">
            <LandingPage 
              onGetStarted={() => setCurrentPage('signup')}
              onLogin={() => setCurrentPage('signup')}
              onOpenPolicies={handleOpenPoliciesPage}
              onComplete={handleSignupComplete}
            />
          </div>
        )}

        {currentPage === 'policies' && (
          <div key="policies" className="page-transition" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <PoliciesPage 
              onBack={() => setCurrentPage(previousPage || (userSession ? 'chat' : 'landing'))}
              onMarkAsRead={() => setHasReadPolicies(true)}
            />
          </div>
        )}

        {currentPage === 'chat' && userSession && (
          <div key="chat" className="page-transition" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Chat 
              userSession={userSession} 
              onLogout={handleLogout}
              onOpenContacts={() => setIsContactsOpen(true)}
              onOpenPolicy={handleOpenPoliciesPage}
              emergencyContacts={emergencyContacts}
            />
          </div>
        )}

        {['signup', 'consent', 'otp'].includes(currentPage) && (
          <div 
            key={currentPage} 
            className="page-transition" 
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}
          >
            {currentPage === 'signup' && (
              <Signup 
                onComplete={handleSignupComplete} 
                onNavigate={(page) => {
                  if (page === 'policies') {
                    handleOpenPoliciesPage();
                  } else {
                    setCurrentPage(page);
                  }
                }} 
              />
            )}
            
            {currentPage === 'consent' && (
              <Consent 
                userSession={userSession}
                hasReadPolicies={hasReadPolicies}
                onAccept={handleConsentAccept} 
                onNavigate={(page) => {
                  if (page === 'policies') {
                    handleOpenPoliciesPage();
                  } else {
                    setCurrentPage(page);
                  }
                }} 
              />
            )}

            {currentPage === 'otp' && (
              <OtpVerification 
                userSession={userSession}
                onVerify={handleOtpVerify}
                onNavigate={(page) => setCurrentPage(page)} 
              />
            )}
          </div>
        )}
      </main>

      {/* Policy Modal (quick reference overlay) */}
      <PolicyModal 
        isOpen={isPolicyOpen} 
        onClose={() => setIsPolicyOpen(false)} 
      />

      {/* Emergency Contacts Slide-out Drawer */}
      <ContactsDrawer 
        isOpen={isContactsOpen} 
        onClose={() => setIsContactsOpen(false)} 
        contacts={emergencyContacts}
      />

    </div>
  );
}
