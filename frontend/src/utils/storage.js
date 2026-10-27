/**
 * Yuva Saarthi — Cross-Platform Storage Adapter
 * Phase 7: Unified storage layer supporting both Web (localStorage)
 * and Native Android (Capacitor Preferences).
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

export const storage = {
  isNativePlatform: () => isNative,

  /**
   * Synchronous get (reads from localStorage with in-memory fallback)
   */
  getSync: (key, fallback = null) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : fallback;
      }
    } catch {
      // ignore
    }
    return fallback;
  },

  /**
   * Asynchronous get: uses Capacitor Preferences on Android, localStorage on Web
   */
  getItem: async (key, fallback = null) => {
    if (isNative) {
      try {
        const { value } = await Preferences.get({ key });
        return value !== null ? value : fallback;
      } catch (err) {
        console.warn(`[STORAGE] Capacitor Preferences.get failed for ${key}:`, err);
      }
    }
    return storage.getSync(key, fallback);
  },

  /**
   * Asynchronous set: writes to both Capacitor Preferences and localStorage
   */
  setItem: async (key, value) => {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Always sync with localStorage for fast sync access
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringVal);
      }
    } catch {
      // ignore
    }

    if (isNative) {
      try {
        await Preferences.set({ key, value: stringVal });
      } catch (err) {
        console.warn(`[STORAGE] Capacitor Preferences.set failed for ${key}:`, err);
      }
    }
  },

  /**
   * Remove item from both platforms
   */
  removeItem: async (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }

    if (isNative) {
      try {
        await Preferences.remove({ key });
      } catch (err) {
        console.warn(`[STORAGE] Capacitor Preferences.remove failed for ${key}:`, err);
      }
    }
  },

  /**
   * Clear all storage
   */
  clear: async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }

    if (isNative) {
      try {
        await Preferences.clear();
      } catch (err) {
        console.warn(`[STORAGE] Capacitor Preferences.clear failed:`, err);
      }
    }
  },
};

export default storage;
