/**
 * Yuva Saarthi — Theme Toggle Component
 * Phase 6: Accessible tri-state selector (Light / Dark / System)
 */

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import useTheme from '../hooks/useTheme';

export function ThemeToggle({ className = '', compact = false }) {
  const { theme, setTheme, isDark } = useTheme();

  const options = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'system', label: 'System', icon: Laptop },
    { key: 'dark', label: 'Dark', icon: Moon },
  ];

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`theme-toggle-compact ${className}`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Current: ${theme}. Click to switch theme.`}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-pill)',
          border: 'var(--border-width-control) solid var(--stroke)',
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          boxShadow: 'var(--shadow-hard-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform var(--transition-fast)',
        }}
      >
        {isDark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`theme-toggle-group ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-pill)',
        border: 'var(--border-width) solid var(--stroke)',
        boxShadow: 'var(--shadow-hard-sm)',
        gap: '2px',
      }}
    >
      {options.map(({ key, label, icon: Icon }) => {
        const isActive = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            aria-pressed={isActive}
            title={`${label} theme`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              border: isActive ? '2px solid var(--stroke)' : '2px solid transparent',
              backgroundColor: isActive ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <Icon size={14} strokeWidth={2.5} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
