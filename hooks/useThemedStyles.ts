import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../types';

type NamedStyles<T> = { [P in keyof T]: T[P] };

export function useThemedStyles<T extends NamedStyles<T>>(
  createStyles: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => createStyles(theme), [theme, createStyles]);
}
