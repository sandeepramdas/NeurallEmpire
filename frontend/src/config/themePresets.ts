export interface ThemePresetConfig {
  id: string;
  name: string;
  description: string;
  colors: {
    light: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
      border: string;
    };
    dark: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
      border: string;
    };
  };
}

export const themePresets: Record<string, ThemePresetConfig> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean and professional',
    colors: {
      light: {
        primary: '#3b82f6',      // blue-500
        secondary: '#8b5cf6',    // violet-500
        accent: '#f59e0b',       // amber-500
        background: '#ffffff',
        surface: '#f9fafb',      // gray-50
        text: '#111827',         // gray-900
        textSecondary: '#6b7280', // gray-500
        border: '#e5e7eb',       // gray-200
      },
      dark: {
        primary: '#60a5fa',      // blue-400
        secondary: '#a78bfa',    // violet-400
        accent: '#fbbf24',       // amber-400
        background: '#0f172a',   // slate-900
        surface: '#1e293b',      // slate-800
        text: '#f1f5f9',         // slate-100
        textSecondary: '#94a3b8', // slate-400
        border: '#334155',       // slate-700
      },
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blues and teals',
    colors: {
      light: {
        primary: '#0891b2',      // cyan-600
        secondary: '#06b6d4',    // cyan-500
        accent: '#14b8a6',       // teal-500
        background: '#ffffff',
        surface: '#ecfeff',      // cyan-50
        text: '#164e63',         // cyan-900
        textSecondary: '#0e7490', // cyan-700
        border: '#a5f3fc',       // cyan-200
      },
      dark: {
        primary: '#22d3ee',      // cyan-400
        secondary: '#06b6d4',    // cyan-500
        accent: '#2dd4bf',       // teal-400
        background: '#083344',   // cyan-950
        surface: '#164e63',      // cyan-900
        text: '#ecfeff',         // cyan-50
        textSecondary: '#67e8f9', // cyan-300
        border: '#155e75',       // cyan-800
      },
    },
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural greens',
    colors: {
      light: {
        primary: '#16a34a',      // green-600
        secondary: '#22c55e',    // green-500
        accent: '#84cc16',       // lime-500
        background: '#ffffff',
        surface: '#f0fdf4',      // green-50
        text: '#14532d',         // green-900
        textSecondary: '#15803d', // green-700
        border: '#bbf7d0',       // green-200
      },
      dark: {
        primary: '#4ade80',      // green-400
        secondary: '#22c55e',    // green-500
        accent: '#a3e635',       // lime-400
        background: '#052e16',   // green-950
        surface: '#14532d',      // green-900
        text: '#f0fdf4',         // green-50
        textSecondary: '#86efac', // green-300
        border: '#166534',       // green-800
      },
    },
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges and reds',
    colors: {
      light: {
        primary: '#ea580c',      // orange-600
        secondary: '#f97316',    // orange-500
        accent: '#ef4444',       // red-500
        background: '#ffffff',
        surface: '#fff7ed',      // orange-50
        text: '#7c2d12',         // orange-900
        textSecondary: '#c2410c', // orange-700
        border: '#fed7aa',       // orange-200
      },
      dark: {
        primary: '#fb923c',      // orange-400
        secondary: '#f97316',    // orange-500
        accent: '#f87171',       // red-400
        background: '#431407',   // orange-950
        surface: '#7c2d12',      // orange-900
        text: '#fff7ed',         // orange-50
        textSecondary: '#fdba74', // orange-300
        border: '#9a3412',       // orange-800
      },
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purples and blues',
    colors: {
      light: {
        primary: '#7c3aed',      // violet-600
        secondary: '#8b5cf6',    // violet-500
        accent: '#a855f7',       // purple-500
        background: '#ffffff',
        surface: '#faf5ff',      // violet-50
        text: '#4c1d95',         // violet-900
        textSecondary: '#6d28d9', // violet-700
        border: '#ddd6fe',       // violet-200
      },
      dark: {
        primary: '#a78bfa',      // violet-400
        secondary: '#8b5cf6',    // violet-500
        accent: '#c084fc',       // purple-400
        background: '#2e1065',   // violet-950
        surface: '#4c1d95',      // violet-900
        text: '#faf5ff',         // violet-50
        textSecondary: '#c4b5fd', // violet-300
        border: '#5b21b6',       // violet-800
      },
    },
  },

  corporate: {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional blues and grays',
    colors: {
      light: {
        primary: '#1e40af',      // blue-800
        secondary: '#475569',    // slate-600
        accent: '#0284c7',       // sky-600
        background: '#ffffff',
        surface: '#f8fafc',      // slate-50
        text: '#0f172a',         // slate-900
        textSecondary: '#64748b', // slate-500
        border: '#cbd5e1',       // slate-300
      },
      dark: {
        primary: '#3b82f6',      // blue-500
        secondary: '#64748b',    // slate-500
        accent: '#0ea5e9',       // sky-500
        background: '#020617',   // slate-950
        surface: '#0f172a',      // slate-900
        text: '#f8fafc',         // slate-50
        textSecondary: '#94a3b8', // slate-400
        border: '#1e293b',       // slate-800
      },
    },
  },
};
