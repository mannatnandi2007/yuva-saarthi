/**
 * Yuva Saarthi — Chat Page
 * Phase 6 Rebuild: Clean component architecture with responsive Yusa glass stage layout.
 * Desktop: Sidebar (280px) | Chat Stream (scrolls behind) | Yusa Stage (320px glass blur)
 * Mobile: Drawer Sidebar | Centered Yusa Stage (glass blur) | Chat Stream | Fixed Composer
 * Strict design system: Flat pastel fills, solid strokes, zero gradients.
 */

import React, { useState, useEffect } from 'react';
import { Menu, Shield, Users, Sparkles, AlertCircle } from 'lucide-react';
import useSessions from '../hooks/useSessions';
import useChat from '../hooks/useChat';
import useTheme from '../hooks/useTheme';
import YusaCompanion from '../components/YusaCompanion';
import MoodPill from '../components/chat/MoodPill';
import SafetyBanner from '../components/chat/SafetyBanner';
import MessageList from '../components/chat/MessageList';
import Composer from '../components/chat/Composer';
import SessionSidebar from '../components/chat/SessionSidebar';
import ContactsDrawer from '../components/ContactsDrawer';
import PolicyModal from '../components/PolicyModal';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/client';

export default function Chat() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const {
    sessions,
    groupedSessions,
    currentSessionId,
    setCurrentSessionId,
    fetchSessions,
    selectSession,
    startNewChat,
    deleteSession,
    bulkDeleteSessions,
  } = useSessions();

  const {
    messages,
    currentMood,
    isLoadingMessages,
    isSending,
    error,
    degraded,
    activeHelplines,
    sendMessage,
  } = useChat({
    currentSessionId,
    onSessionCreated: (newId) => setCurrentSessionId(newId),
    onSessionsRefresh: fetchSessions,
  });

  // Track window resizing and mobile virtual keyboard
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);

    // Visual viewport listener for mobile virtual keyboard
    if (window.visualViewport) {
      const handleVisualResize = () => {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 140);
      };
      window.visualViewport.addEventListener('resize', handleVisualResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('resize', handleVisualResize);
      };
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch emergency contacts for the user
  useEffect(() => {
    apiClient
      .get('/contacts')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.contacts || []);
        setContacts(list);
      })
      .catch((err) => {
        // Non-fatal if contacts cannot be fetched
      });
  }, []);

  return (
    <div
      className="chat-page-root"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100dvh',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar: Left 280px on desktop; slide-out drawer on mobile/tablet */}
      <SessionSidebar
        sessions={sessions}
        groupedSessions={groupedSessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={startNewChat}
        onDeleteSession={deleteSession}
        onBulkDelete={bulkDeleteSessions}
        onOpenContacts={() => setIsContactsOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        className={isDesktop ? 'sidebar-desktop' : `sidebar-drawer ${isSidebarOpen ? 'open' : ''}`}
      />

      {/* Main Chat Container */}
      <div
        className="chat-main-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg)',
        }}
      >
        {/* Top Navbar */}
        <header
          style={{
            height: '60px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'var(--border-width) solid var(--stroke)',
            backgroundColor: 'var(--surface)',
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open conversation history"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'var(--border-width) solid var(--stroke)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-hard-sm)',
                }}
              >
                <Menu size={18} strokeWidth={2.5} />
              </button>
            )}

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Yuva Saarthi</span>
              </h1>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Safe & Confidential Companion
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsPolicyOpen(true)}
              title="Safety Charter"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                border: 'var(--border-width) solid var(--stroke)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-hard-sm)',
              }}
            >
              <Shield size={14} strokeWidth={2.5} />
              <span className="hide-on-mobile">Safety Charter</span>
            </button>

            <ThemeToggle compact />
          </div>
        </header>

        {/* Emergency helpline banner if active */}
        {activeHelplines && activeHelplines.length > 0 && (
          <SafetyBanner helplines={activeHelplines} />
        )}

        {/* Chat Stream & Yusa Stage Area */}
        <div
          className="chat-body-layout"
          style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Message List (Messages scroll behind Yusa stage) */}
          <div
            className="chat-messages-container"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
            }}
          >
            {/* Mobile / Tablet Centered Floating Yusa Glass Stage */}
            {!isDesktop && (
              <div
                className={`mobile-yusa-glass-stage ${isKeyboardOpen ? 'keyboard-compact' : ''}`}
                style={{
                  position: 'sticky',
                  top: '12px',
                  alignSelf: 'center',
                  zIndex: 15,
                  margin: '8px auto',
                  padding: isKeyboardOpen ? '4px 12px' : '10px 16px',
                  backgroundColor: 'var(--surface-glass)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: 'var(--border-width) solid var(--stroke)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-hard)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  pointerEvents: 'auto',
                  transition: 'all var(--transition-normal)',
                }}
              >
                <YusaCompanion
                  mood={currentMood}
                  size={isKeyboardOpen ? 48 : 90}
                  showBubble={!isKeyboardOpen}
                />
                {!isKeyboardOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      Yusa Companion
                    </span>
                    <MoodPill mood={currentMood} />
                  </div>
                )}
              </div>
            )}

            <MessageList
              messages={messages}
              isLoading={isLoadingMessages}
              isSending={isSending}
              degraded={degraded}
              onQuickPrompt={(prompt) => sendMessage(prompt)}
            />

            <Composer
              onSend={sendMessage}
              disabled={isSending}
            />
          </div>

          {/* Desktop Right Yusa Stage (320px fixed, glass blur backdrop) */}
          {isDesktop && (
            <aside
              className="desktop-yusa-stage"
              style={{
                width: '320px',
                height: '100%',
                backgroundColor: 'var(--surface-glass)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderLeft: 'var(--border-width) solid var(--stroke)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                zIndex: 15,
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Your Emotional Companion
                </span>
              </div>

              <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <YusaCompanion
                  mood={currentMood}
                  size={210}
                  showBubble={true}
                />
                <MoodPill mood={currentMood} />
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--stroke)',
                  boxShadow: 'var(--shadow-hard-sm)',
                  fontSize: '12px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                  maxWidth: '260px',
                  marginTop: 'auto',
                }}
              >
                Yusa’s mood gently mirrors and supports you throughout your chat.
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Drawers and Modals */}
      <ContactsDrawer
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        contacts={contacts}
      />

      <PolicyModal
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
      />
    </div>
  );
}
