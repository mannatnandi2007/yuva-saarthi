// YUVAA Saarthi Main Application Container
// Calm Light Mental-Health Companion Theme
// Featuring Brain Logo, Dedicated Policies Page, Policy Modal, & Contacts Drawer

import React, { useState, useEffect } from 'react';
import Signup from './pages/Signup.jsx';
import Consent from './pages/Consent.jsx';
import OtpVerification from './pages/OtpVerification.jsx';
import Chat from './pages/Chat.jsx';
import PoliciesPage from './pages/PoliciesPage.jsx';
import BrainLogo from './components/BrainLogo.jsx';
import PolicyModal from './components/PolicyModal.jsx';
import ContactsDrawer from './components/ContactsDrawer.jsx';
import { Shield, Users, LogOut } from 'lucide-react';
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

  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = localStorage.getItem('yuvaa_user_session');
      return saved ? 'chat' : 'signup';
    } catch (e) {
      return 'signup';
    }
  });

  const [previousPage, setPreviousPage] = useState('signup');
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
    setCurrentPage('signup');
    setIsContactsOpen(false);
    setIsPolicyOpen(false);
  };

  const handleOpenPoliciesPage = () => {
    setPreviousPage(currentPage);
    setCurrentPage('policies');
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Clean Uncluttered Navbar (Unnecessary tags removed) */}
      <nav style={{ 
        background: 'rgba(255, 255, 255, 0.6)', 
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(167, 139, 250, 0.1)',
        padding: '10px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Left: Brain Logo + Clean Wordmark */}
        <div 
          onClick={() => setCurrentPage(userSession ? 'chat' : 'signup')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <BrainLogo size={34} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '1.2rem', 
              fontFamily: 'var(--font-display)', 
              fontWeight: '800', 
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: '#1e293b'
            }}>
              YUVAA <span className="gradient-crimson-pink">Saarthi</span>
            </span>
            <span style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '500' }}>
              Youth Mental Health Companion
            </span>
          </div>
        </div>

        {/* Right: Clean, purposeful controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Safety Policies */}
          <button
            onClick={handleOpenPoliciesPage}
            className="hallmark-btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
            title="View Safety & Confidentiality Policies"
          >
            <Shield size={14} color="#818cf8" />
            <span>Safety Policies</span>
          </button>

          {/* Emergency Contacts */}
          {userSession && (
            <button
              onClick={() => setIsContactsOpen(true)}
              className="hallmark-btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
              title="View Emergency Contacts"
            >
              <Users size={14} color="#818cf8" />
              <span>Contacts ({emergencyContacts.length})</span>
            </button>
          )}

          {/* Logout */}
          {userSession && (
            <button
              onClick={handleLogout}
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(254, 242, 242, 0.8)',
                border: '1px solid rgba(252, 165, 165, 0.5)',
                borderRadius: '9999px',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Sign Out"
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Workspace */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {currentPage === 'policies' ? (
          <PoliciesPage 
            onBack={() => setCurrentPage(previousPage || (userSession ? 'chat' : 'signup'))}
            onMarkAsRead={() => setHasReadPolicies(true)}
          />
        ) : currentPage === 'chat' && userSession ? (
          <Chat 
            userSession={userSession} 
            onLogout={handleLogout}
            onOpenContacts={() => setIsContactsOpen(true)}
            onOpenPolicy={handleOpenPoliciesPage}
            emergencyContacts={emergencyContacts}
          />
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
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

      {/* Policy Modal (kept for quick inline reference if needed) */}
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
