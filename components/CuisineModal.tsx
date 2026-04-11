import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Theme, CuisineOption } from '../types';

const CUISINE_OPTIONS: CuisineOption[] = [
  { label: 'Any', type: null, emoji: '🍽️' },
  { label: 'Breakfast', type: 'breakfast_restaurant', emoji: '🍳' },
  { label: 'Dessert', type: 'dessert_restaurant', emoji: '🍰' },
  { label: 'Bar & Pub', type: 'bar', emoji: '🍺' },
  { label: 'Fast Food', type: 'fast_food_restaurant', emoji: '🍟' },
  { label: 'American', type: 'american_restaurant', emoji: '🍔' },
  { label: 'Chinese', type: 'chinese_restaurant', emoji: '🥡' },
  { label: 'French', type: 'french_restaurant', emoji: '🥐' },
  { label: 'Greek', type: 'greek_restaurant', emoji: '🫒' },
  { label: 'Indian', type: 'indian_restaurant', emoji: '🍛' },
  { label: 'Italian', type: 'italian_restaurant', emoji: '🍝' },
  { label: 'Japanese', type: 'japanese_restaurant', emoji: '🍱' },
  { label: 'Korean', type: 'korean_restaurant', emoji: '🥘' },
  { label: 'Lebanese', type: 'lebanese_restaurant', emoji: '🧆' },
  { label: 'Mediterranean', type: 'mediterranean_restaurant', emoji: '🫙' },
  { label: 'Mexican', type: 'mexican_restaurant', emoji: '🌮' },
  { label: 'Middle Eastern', type: 'middle_eastern_restaurant', emoji: '🥙' },
  { label: 'Pizza', type: 'pizza_restaurant', emoji: '🍕' },
  { label: 'Ramen', type: 'ramen_restaurant', emoji: '🍜' },
  { label: 'Seafood', type: 'seafood_restaurant', emoji: '🦞' },
  { label: 'Steak', type: 'steak_house', emoji: '🥩' },
  { label: 'Sushi', type: 'sushi_restaurant', emoji: '🍣' },
  { label: 'Thai', type: 'thai_restaurant', emoji: '🍲' },
  { label: 'Turkish', type: 'turkish_restaurant', emoji: '🫕' },
  { label: 'Vegan', type: 'vegan_restaurant', emoji: '🌱' },
  { label: 'Vegetarian', type: 'vegetarian_restaurant', emoji: '🥗' },
  { label: 'Vietnamese', type: 'vietnamese_restaurant', emoji: '🫕' },
];

// Pre-compute padded data for 3-column grid
const PADDED_OPTIONS: CuisineOption[] = (() => {
  const rem = CUISINE_OPTIONS.length % 3;
  return rem === 0
    ? CUISINE_OPTIONS
    : [...CUISINE_OPTIONS, ...Array<CuisineOption>(3 - rem).fill({ label: '__filler__', type: '__filler__', emoji: '' })];
})();

export { CUISINE_OPTIONS };

interface CuisineModalProps {
  visible: boolean;
  onClose: () => void;
  cuisineTypes: string[];
  onCuisineTypesChange: (types: string[]) => void;
  noFastFood: boolean;
  onNoFastFoodChange: (val: boolean) => void;
  noConvenienceStore: boolean;
  onNoConvenienceStoreChange: (val: boolean) => void;
}

export default function CuisineModal({
  visible,
  onClose,
  cuisineTypes,
  onCuisineTypesChange,
  noFastFood,
  onNoFastFoodChange,
  noConvenienceStore,
  onNoConvenienceStoreChange,
}: CuisineModalProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.filterToggleSection}>
            <View style={styles.filterToggleRow}>
              <Switch
                value={noFastFood}
                onValueChange={onNoFastFoodChange}
                trackColor={{ false: t.border, true: t.accent }}
                thumbColor="#fff"
              />
              <Text style={styles.filterToggleLabel}>🚫🍟 No Fast Food</Text>
            </View>
            <View style={styles.filterToggleRow}>
              <Switch
                value={noConvenienceStore}
                onValueChange={onNoConvenienceStoreChange}
                trackColor={{ false: t.border, true: t.accent }}
                thumbColor="#fff"
              />
              <Text style={styles.filterToggleLabel}>🚫🏪 No Convenience Stores</Text>
            </View>
          </View>
          <Text style={styles.modalTitle}>What are you in the mood for?</Text>
          <FlatList
            data={PADDED_OPTIONS}
            keyExtractor={(item) => item.label}
            numColumns={3}
            columnWrapperStyle={styles.cuisineGrid}
            renderItem={({ item }) => {
              if (item.type === '__filler__') {
                return <View style={styles.filler} />;
              }
              const active =
                item.type === null
                  ? cuisineTypes.length === 0
                  : cuisineTypes.includes(item.type);
              return (
                <TouchableOpacity
                  style={[styles.cuisineOption, active && styles.cuisineOptionActive]}
                  onPress={() => {
                    if (item.type === null) {
                      onCuisineTypesChange([]);
                    } else {
                      onCuisineTypesChange(
                        cuisineTypes.includes(item.type)
                          ? cuisineTypes.filter((ct) => ct !== item.type)
                          : [...cuisineTypes, item.type],
                      );
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cuisineOptionEmoji}>{item.emoji}</Text>
                  <Text
                    style={[styles.cuisineOptionLabel, active && styles.cuisineOptionLabelActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={styles.cuisineDoneButton} onPress={onClose}>
            <Text style={styles.cuisineDoneText}>
              {cuisineTypes.length > 0
                ? `Show Results (${cuisineTypes.length} selected)`
                : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.overlay,
    },
    modalSheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      maxHeight: '75%',
      paddingBottom: 20,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: t.textTertiary,
      alignSelf: 'center', marginTop: 10, marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20, fontFamily: 'Lora_700Bold', color: t.text,
      marginBottom: 14, letterSpacing: -0.3,
    },
    filterToggleSection: { marginBottom: 12 },
    filterToggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 8, paddingHorizontal: 4,
    },
    filterToggleLabel: { fontSize: 14, fontFamily: 'Raleway_500Medium', color: t.text },
    cuisineGrid: { justifyContent: 'space-between', marginBottom: 10 },
    filler: { flex: 1, marginHorizontal: 3 },
    cuisineOption: {
      flex: 1, marginHorizontal: 3, paddingVertical: 12, borderRadius: 20,
      backgroundColor: t.chipInactive, alignItems: 'center', justifyContent: 'center',
    },
    cuisineOptionActive: { backgroundColor: t.chipActive },
    cuisineOptionEmoji: { fontSize: 24, marginBottom: 4 },
    cuisineOptionLabel: {
      fontSize: 11, fontFamily: 'Raleway_500Medium',
      color: t.chipInactiveText, textAlign: 'center',
    },
    cuisineOptionLabelActive: { color: t.chipActiveText },
    cuisineDoneButton: {
      backgroundColor: t.accent, borderRadius: 24, paddingVertical: 14,
      alignItems: 'center', marginTop: 8, marginBottom: 8,
    },
    cuisineDoneText: { color: '#fff', fontFamily: 'Raleway_600SemiBold', fontSize: 16 },
  });
}
