import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Theme } from '../types';

interface DietOption {
  key: string;
  label: string;
  emoji: string;
}

const DIET_OPTIONS: DietOption[] = [
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'halal', label: 'Halal', emoji: '🍖' },
  { key: 'kosher', label: 'Kosher', emoji: '✡️' },
  { key: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
];

export default function DietPreferencesScreen() {
  const { settings, updateSettings } = useSettings();
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const enabled = settings.dietRestrictionsEnabled || false;
  const current = settings.dietPreferences || [];

  function toggleEnabled(val: boolean) {
    updateSettings({ dietRestrictionsEnabled: val });
    if (!val) updateSettings({ dietPreferences: [] });
  }

  function toggle(key: string) {
    if (current.includes(key)) {
      updateSettings({ dietPreferences: current.filter((d) => d !== key) });
    } else {
      updateSettings({ dietPreferences: [...current, key] });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>I have diet restrictions</Text>
          <Switch
            value={enabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: t.separator, true: t.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {!enabled && (
        <Text style={styles.hint}>Turn this on to filter restaurants by your dietary needs.</Text>
      )}

      {enabled && (
        <View style={styles.card}>
          {DIET_OPTIONS.map((diet, i) => (
            <React.Fragment key={diet.key}>
              {i > 0 && <View style={styles.separator} />}
              <TouchableOpacity style={styles.row} onPress={() => toggle(diet.key)} activeOpacity={0.6}>
                <Text style={styles.rowEmoji}>{diet.emoji}</Text>
                <Text style={styles.rowLabel}>{diet.label}</Text>
                <Text style={styles.checkmark}>
                  {current.includes(diet.key) ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 16, paddingTop: 16 },
    card: { backgroundColor: t.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 13, minHeight: 44,
    },
    rowEmoji: { fontSize: 18, marginRight: 12 },
    rowLabel: { flex: 1, fontSize: 16, color: t.text },
    checkmark: { fontSize: 17, color: t.accent, fontWeight: '600', width: 24, textAlign: 'right' },
    separator: { height: 0.5, backgroundColor: t.separator, marginLeft: 16 },
    hint: { fontSize: 13, color: t.textTertiary, paddingHorizontal: 4, lineHeight: 18 },
  });
}
