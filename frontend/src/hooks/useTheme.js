/**
 * Yuva Saarthi — Theme Management Hook
 * Phase 6: Tri-state theme (system | light | dark) with persistence and instant sync.
 */

import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'yuva_theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    } catch {
      return 'system';
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.getElementById('theme-color-meta');

    const applyTheme = (isDark) => {
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#13111C');
        setResolvedTheme('dark');
      } else {
        root.removeAttribute('data-theme');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#EEF0FB');
        setResolvedTheme('light');
      }
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      // System
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handleChange = (e) => {
        applyTheme(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}

export default useTheme;
