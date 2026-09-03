import React, { createContext, useContext } from 'react';
import { colors, typeScale, spacing, radius, fontFamilies } from '@fashub/design-tokens';

const theme = { colors, typeScale, spacing, radius, fontFamilies } as const;

type Theme = typeof theme;

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
