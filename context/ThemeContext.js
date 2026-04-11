import React, { createContext, useContext } from 'react';
import { useSettings } from './SettingsContext';

const light = {
  bg: '#F5F5DC',
  surface: '#F5F5DC',
  card: '#FFFDF7',
  text: '#2C1810',
  textSecondary: '#5C4033',
  textTertiary: '#8B7355',
  textQuaternary: '#A89880',
  separator: '#DDD5C0',
  border: '#D4C9A8',
  accent: '#228B22',
  accentLight: '#A8D5A2',
  orange: '#C67B3C',
  destructive: '#C0392B',
  green: '#228B22',
  red: '#C0392B',
  blue: '#87CEEB',
  cardBg: '#FFFDF7',
  inputBg: '#EDE8D5',
  tabBar: '#FFFDF7',
  overlay: 'rgba(44,24,16,0.3)',
  chipActive: '#228B22',
  chipActiveText: '#ffffff',
  chipInactive: '#EDE8D5',
  chipInactiveText: '#5C4033',
};

const dark = {
  bg: '#2A2620',
  surface: '#2A2620',
  card: '#363028',
  text: '#F0EBE0',
  textSecondary: '#DDD5C2',
  textTertiary: '#C8BFA8',
  textQuaternary: '#C0B49E',
  separator: '#3A3428',
  border: '#443D30',
  accent: '#34A853',
  accentLight: '#2D4A28',
  orange: '#D4915C',
  destructive: '#E74C3C',
  green: '#34A853',
  red: '#E74C3C',
  blue: '#87CEEB',
  cardBg: '#363028',
  inputBg: '#3A3428',
  tabBar: '#2A2620',
  overlay: 'rgba(28,26,20,0.6)',
  chipActive: '#34A853',
  chipActiveText: '#ffffff',
  chipInactive: '#3A3428',
  chipInactiveText: '#C8BFA8',
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
