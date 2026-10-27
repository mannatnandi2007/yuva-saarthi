/**
 * Yuva Saarthi — Composer Component
 * Phase 6: Fixed bottom input bar with >=44px touch targets, solid black/white pill button,
 * hard offset shadow, and keyboard safe-area handling.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

export function Composer({
  onSend,
  disabled = false,
  placeholder = "Message Yuva Saarthi... (English / Hindi / Hinglish)",
  className = '',
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    // Auto-expand up to 120px
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  return (
    <div
      className={`chat-composer-wrapper ${className}`}
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        backgroundColor: 'var(--surface-glass)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: 'var(--border-width) solid var(--stroke)',
        zIndex: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          maxWidth: '780px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface)',
            border: 'var(--border-width-control) solid var(--stroke)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-hard-sm)',
            padding: '4px 8px 4px 14px',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Your message to Yuva Saarthi"
            style={{
              width: '100%',
              minHeight: '36px',
              maxHeight: '120px',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '15px',
              fontFamily: 'var(--font-body)',
              lineHeight: '1.4',
              padding: '6px 0',
            }}
          />

          {text.length > 300 && (
            <span
              style={{
                fontSize: '11px',
                color: text.length > 500 ? 'var(--coral)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                paddingRight: '6px',
              }}
            >
              {text.length}/600
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          style={{
            minWidth: '46px',
            minHeight: '46px',
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-pill)',
            border: 'var(--border-width-control) solid var(--stroke)',
            // Reference B: Solid black in light mode, solid cream/white in dark mode
            backgroundColor: 'var(--stroke)',
            color: 'var(--bg)',
            boxShadow: !text.trim() || disabled ? 'none' : 'var(--shadow-hard)',
            opacity: !text.trim() || disabled ? 0.45 : 1,
            cursor: !text.trim() || disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            flexShrink: 0,
          }}
        >
          <Send size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}

export default Composer;
