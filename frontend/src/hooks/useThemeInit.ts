import { useEffect } from 'react';

export function useThemeInit() {
  useEffect(() => {
    // Load saved color scheme from localStorage
    const savedScheme = localStorage.getItem('neurallempire-color-scheme');
    const savedCustomColors = localStorage.getItem('neurallempire-custom-colors');

    if (savedCustomColors) {
      // Apply custom colors
      const colors = JSON.parse(savedCustomColors);
      const root = document.documentElement;
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-accent', colors.accent);
    } else if (savedScheme) {
      // Apply preset scheme
      const scheme = JSON.parse(savedScheme);
      const root = document.documentElement;
      root.style.setProperty('--color-primary', scheme.primary);
      root.style.setProperty('--color-secondary', scheme.secondary);
      root.style.setProperty('--color-accent', scheme.accent);
    }
  }, []);
}
