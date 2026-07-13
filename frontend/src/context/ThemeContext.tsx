import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'valquiria' | 'discord' | 'midnight' | 'ragnarok' | 'aurora' | 'light';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'vq_theme';
const DEFAULT_THEME: ThemeName = 'valquiria';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(
    (localStorage.getItem(STORAGE_KEY) as ThemeName) || DEFAULT_THEME
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de um ThemeProvider.');
  return ctx;
}
