import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, SettingsContextValue } from '../types';

const SettingsContext = createContext<SettingsContextValue | null>(null);

const SETTINGS_KEY = '@foodfinder_settings';

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  dietPreferences: [], // e.g. ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free']
  priceRange: [1, 2, 3, 4], // which price levels to show
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((val) => {
      if (val) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(val) });
      setLoaded(true);
    }).catch((e) => { console.warn('[Settings] Failed to load settings:', e); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch((e) => console.warn('[Settings] Failed to save settings:', e));
  }, [settings, loaded]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
