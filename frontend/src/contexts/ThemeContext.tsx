/**
 * ==================== UNIFIED THEME SYSTEM ====================
 *
 * Production-grade theme management combining:
 * - Light/Dark mode
 * - Color presets (ocean, forest, sunset, midnight, corporate)
 * - Custom color schemes
 * - Smooth transitions
 * - Persistent storage
 * - Real-time updates across all components
 *
 * @module contexts/ThemeContext
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themePresets, ThemePresetConfig } from '../config/themePresets';

type ThemeMode = 'light' | 'dark';
type ThemePreset = keyof typeof themePresets | 'custom';

interface CustomColors {
  primary: string;
  secondary: string;
  accent: string;
  background?: string;
  surface?: string;
  text?: string;
  textSecondary?: string;
  border?: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  preset: ThemePreset;
  customColors: CustomColors | null;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
  setCustomColors: (colors: CustomColors) => void;
  applyTheme: (mode: ThemeMode, preset: ThemePreset, custom?: CustomColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MODE: 'neurallempire-theme-mode',
  PRESET: 'neurallempire-theme-preset',
  CUSTOM: 'neurallempire-custom-colors',
} as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage or system preference
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESET);
    return (saved && (saved in themePresets || saved === 'custom')) ? saved as ThemePreset : 'default';
  });

  const [customColors, setCustomColorsState] = useState<CustomColors | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM);
    return saved ? JSON.parse(saved) : null;
  });

  /**
   * Apply theme to DOM
   * Sets all CSS custom properties based on mode, preset, and custom colors
   */
  const applyThemeToDom = useCallback((themeMode: ThemeMode, themePreset: ThemePreset, custom?: CustomColors | null) => {
    const root = document.documentElement;

    // Add transition class for smooth theme changes
    root.classList.add('theme-transitioning');

    // Apply mode class
    root.classList.remove('light', 'dark');
    root.classList.add(themeMode);

    // Get colors based on preset or custom
    let colors: Record<string, string>;

    if (themePreset === 'custom' && custom) {
      // Custom colors
      colors = {
        primary: custom.primary,
        secondary: custom.secondary,
        accent: custom.accent,
        background: custom.background || (themeMode === 'dark' ? '#0f172a' : '#ffffff'),
        surface: custom.surface || (themeMode === 'dark' ? '#1e293b' : '#f9fafb'),
        text: custom.text || (themeMode === 'dark' ? '#f1f5f9' : '#111827'),
        textSecondary: custom.textSecondary || (themeMode === 'dark' ? '#94a3b8' : '#6b7280'),
        border: custom.border || (themeMode === 'dark' ? '#334155' : '#e5e7eb'),
      };
    } else if (themePreset in themePresets) {
      // Preset colors
      const presetConfig = themePresets[themePreset as keyof typeof themePresets];
      const modeColors = presetConfig.colors[themeMode];
      colors = {
        primary: modeColors.primary,
        secondary: modeColors.secondary,
        accent: modeColors.accent,
        background: modeColors.background,
        surface: modeColors.surface,
        text: modeColors.text,
        textSecondary: modeColors.textSecondary,
        border: modeColors.border,
      };
    } else {
      // Fallback to default
      const defaultConfig = themePresets.default;
      const modeColors = defaultConfig.colors[themeMode];
      colors = {
        primary: modeColors.primary,
        secondary: modeColors.secondary,
        accent: modeColors.accent,
        background: modeColors.background,
        surface: modeColors.surface,
        text: modeColors.text,
        textSecondary: modeColors.textSecondary,
        border: modeColors.border,
      };
    }

    // Apply all color variables
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-border', colors.border);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.background);
    }

    // Remove transition class after animation completes
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
  }, []);

  /**
   * Apply theme and persist to storage
   */
  const applyTheme = useCallback((themeMode: ThemeMode, themePreset: ThemePreset, custom?: CustomColors) => {
    // Update state
    setModeState(themeMode);
    setPresetState(themePreset);
    if (custom) setCustomColorsState(custom);

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEYS.MODE, themeMode);
    localStorage.setItem(STORAGE_KEYS.PRESET, themePreset);
    if (custom) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM, JSON.stringify(custom));
    }

    // Apply to DOM
    applyThemeToDom(themeMode, themePreset, custom);
  }, [applyThemeToDom]);

  /**
   * Toggle between light and dark mode
   */
  const toggleMode = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    applyTheme(newMode, preset, customColors || undefined);
  }, [mode, preset, customColors, applyTheme]);

  /**
   * Set mode directly
   */
  const setMode = useCallback((newMode: ThemeMode) => {
    applyTheme(newMode, preset, customColors || undefined);
  }, [preset, customColors, applyTheme]);

  /**
   * Set color preset
   */
  const setPreset = useCallback((newPreset: ThemePreset) => {
    applyTheme(mode, newPreset, customColors || undefined);
  }, [mode, customColors, applyTheme]);

  /**
   * Set custom colors
   */
  const setCustomColors = useCallback((colors: CustomColors) => {
    setCustomColorsState(colors);
    applyTheme(mode, 'custom', colors);
  }, [mode, applyTheme]);

  // Initialize theme on mount
  useEffect(() => {
    applyThemeToDom(mode, preset, customColors);
  }, []); // Only run once on mount

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEYS.MODE)) {
        const newMode = e.matches ? 'dark' : 'light';
        applyTheme(newMode, preset, customColors || undefined);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preset, customColors, applyTheme]);

  const value: ThemeContextType = {
    mode,
    preset,
    customColors,
    toggleMode,
    setMode,
    setPreset,
    setCustomColors,
    applyTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 * @throws Error if used outside ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get all available theme presets
 */
export function useThemePresets() {
  return themePresets;
}

/**
 * Hook to get current theme config
 */
export function useThemeConfig(): ThemePresetConfig | null {
  const { preset } = useTheme();
  if (preset === 'custom') return null;
  return themePresets[preset as keyof typeof themePresets] || null;
}
