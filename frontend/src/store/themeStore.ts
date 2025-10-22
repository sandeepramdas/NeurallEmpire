import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemePreset = 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'corporate';

export interface Theme {
  mode: ThemeMode;
  preset: ThemePreset;
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
  toggleMode: () => void;
  getEffectiveMode: () => 'light' | 'dark';
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: {
        mode: 'system',
        preset: 'default',
      },

      setTheme: (newTheme) => {
        set((state) => ({
          theme: { ...state.theme, ...newTheme },
        }));
        applyTheme(get().getEffectiveMode(), get().theme.preset);
      },

      setMode: (mode) => {
        set((state) => ({
          theme: { ...state.theme, mode },
        }));
        applyTheme(get().getEffectiveMode(), get().theme.preset);
      },

      setPreset: (preset) => {
        set((state) => ({
          theme: { ...state.theme, preset },
        }));
        applyTheme(get().getEffectiveMode(), preset);
      },

      toggleMode: () => {
        const current = get().getEffectiveMode();
        const newMode: ThemeMode = current === 'dark' ? 'light' : 'dark';
        set((state) => ({
          theme: { ...state.theme, mode: newMode },
        }));
        applyTheme(newMode, get().theme.preset);
      },

      getEffectiveMode: () => {
        const { theme } = get();
        if (theme.mode === 'system') {
          return getSystemTheme();
        }
        return theme.mode;
      },
    }),
    {
      name: 'neurallempire-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.getEffectiveMode(), state.theme.preset);
        }
      },
    }
  )
);

// Apply theme to document
function applyTheme(mode: 'light' | 'dark', preset: ThemePreset) {
  const root = document.documentElement;

  // Set dark mode class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Set preset as data attribute
  root.setAttribute('data-theme', preset);

  // Import theme presets and apply colors
  import('../config/themePresets').then(({ themePresets }) => {
    const presetConfig = themePresets[preset];
    if (presetConfig) {
      const colors = mode === 'dark' ? presetConfig.colors.dark : presetConfig.colors.light;

      // Apply CSS variables
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-accent', colors.accent);
      root.style.setProperty('--color-background', colors.background);
      root.style.setProperty('--color-surface', colors.surface);
      root.style.setProperty('--color-text', colors.text);
      root.style.setProperty('--color-text-secondary', colors.textSecondary);
      root.style.setProperty('--color-border', colors.border);
    }
  });
}

// Listen to system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useThemeStore.getState();
    if (store.theme.mode === 'system') {
      applyTheme(store.getEffectiveMode(), store.theme.preset);
    }
  });
}
