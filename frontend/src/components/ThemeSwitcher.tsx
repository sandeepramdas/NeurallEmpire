import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SwatchIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useThemeStore, type ThemeMode, type ThemePreset } from '../store/themeStore';
import { themePresets } from '../config/themePresets';
import { clsx } from 'clsx';

export function ThemeSwitcher() {
  const { theme, setMode, setPreset, getEffectiveMode } = useThemeStore();
  const effectiveMode = getEffectiveMode();

  const modeOptions: { value: ThemeMode; label: string; icon: any }[] = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ];

  const CurrentModeIcon = modeOptions.find((m) => m.value === theme.mode)?.icon || SunIcon;

  return (
    <div className="flex items-center gap-2">
      {/* Mode Switcher */}
      <Menu as="div" className="relative">
        <Menu.Button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <CurrentModeIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="p-1">
              {modeOptions.map((option) => (
                <Menu.Item key={option.value}>
                  {({ active }) => (
                    <button
                      onClick={() => setMode(option.value)}
                      className={clsx(
                        'flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors',
                        active && 'bg-gray-100 dark:bg-gray-700',
                        theme.mode === option.value && 'text-blue-600 dark:text-blue-400'
                      )}
                    >
                      <option.icon className="w-4 h-4 mr-3" />
                      <span className="flex-1 text-left">{option.label}</span>
                      {theme.mode === option.value && (
                        <CheckIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      {/* Preset Switcher */}
      <Menu as="div" className="relative">
        <Menu.Button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <SwatchIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="p-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Theme Presets
              </div>
              {Object.values(themePresets).map((preset) => (
                <Menu.Item key={preset.id}>
                  {({ active }) => (
                    <button
                      onClick={() => setPreset(preset.id as ThemePreset)}
                      className={clsx(
                        'flex items-start w-full px-3 py-2 text-sm rounded-md transition-colors',
                        active && 'bg-gray-100 dark:bg-gray-700',
                        theme.preset === preset.id && 'ring-2 ring-blue-500 dark:ring-blue-400'
                      )}
                    >
                      <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-md overflow-hidden">
                        <div className="w-full h-full flex">
                          <div
                            className="w-1/2 h-full"
                            style={{
                              background: effectiveMode === 'dark'
                                ? preset.colors.dark.primary
                                : preset.colors.light.primary
                            }}
                          />
                          <div
                            className="w-1/2 h-full"
                            style={{
                              background: effectiveMode === 'dark'
                                ? preset.colors.dark.secondary
                                : preset.colors.light.secondary
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {preset.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {preset.description}
                        </div>
                      </div>
                      {theme.preset === preset.id && (
                        <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
