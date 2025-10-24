/**
 * ==================== UNIFIED THEME SELECTOR ====================
 *
 * Production-grade theme selector with:
 * - Light/Dark mode toggle
 * - Color preset selection
 * - Custom color builder
 * - Live preview
 * - Smooth animations
 *
 * @module components/ThemeSelector
 */

import React, { useState } from 'react';
import { X, Check, Palette, Sun, Moon } from 'lucide-react';
import { useTheme, useThemePresets } from '../contexts/ThemeContext';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
  const { mode, preset, customColors, setMode, setPreset, setCustomColors } = useTheme();
  const presets = useThemePresets();

  const [customColorState, setCustomColorState] = useState({
    primary: customColors?.primary || '#3b82f6',
    secondary: customColors?.secondary || '#8b5cf6',
    accent: customColors?.accent || '#f59e0b',
  });

  const handlePresetSelect = (presetId: string) => {
    setPreset(presetId as any);
  };

  const handleCustomColorApply = () => {
    setCustomColors(customColorState);
  };

  const handleModeToggle = (newMode: 'light' | 'dark') => {
    setMode(newMode);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Theme Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize your interface appearance
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close theme selector"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
            {/* Appearance Mode */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Appearance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleModeToggle('light')}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    mode === 'light'
                      ? 'border-indigo-600 dark:border-indigo-400 shadow-lg scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }`}
                >
                  {mode === 'light' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
                      <Sun className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Light</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Bright and clean</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleModeToggle('dark')}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    mode === 'dark'
                      ? 'border-indigo-600 dark:border-indigo-400 shadow-lg scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }`}
                >
                  {mode === 'dark' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <Moon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Dark</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Easy on the eyes</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Theme Colors */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Theme Color
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(presets).map(([key, presetConfig]) => {
                  const currentColors = mode === 'dark' ? presetConfig.colors.dark : presetConfig.colors.light;

                  return (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        preset === key
                          ? 'border-indigo-600 dark:border-indigo-400 shadow-lg scale-105'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                      }`}
                    >
                      {preset === key && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* Color Preview */}
                      <div className="flex gap-2 mb-3">
                        <div
                          className="w-12 h-12 rounded-lg shadow-md"
                          style={{ backgroundColor: currentColors.primary }}
                        />
                        <div className="flex flex-col gap-1">
                          <div
                            className="w-8 h-5 rounded"
                            style={{ backgroundColor: currentColors.secondary }}
                          />
                          <div
                            className="w-8 h-5 rounded"
                            style={{ backgroundColor: currentColors.accent }}
                          />
                        </div>
                      </div>

                      {/* Preset Info */}
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {presetConfig.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {presetConfig.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Custom Colors
              </h3>
              <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customColorState.primary}
                        onChange={(e) =>
                          setCustomColorState({ ...customColorState, primary: e.target.value })
                        }
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColorState.primary}
                        onChange={(e) =>
                          setCustomColorState({ ...customColorState, primary: e.target.value })
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
                        value={customColorState.secondary}
                        onChange={(e) =>
                          setCustomColorState({ ...customColorState, secondary: e.target.value })
                        }
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColorState.secondary}
                        onChange={(e) =>
                          setCustomColorState({ ...customColorState, secondary: e.target.value })
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
                        value={customColorState.accent}
                        onChange={(e) =>
                          setCustomColorState({ ...customColorState, accent: e.target.value })
                        }
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={customColorState.accent}
                        onChange={(e) =>
                          setCustomColorState({ ...customColorState, accent: e.target.value })
                        }
                        className="input-field flex-1"
                        placeholder="#f59e0b"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <button onClick={handleCustomColorApply} className="btn-primary w-full">
                    Apply Custom Colors
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Changes are applied instantly
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
