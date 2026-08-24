"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  DEFAULT_THEME,
  resolveTheme,
  writeThemeCookie,
} from "@/lib/theme";

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ initialTheme = DEFAULT_THEME, children }) {
  const [theme, setThemeState] = useState(() => resolveTheme(initialTheme));

  const setTheme = useCallback((next) => {
    const resolved = writeThemeCookie(next);
    setThemeState(resolved);
    document.documentElement.dataset.theme = resolved;
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
