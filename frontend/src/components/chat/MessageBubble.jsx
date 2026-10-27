/**
 * Yuva Saarthi — Message Bubble Component
 * Phase 6: User message (--lilac) and Assistant message (--surface)
 * 2px stroke, 20px radius, hard offset shadow, zero gradients.
 */

import React from 'react';

const MOOD_EMOJIS = {
  normal: '🌸',
  happy: '✨',
  overjoyed: '🎉',
  sad: '💗',
  angry: '🌿',
  anxious: '🛡️',
  tired: '🌙',
};

export function MessageBubble({ message, isLatest = false }) {
  const isUser = message.role === 'user';
  const mood = message.mood ? message.mood.toLowerCase() : null;
  const moodEmoji = mood ? (MOOD_EMOJIS[mood] || '🌸') : null;

  const timeString = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className={`message-bubble-row ${isUser ? 'user-row' : 'assistant-row'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
        width: '100%',
      }}
    >
      <div
        className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}
        style={{
          maxWidth: '82%',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: isUser ? 'var(--lilac)' : 'var(--surface)',
          // Pastel-filled elements always use #16131F text in both themes
          color: isUser ? '#16131F' : 'var(--text)',
          border: 'var(--border-width) solid var(--stroke)',
          boxShadow: 'var(--shadow-hard)',
          fontSize: '15px',
          lineHeight: '1.55',
          fontFamily: 'var(--font-body)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          position: 'relative',
        }}
      >
        {message.content}

        {/* Assistant Mood Badge if present */}
        {!isUser && mood && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--stroke)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span>{moodEmoji}</span>
            <span>{mood.charAt(0).toUpperCase() + mood.slice(1)}</span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      {timeString && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            paddingLeft: isUser ? '0' : '6px',
            paddingRight: isUser ? '6px' : '0',
            fontFamily: 'var(--font-body)',
          }}
        >
          {timeString}
        </span>
      )}
    </div>
  );
}

export default MessageBubble;
