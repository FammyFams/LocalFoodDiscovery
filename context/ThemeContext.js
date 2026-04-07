import React, { createContext, useContext } from 'react';
import { useSettings } from './SettingsContext';

const light = {
  bg: '#FAFAFA',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#555555',
  textTertiary: '#888888',
  textQuaternary: '#adb5bd',
  separator: '#e9ecef',
  border: '#dee2e6',
  accent: '#6BBF59',
  accentLight: '#A8D5BA',
  orange: '#F7B267',
  destructive: '#ff6b6b',
  green: '#6BBF59',
  red: '#ff6b6b',
  blue: '#339af0',
  cardBg: '#ffffff',
  inputBg: '#f1f3f5',
  tabBar: '#ffffff',
  overlay: 'rgba(0,0,0,0.3)',
  chipActive: '#6BBF59',
  chipActiveText: '#ffffff',
  chipInactive: '#f1f3f5',
  chipInactiveText: '#555555',
};

const dark = {
  bg: '#1A1A1A',
  surface: '#242424',
  card: '#242424',
  text: '#F0F0F0',
  textSecondary: '#CCCCCC',
  textTertiary: '#888888',
  textQuaternary: '#555555',
  separator: '#333333',
  border: '#3A3A3A',
  accent: '#6BBF59',
  accentLight: '#2D4A28',
  orange: '#F7B267',
  destructive: '#ff6b6b',
  green: '#6BBF59',
  red: '#ff6b6b',
  blue: '#339af0',
  cardBg: '#242424',
  inputBg: '#333333',
  tabBar: '#242424',
  overlay: 'rgba(0,0,0,0.6)',
  chipActive: '#6BBF59',
  chipActiveText: '#ffffff',
  chipInactive: '#333333',
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
