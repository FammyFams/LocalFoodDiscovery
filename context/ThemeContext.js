import React, { createContext, useContext } from 'react';
import { useSettings } from './SettingsContext';

const light = {
  bg: '#f5f6f7',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#212529',
  textSecondary: '#495057',
  textTertiary: '#868e96',
  textQuaternary: '#adb5bd',
  separator: '#e9ecef',
  border: '#dee2e6',
  accent: '#212529',
  accentLight: '#f5f6f7',
  teal: '#34AFA9',
  destructive: '#ff6b6b',
  green: '#51cf66',
  red: '#ff6b6b',
  blue: '#339af0',
  cardBg: '#ffffff',
  inputBg: '#f1f3f5',
  tabBar: '#ffffff',
  overlay: 'rgba(0,0,0,0.3)',
  chipActive: '#212529',
  chipActiveText: '#ffffff',
  chipInactive: '#f1f3f5',
  chipInactiveText: '#495057',
};

const dark = {
  bg: '#111315',
  surface: '#1a1d21',
  card: '#1a1d21',
  text: '#f5f6f7',
  textSecondary: '#dee2e6',
  textTertiary: '#868e96',
  textQuaternary: '#495057',
  separator: '#2c2f33',
  border: '#343a40',
  accent: '#f5f6f7',
  accentLight: '#2c2f33',
  teal: '#34AFA9',
  destructive: '#ff6b6b',
  green: '#51cf66',
  red: '#ff6b6b',
  blue: '#339af0',
  cardBg: '#1a1d21',
  inputBg: '#2c2f33',
  tabBar: '#1a1d21',
  overlay: 'rgba(0,0,0,0.6)',
  chipActive: '#f5f6f7',
  chipActiveText: '#212529',
  chipInactive: '#2c2f33',
  chipInactiveText: '#adb5bd',
};

const ThemeContext = createContext(light);

export function ThemeProvider({ children }) {
  const { settings } = useSettings();
  const theme = settings.darkMode ? dark : light;
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
