import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { THEMES, THEME_IDS, type ThemeColors, type ThemeMode } from './colors';

export type { ThemeMode } from './colors';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = 'theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('organico');

  useEffect(() => {
    Storage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && THEME_IDS.includes(stored as ThemeMode)) {
        setModeState(stored as ThemeMode);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    Storage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'noche' ? 'organico' : 'noche');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: THEMES[mode].isDark,
      colors: THEMES[mode].colors,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return context;
}
