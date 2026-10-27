/**
 * Yuva Saarthi — Theme Toggle Component
 * Accessible, high-contrast Light / Dark mode segmented switch with icons and labels
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useTheme from '../hooks/useTheme';

export function ThemeToggle({ className = '', compact = false }) {
  const { isDark, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`theme-toggle-group ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-pill)',
        border: 'var(--border-width) solid var(--stroke)',
        boxShadow: 'var(--shadow-hard-sm)',
        gap: '3px',
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        onClick={() => setTheme('light')}
        title="Switch to Light Mode"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: compact ? '4px 9px' : '6px 13px',
          borderRadius: 'var(--radius-pill)',
          border: !isDark ? '2px solid var(--stroke)' : '2px solid transparent',
          backgroundColor: !isDark ? 'var(--yellow)' : 'transparent',
          color: '#16131F',
          fontSize: '12px',
          fontWeight: !isDark ? 800 : 600,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Sun size={14} strokeWidth={2.5} />
        <span>Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={() => setTheme('dark')}
        title="Switch to Dark Mode"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: compact ? '4px 9px' : '6px 13px',
          borderRadius: 'var(--radius-pill)',
          border: isDark ? '2px solid var(--stroke)' : '2px solid transparent',
          backgroundColor: isDark ? 'var(--stroke)' : 'transparent',
          color: isDark ? 'var(--bg)' : 'var(--text)',
          fontSize: '12px',
          fontWeight: isDark ? 800 : 600,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Moon size={14} strokeWidth={2.5} />
        <span>Dark</span>
      </button>
    </div>
  );
}

export default ThemeToggle;
