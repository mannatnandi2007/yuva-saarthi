/**
 * Yuva Saarthi — Message Bubble Component
 * User message (--lilac) and Assistant message (--surface)
 * 2px stroke, 20px radius, hard offset shadow, zero gradients.
 */

import React from 'react';
import { MOOD_META, normalizeMood } from '../../utils/emotionEngine.js';

export function MessageBubble({ message, isLatest = false }) {
  const isUser = message.role === 'user';
  const moodKey = message.mood ? normalizeMood(message.mood) : null;
  const moodMeta = moodKey ? MOOD_META[moodKey] : null;

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
        {!isUser && moodMeta && moodKey !== 'normal' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: moodMeta.color,
              border: '1px solid var(--stroke)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#16131F',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span>{moodMeta.emoji}</span>
            <span>{moodMeta.label}</span>
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
            padding: '0 4px',
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
