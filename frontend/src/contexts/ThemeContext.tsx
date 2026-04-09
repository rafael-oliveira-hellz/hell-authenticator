import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store';
import { setTheme } from '@/store/slices/appSlice';
import { Theme } from '@/types';
import { lightColors, darkColors, ColorScheme } from '@/constants/colors';

interface ThemeContextType {
  theme: Theme;
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const systemColorScheme = useColorScheme();
  const { theme } = useAppSelector(state => state.app);
  
  const [currentTheme, setCurrentTheme] = useState<Theme>(theme);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (currentTheme === 'auto') {
      return systemColorScheme || 'light';
    }
    return currentTheme;
  };

  const isDark = getEffectiveTheme() === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    dispatch(setTheme(newTheme));
  };

  const setThemeMode = (newTheme: Theme) => {
    setCurrentTheme(newTheme);
    dispatch(setTheme(newTheme));
  };

  const value: ThemeContextType = {
    theme: currentTheme,
    colors,
    isDark,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
