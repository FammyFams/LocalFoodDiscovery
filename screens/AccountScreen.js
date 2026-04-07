import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';

const APP_VERSION = '1.0.0';
const APP_STORE_URL = null;

const PRICE_OPTIONS = [
  { level: 1, label: '$' },
  { level: 2, label: '$$' },
  { level: 3, label: '$$$' },
  { level: 4, label: '$$$$' },
];

const DIET_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'halal', label: 'Halal', emoji: '🍖' },
  { key: 'kosher', label: 'Kosher', emoji: '✡️' },
  { key: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
];

export default function AccountScreen({ navigation }) {
  const { settings, updateSettings } = useSettings();
  const { clearAll, likedRestaurants, notNowRestaurants } = useRestaurants();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const dietEnabled = settings.dietRestrictionsEnabled || false;
  const dietPrefs = settings.dietPreferences || [];

  function toggleDietEnabled(val) {
    updateSettings({ dietRestrictionsEnabled: val });
    if (!val) updateSettings({ dietPreferences: [] });
  }

  function toggleDiet(key) {
    if (dietPrefs.includes(key)) {
      updateSettings({ dietPreferences: dietPrefs.filter((d) => d !== key) });
    } else {
      updateSettings({ dietPreferences: [...dietPrefs, key] });
    }
  }

  function togglePrice(level) {
    const current = settings.priceRange || [1, 2, 3, 4];
    if (current.includes(level)) {
      if (current.length === 1) return;
      updateSettings({ priceRange: current.filter((p) => p !== level) });
    } else {
      updateSettings({ priceRange: [...current, level].sort() });
    }
  }

  function handleClearData() {
    Alert.alert(
      'Clear All Data',
      `This will remove ${likedRestaurants.length} liked and ${notNowRestaurants.length} passed restaurants.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearAll },
      ]
    );
  }

  function handleShare() {
    Share.share({ message: "Check out foodFinder — swipe to find where to eat! " + (APP_STORE_URL || '') });
  }

  function handleRateApp() {
    if (APP_STORE_URL) Linking.openURL(APP_STORE_URL);
    else Alert.alert('Coming Soon', 'App Store link will be available once the app is published.');
  }

  const s = {
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingHorizontal: 16, paddingTop: 8 },
    section: { marginBottom: 24 },
    sectionHeader: { fontSize: 13, fontWeight: '500', color: t.textTertiary, marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
    card: { backgroundColor: t.card, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, minHeight: 44 },
    rowLabel: { flex: 1, fontSize: 16, color: t.text },
    rowEmoji: { fontSize: 18, marginRight: 12 },
    rowDetail: { fontSize: 15, color: t.textTertiary, marginRight: 6 },
    rowChevron: { fontSize: 20, color: t.textQuaternary, fontWeight: '400' },
    checkmark: { fontSize: 17, color: t.accent, fontWeight: '600', width: 24, textAlign: 'right' },
    destructive: { color: t.destructive },
    separator: { height: 0.5, backgroundColor: t.separator, marginLeft: 16 },
    authRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    authEmoji: { fontSize: 32 },
    authTitle: { fontSize: 17, fontWeight: '600', color: t.text },
    authSub: { fontSize: 13, color: t.textTertiary, marginTop: 2 },
    authButton: { marginHorizontal: 16, marginTop: 8, backgroundColor: t.inputBg, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    authButtonApple: { backgroundColor: settings.darkMode ? '#fff' : '#1C1C1E', marginBottom: 8 },
    authButtonText: { fontSize: 15, fontWeight: '600', color: t.textSecondary },
    authButtonAppleText: { color: settings.darkMode ? '#1C1C1E' : '#fff' },
    authNote: { fontSize: 12, color: t.textQuaternary, textAlign: 'center', paddingBottom: 12 },
    priceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    priceChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: t.inputBg, alignItems: 'center' },
    priceChipActive: { backgroundColor: t.accent },
    priceChipText: { fontSize: 15, fontWeight: '600', color: t.textTertiary },
    priceChipTextActive: { color: '#fff' },
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Appearance */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>APPEARANCE</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Dark Mode</Text>
            <Switch
              value={settings.darkMode}
              onValueChange={(val) => updateSettings({ darkMode: val })}
              trackColor={{ false: '#E5E5EA', true: t.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* Diet Restrictions */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>DIET RESTRICTIONS</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>I have diet restrictions</Text>
            <Switch
              value={dietEnabled}
              onValueChange={toggleDietEnabled}
              trackColor={{ false: '#E5E5EA', true: t.accent }}
              thumbColor="#fff"
            />
          </View>
          {dietEnabled && DIET_OPTIONS.map((diet) => (
            <React.Fragment key={diet.key}>
              <View style={s.separator} />
              <TouchableOpacity style={s.row} onPress={() => toggleDiet(diet.key)} activeOpacity={0.6}>
                <Text style={s.rowEmoji}>{diet.emoji}</Text>
                <Text style={s.rowLabel}>{diet.label}</Text>
                <Text style={s.checkmark}>{dietPrefs.includes(diet.key) ? '✓' : ''}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Price range */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>PRICE RANGE</Text>
        <View style={s.card}>
          <View style={s.priceRow}>
            {PRICE_OPTIONS.map((p) => {
              const active = (settings.priceRange || [1, 2, 3, 4]).includes(p.level);
              return (
                <TouchableOpacity
                  key={p.level}
                  style={[s.priceChip, active && s.priceChipActive]}
                  onPress={() => togglePrice(p.level)}
                  activeOpacity={0.6}
                >
                  <Text style={[s.priceChipText, active && s.priceChipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>ABOUT</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={handleShare} activeOpacity={0.6}>
            <Text style={s.rowLabel}>Share foodFinder</Text>
            <Text style={s.rowChevron}>›</Text>
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={handleRateApp} activeOpacity={0.6}>
            <Text style={s.rowLabel}>Rate on App Store</Text>
            <Text style={s.rowChevron}>›</Text>
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={handleClearData} activeOpacity={0.6}>
            <Text style={[s.rowLabel, s.destructive]}>Clear Saved Data</Text>
            <Text style={s.rowDetail}>{likedRestaurants.length + notNowRestaurants.length} restaurants</Text>
          </TouchableOpacity>
          <View style={s.separator} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Version</Text>
            <Text style={s.rowDetail}>{APP_VERSION}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}
