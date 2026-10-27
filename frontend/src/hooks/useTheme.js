/**
 * Yuva Saarthi — Theme Management Hook
 * Automatic System Default:
 * If user system / browser has dark theme -> dark theme
 * If user system / browser has light theme -> light theme
 * Dynamically reacts to system appearance changes.
 */

import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const metaThemeColor = document.getElementById('theme-color-meta');

    const applyTheme = (dark) => {
      setIsDark(dark);
      if (dark) {
        root.setAttribute('data-theme', 'dark');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#13111C');
      } else {
        root.removeAttribute('data-theme');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#EEF0FB');
      }
    };

    // Remove any previous manual overrides so system default strictly governs
    try {
      localStorage.removeItem('yuva_theme');
    } catch {
      // ignore
    }

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
  }, []);

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    resolvedTheme: isDark ? 'dark' : 'light',
  };
}

export default useTheme;
