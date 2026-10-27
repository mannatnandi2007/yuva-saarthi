/**
 * Yuva Saarthi — Message List Component
 * Phase 6: Scrollable chat stream where messages scroll behind the glass Yusa stage.
 * Auto-scroll to bottom, empty state starters, and degraded mode badge.
 */

import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { AlertCircle } from 'lucide-react';

export function MessageList({
  messages = [],
  isLoading = false,
  isSending = false,
  degraded = false,
  onQuickPrompt = null,
  className = '',
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const quickPrompts = [
    "I'm feeling really stressed about upcoming exams 📚",
    "Had a fight with my best friend and feel lonely 😔",
    "Feeling overwhelmed with family expectations 💭",
    "Just want to vent about my day today 🌸",
  ];

  return (
    <div
      className={`message-list-viewport ${className}`}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 20px 140px 20px', // Extra bottom padding for composer, top padding for mobile Yusa
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto',
      }}
    >
      {/* Degraded Mode Notice */}
      {degraded && (
        <div
          role="status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface-2)',
            color: 'var(--text-muted)',
            border: '1.5px solid var(--stroke)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            margin: '0 auto 16px auto',
            boxShadow: 'var(--shadow-hard-sm)',
          }}
        >
          <AlertCircle size={14} strokeWidth={2.5} />
          <span>Limited mode: Operating on offline safety fallback</span>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && !isLoading && (
        <div
          className="empty-chat-state"
          style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '480px',
            padding: '32px 16px',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '12px',
            }}
          >
            How are you feeling today?
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            This is your confidential, non-judgmental space. Talk freely in English, Hindi, or Hinglish.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              alignItems: 'stretch',
            }}
          >
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onQuickPrompt && onQuickPrompt(prompt)}
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  border: 'var(--border-width) solid var(--stroke)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: 'var(--shadow-hard-sm)',
                  transition: 'transform var(--transition-fast)',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, index) => (
        <MessageBubble
          key={msg.id || index}
          message={msg}
          isLatest={index === messages.length - 1}
        />
      ))}

      {/* Sending typing indicator */}
      {isSending && (
        <div
          className="typing-indicator-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            paddingLeft: '4px',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface)',
              border: 'var(--border-width) solid var(--stroke)',
              boxShadow: 'var(--shadow-hard)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <span className="dot dot-1" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--lilac)', border: '1px solid var(--stroke)', display: 'inline-block' }} />
            <span className="dot dot-2" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--pink)', border: '1px solid var(--stroke)', display: 'inline-block' }} />
            <span className="dot dot-3" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--yellow)', border: '1px solid var(--stroke)', display: 'inline-block' }} />
          </div>
        </div>
      )}

      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
}

export default MessageList;
