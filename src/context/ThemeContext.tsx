import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../theme';

export type ThemeColors = typeof darkColors;
type ThemeCtx = { isDark: boolean; colors: ThemeColors; toggleTheme: () => void };
const ThemeContext = createContext<ThemeCtx>({} as ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem('appTheme').then(v => { if (v === 'light') setIsDark(false); });
  }, []);
  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('appTheme', next ? 'dark' : 'light');
      return next;
    });
  };
  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
