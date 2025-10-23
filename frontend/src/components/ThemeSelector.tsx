import React, { useState } from 'react';
import { X, Check, Palette, Sparkles } from 'lucide-react';

interface ColorScheme {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  preview: {
    bg: string;
    surface: string;
    text: string;
  };
}

const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    description: 'Classic professional blue theme',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    preview: {
      bg: '#f9fafb',
      surface: '#ffffff',
      text: '#111827',
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Elegant purple and magenta',
    primary: '#9333ea',
    secondary: '#c026d3',
    accent: '#06b6d4',
    preview: {
      bg: '#faf5ff',
      surface: '#ffffff',
      text: '#1f2937',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Fresh and modern green',
    primary: '#10b981',
    secondary: '#14b8a6',
    accent: '#f59e0b',
    preview: {
      bg: '#f0fdf4',
      surface: '#ffffff',
      text: '#111827',
    },
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    description: 'Vibrant and energetic',
    primary: '#f43f5e',
    secondary: '#ec4899',
    accent: '#8b5cf6',
    preview: {
      bg: '#fff1f2',
      surface: '#ffffff',
      text: '#1f2937',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Calm and serene',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#8b5cf6',
    preview: {
      bg: '#f0f9ff',
      surface: '#ffffff',
      text: '#111827',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm and inviting',
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#facc15',
    preview: {
      bg: '#fff7ed',
      surface: '#ffffff',
      text: '#1f2937',
    },
  },
];

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
  const [selectedScheme, setSelectedScheme] = useState<string>('default');
  const [customColors, setCustomColors] = useState({
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
  });

  const applyColorScheme = (scheme: ColorScheme) => {
    // Update CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', scheme.primary);
    root.style.setProperty('--color-secondary', scheme.secondary);
    root.style.setProperty('--color-accent', scheme.accent);

    // Store in localStorage
    localStorage.setItem('neurallempire-color-scheme', JSON.stringify(scheme));

    setSelectedScheme(scheme.id);
  };

  const applyCustomColors = () => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', customColors.primary);
    root.style.setProperty('--color-secondary', customColors.secondary);
    root.style.setProperty('--color-accent', customColors.accent);

    localStorage.setItem('neurallempire-custom-colors', JSON.stringify(customColors));
    setSelectedScheme('custom');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Theme Colors
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose your perfect color scheme
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-5rem)]">
            {/* Preset Themes */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Preset Color Schemes
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COLOR_SCHEMES.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => applyColorScheme(scheme)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      selectedScheme === scheme.id
                        ? 'border-indigo-600 dark:border-indigo-400 shadow-lg scale-105'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                    }`}
                  >
                    {selectedScheme === scheme.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Color Preview */}
                    <div className="flex gap-2 mb-3">
                      <div
                        className="w-12 h-12 rounded-lg shadow-md"
                        style={{ backgroundColor: scheme.primary }}
                      />
                      <div className="flex flex-col gap-1">
                        <div
                          className="w-8 h-5 rounded"
                          style={{ backgroundColor: scheme.secondary }}
                        />
                        <div
                          className="w-8 h-5 rounded"
                          style={{ backgroundColor: scheme.accent }}
                        />
                      </div>
                    </div>

                    {/* Scheme Info */}
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {scheme.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {scheme.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Custom Colors
                </h3>
              </div>
              <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customColors.primary}
                        onChange={(e) =>
                          setCustomColors({ ...customColors, primary: e.target.value })
                        }
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColors.primary}
                        onChange={(e) =>
                          setCustomColors({ ...customColors, primary: e.target.value })
                        }
                        className="input-field flex-1"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customColors.secondary}
                        onChange={(e) =>
                          setCustomColors({ ...customColors, secondary: e.target.value })
                        }
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColors.secondary}
                        onChange={(e) =>
                          setCustomColors({ ...customColors, secondary: e.target.value })
                        }
                        className="input-field flex-1"
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customColors.accent}
                        onChange={(e) =>
                          setCustomColors({ ...customColors, accent: e.target.value })
                        }
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColors.accent}
                        onChange={(e) =>
                          setCustomColors({ ...customColors, accent: e.target.value })
                        }
                        className="input-field flex-1"
                        placeholder="#f59e0b"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <button onClick={applyCustomColors} className="btn-primary w-full">
                    Apply Custom Colors
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Changes are saved automatically
            </p>
            <button onClick={onClose} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
