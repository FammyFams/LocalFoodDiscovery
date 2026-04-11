import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import SwipeCard from '../components/SwipeCard';
import CrossedForks from '../components/CrossedForks';
import CuisineModal, { CUISINE_OPTIONS } from '../components/CuisineModal';
import TutorialOverlay from '../components/TutorialOverlay';
import DecisionPromptModal from '../components/DecisionPromptModal';
import { fetchNearbyRestaurants } from '../services/googlePlaces';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { trackEvent } from '../services/analytics';
import type { Restaurant, Theme } from '../types';
import type { SwipeCardRef } from '../components/SwipeCard';

const RADIUS_MIN = 0.5;
const RADIUS_MAX = 5;

// Systematic offsets so re-fetches cover new ground (3 rings)
const FETCH_OFFSETS = [
  { lat: 0,      lng: 0      },
  { lat: 0.008,  lng: 0      },
  { lat: -0.008, lng: 0      },
  { lat: 0,      lng: 0.008  },
  { lat: 0,      lng: -0.008 },
  { lat: 0.006,  lng: 0.006  },
  { lat: -0.006, lng: 0.006  },
  { lat: -0.006, lng: -0.006 },
  { lat: 0.006,  lng: -0.006 },
  { lat: 0.016,  lng: 0      },
  { lat: -0.016, lng: 0      },
  { lat: 0,      lng: 0.016  },
  { lat: 0,      lng: -0.016 },
  { lat: 0.012,  lng: 0.012  },
  { lat: -0.012, lng: 0.012  },
  { lat: -0.012, lng: -0.012 },
  { lat: 0.012,  lng: -0.012 },
  { lat: 0.024,  lng: 0      },
  { lat: -0.024, lng: 0      },
  { lat: 0,      lng: 0.024  },
  { lat: 0,      lng: -0.024 },
  { lat: 0.018,  lng: 0.018  },
  { lat: -0.018, lng: 0.018  },
  { lat: -0.018, lng: -0.018 },
  { lat: 0.018,  lng: -0.018 },
];

interface Coords {
  latitude: number;
  longitude: number;
}

export default function MainScreen({ navigation, route }: { navigation: any; route: any }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const compactHeader = screenWidth < 400;
  const styles = useThemedStyles(createStyles);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Coords | null>(null);
  const [locationLabel, setLocationLabel] = useState('Current Location');
  const [radius, setRadius] = useState(1);
  const [sliderRadius, setSliderRadius] = useState(1);
  const radiusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [noFastFood, setNoFastFood] = useState(false);
  const [noConvenienceStore, setNoConvenienceStore] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [cuisineModalVisible, setCuisineModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [decisionPrompt, setDecisionPrompt] = useState(false);

  const {
    likeRestaurant,
    dislikeRestaurant,
    likedRestaurants,
    notNowRestaurants,
    clearAll,
  } = useRestaurants();

  const isFetching = useRef(false);
  const offsetIndex = useRef(0);
  const seenIds = useRef(new Set<string>());
  const topCardRef = useRef<SwipeCardRef>(null);
  const prevLikedCount = useRef(0);
  const hasTriedRetry = useRef(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const nopeScale = useRef(new Animated.Value(1)).current;

  // ── Derived state (memoized) ──────────────────────────────────
  const actedIds = useMemo(
    () => new Set([
      ...likedRestaurants.map((r) => r.id),
      ...notNowRestaurants.map((r) => r.id),
    ]),
    [likedRestaurants, notNowRestaurants],
  );
  const pendingRestaurants = useMemo(
    () => restaurants.filter((r) => !actedIds.has(r.id)),
    [restaurants, actedIds],
  );
  const visibleCards = pendingRestaurants.slice(0, 3);

  // ── Button animation ──────────────────────────────────────────
  const animateButton = useCallback((anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 20 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  }, []);

  // ── Location helpers ──────────────────────────────────────────
  const requestCurrentLocation = useCallback(async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Please enable it in Settings.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc.coords);
      setLocationLabel('Current Location');
    } catch {
      setError('Could not get your location. Please try again.');
    }
  }, []);

  const useCurrentLocation = useCallback(async () => {
    setLocationModalVisible(false);
    await requestCurrentLocation();
  }, [requestCurrentLocation]);

  // ── Restaurant loading ────────────────────────────────────────
  const loadRestaurants = useCallback(async (
    loc: Coords,
    rad: number,
    cuisines: string[],
    excludeFastFood = false,
    excludeConvenience = false,
    append = false,
  ) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (!append) {
      offsetIndex.current = 0;
      seenIds.current = new Set();
      setLoading(true);
    }
    setError(null);
    try {
      const offset = FETCH_OFFSETS[offsetIndex.current % FETCH_OFFSETS.length];
      offsetIndex.current += 1;

      const results = await fetchNearbyRestaurants({
        latitude: loc.latitude + offset.lat,
        longitude: loc.longitude + offset.lng,
        radiusMiles: rad,
        cuisineTypes: cuisines,
        noFastFood: excludeFastFood,
        noConvenienceStore: excludeConvenience,
      });
      const fresh = results.filter((r) => !seenIds.current.has(r.id));
      fresh.forEach((r) => seenIds.current.add(r.id));

      if (append) {
        setRestaurants((prev) => [...prev, ...fresh]);
      } else {
        setRestaurants(fresh);
      }
    } catch (e: any) {
      setError(`Failed to load restaurants: ${e.message}`);
    } finally {
      if (!append) setLoading(false);
      isFetching.current = false;
    }
  }, []);

  // ── Swipe handlers ────────────────────────────────────────────
  const handleSwipeRight = useCallback((restaurant: Restaurant) => {
    likeRestaurant(restaurant);
    trackEvent('restaurant_liked', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating,
      price_level: restaurant.priceLevel,
      tags: restaurant.tags,
      open_now: restaurant.openNow,
    });
    removeTopCard(restaurant.id);
  }, [likeRestaurant]);

  const handleSwipeLeft = useCallback((restaurant: Restaurant) => {
    dislikeRestaurant(restaurant);
    trackEvent('restaurant_skipped', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating,
      price_level: restaurant.priceLevel,
      tags: restaurant.tags,
      open_now: restaurant.openNow,
    });
    removeTopCard(restaurant.id);
  }, [dislikeRestaurant]);

  const removeTopCard = useCallback((id: string) => {
    setRestaurants((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      const acted = new Set([
        ...likedRestaurants.map((r) => r.id),
        ...notNowRestaurants.map((r) => r.id),
      ]);
      const pending = remaining.filter((r) => !acted.has(r.id));
      if (pending.length < 5 && location && !isFetching.current) {
        loadRestaurants(location, radius, cuisineTypes, noFastFood, noConvenienceStore, true);
      }
      return remaining;
    });
  }, [likedRestaurants, notNowRestaurants, location, radius, cuisineTypes, noFastFood, noConvenienceStore, loadRestaurants]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Everything?',
      'This will clear all your liked and passed restaurants.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { clearAll(); setRestaurants([]); setFetchKey((k) => k + 1); } },
      ],
    );
  }, [clearAll]);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    requestCurrentLocation();
    setShowTutorial(true);
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (route.params?.pickedLocation) {
      setLocation(route.params.pickedLocation);
      setLocationLabel('Selected Location');
      if (route.params?.pickedRadius != null) {
        setRadius(route.params.pickedRadius);
        setSliderRadius(route.params.pickedRadius);
      }
      navigation.setParams({ pickedLocation: undefined, pickedRadius: undefined });
    }
  }, [route.params?.pickedLocation]);

  useEffect(() => {
    const count = likedRestaurants.length;
    if (count > 0 && count % 10 === 0 && count !== prevLikedCount.current) {
      setDecisionPrompt(true);
    }
    prevLikedCount.current = count;
  }, [likedRestaurants.length]);

  useEffect(() => {
    if (location) {
      setRestaurants([]);
      loadRestaurants(location, radius, cuisineTypes, noFastFood, noConvenienceStore);
    }
  }, [location, radius, cuisineTypes, noFastFood, noConvenienceStore, fetchKey, loadRestaurants]);

  useEffect(() => {
    if (pendingRestaurants.length === 0 && restaurants.length > 0 && location && !loading && !isFetching.current) {
      if (!hasTriedRetry.current) {
        hasTriedRetry.current = true;
        setLoading(true);
        loadRestaurants(location, radius, cuisineTypes, noFastFood, noConvenienceStore, true).finally(() => setLoading(false));
      }
    }
    if (pendingRestaurants.length > 0) {
      hasTriedRetry.current = false;
    }
  }, [pendingRestaurants.length, restaurants.length, location, loading, radius, cuisineTypes, noFastFood, noConvenienceStore, loadRestaurants]);

  // ── Cuisine chip label ────────────────────────────────────────
  const cuisineChipInfo = useMemo(() => {
    if (cuisineTypes.length === 0) return { label: 'Any', emoji: '🍽️', hasFilters: false };
    if (cuisineTypes.length === 1) {
      const opt = CUISINE_OPTIONS.find((c) => c.type === cuisineTypes[0]);
      return { label: opt?.label ?? 'Custom', emoji: opt?.emoji ?? '🍽️', hasFilters: true };
    }
    return { label: `${cuisineTypes.length} Cuisines`, emoji: '🍽️', hasFilters: true };
  }, [cuisineTypes]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            {compactHeader ? '🍽️ meso' : 'mesoHungy 🍽️'}
          </Text>
          <View style={styles.headerRight}>
            <View>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setLocationModalVisible((v) => !v)}
              >
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationLabel} numberOfLines={1}>{locationLabel}</Text>
                <Text style={styles.locationChevron}>▾</Text>
              </TouchableOpacity>
              {locationModalVisible && (
                <View style={styles.locationDropdown}>
                  <TouchableOpacity style={styles.dropdownItem} onPress={useCurrentLocation}>
                    <Text style={styles.dropdownIcon}>📍</Text>
                    <Text style={styles.dropdownText}>Use Current Location</Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setLocationModalVisible(false);
                      navigation.navigate('MapPicker', { initialCoords: location, initialRadius: radius });
                    }}
                  >
                    <Text style={styles.dropdownIcon}>🗺️</Text>
                    <Text style={styles.dropdownText}>Pick on Map</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>↺</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.filtersRow}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>
              📍 {sliderRadius < 1 ? sliderRadius.toFixed(1) : Math.round(sliderRadius)} mi
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={RADIUS_MIN}
              maximumValue={RADIUS_MAX}
              value={sliderRadius}
              step={0.5}
              minimumTrackTintColor={t.accent}
              maximumTrackTintColor={t.border}
              thumbTintColor={t.accent}
              onValueChange={(val: number) => {
                setSliderRadius(val);
                if (radiusTimeout.current) clearTimeout(radiusTimeout.current);
                radiusTimeout.current = setTimeout(() => setRadius(val), 400);
              }}
            />
            <Text style={styles.sliderMax}>{RADIUS_MAX} mi</Text>
          </View>
          <TouchableOpacity
            style={[styles.cuisineChip, cuisineChipInfo.hasFilters && styles.cuisineChipActive]}
            onPress={() => setCuisineModalVisible(true)}
          >
            <Text style={[styles.cuisineChipText, cuisineChipInfo.hasFilters && { color: '#fff' }]}>
              {cuisineChipInfo.emoji} {cuisineChipInfo.label}
            </Text>
            <Text style={[styles.cuisineChevron, cuisineChipInfo.hasFilters && { color: 'rgba(255,255,255,0.6)' }]}>
              ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card area */}
      <View style={styles.cardArea}>
        {loading && restaurants.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={t.accent} />
            <Text style={styles.loadingText}>Finding places near you...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>😕</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestCurrentLocation}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : !location ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>📍</Text>
            <Text style={styles.errorText}>We need your location to find nearby restaurants.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestCurrentLocation}>
              <Text style={styles.retryText}>Allow Location</Text>
            </TouchableOpacity>
          </View>
        ) : pendingRestaurants.length === 0 && loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={t.accent} />
            <Text style={styles.loadingText}>Searching for more places...</Text>
          </View>
        ) : pendingRestaurants.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>You've seen all nearby places!</Text>
            <Text style={styles.emptySubtitle}>Try one of these to find more:</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setLocationModalVisible(true)}>
              <Text style={styles.emptyActionIcon}>📍</Text>
              <View style={styles.emptyActionText}>
                <Text style={styles.emptyActionTitle}>Update Location</Text>
                <Text style={styles.emptyActionSub}>Search in a different area</Text>
              </View>
              <Text style={styles.emptyActionChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emptyAction} onPress={() => navigation.navigate('Liked')}>
              <Text style={styles.emptyActionIcon}>💚</Text>
              <View style={styles.emptyActionText}>
                <Text style={styles.emptyActionTitle}>Review Liked Places</Text>
                <Text style={styles.emptyActionSub}>Pick somewhere you already saved</Text>
              </View>
              <Text style={styles.emptyActionChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => {
                const newR = Math.min(radius + 1, RADIUS_MAX);
                setRadius(newR);
                setSliderRadius(newR);
              }}
            >
              <Text style={styles.emptyActionIcon}>📏</Text>
              <View style={styles.emptyActionText}>
                <Text style={styles.emptyActionTitle}>Increase Distance</Text>
                <Text style={styles.emptyActionSub}>
                  Currently set to {sliderRadius < 1 ? sliderRadius.toFixed(1) : Math.round(sliderRadius)} mi — tap to expand
                </Text>
              </View>
              <Text style={styles.emptyActionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        ) : (
          [...visibleCards].reverse().map((restaurant, reverseIndex) => {
            const index = visibleCards.length - 1 - reverseIndex;
            return (
              <SwipeCard
                key={restaurant.id}
                ref={index === 0 ? topCardRef : null}
                restaurant={restaurant}
                isTop={index === 0}
                index={index}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onPress={(r) => navigation.navigate('Detail', { restaurant: r })}
              />
            );
          })
        )}
      </View>

      {/* Action buttons */}
      {pendingRestaurants.length > 0 && !loading && (
        <View style={styles.actionRow}>
          <Animated.View style={{ transform: [{ scale: nopeScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.nopeButton]}
              onPress={() => { animateButton(nopeScale); topCardRef.current?.swipeLeft(); }}
              activeOpacity={0.8}
            >
              <CrossedForks size={28} color={t.red} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => { animateButton(likeScale); topCardRef.current?.swipeRight(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.likeButtonText}>♥</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Decision prompt */}
      <DecisionPromptModal
        visible={decisionPrompt}
        likedRestaurants={likedRestaurants}
        onGoToDecision={() => {
          setDecisionPrompt(false);
          trackEvent('decision_screen_opened', { liked_count: likedRestaurants.length });
          navigation.navigate('Decision');
        }}
        onDismiss={() => setDecisionPrompt(false)}
      />

      {/* Backdrop to close location dropdown */}
      {locationModalVisible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setLocationModalVisible(false)}
        />
      )}

      {/* Cuisine picker */}
      <CuisineModal
        visible={cuisineModalVisible}
        onClose={() => setCuisineModalVisible(false)}
        cuisineTypes={cuisineTypes}
        onCuisineTypesChange={setCuisineTypes}
        noFastFood={noFastFood}
        onNoFastFoodChange={setNoFastFood}
        noConvenienceStore={noConvenienceStore}
        onNoConvenienceStoreChange={setNoConvenienceStore}
      />

      {/* Tutorial */}
      <TutorialOverlay visible={showTutorial} onDismiss={() => setShowTutorial(false)} />
    </SafeAreaView>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },

    header: {
      paddingTop: 1, paddingHorizontal: 16, paddingBottom: 4,
      backgroundColor: t.surface, borderBottomWidth: 0, zIndex: 100,
    },
    headerTop: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 4,
    },
    headerTitle: {
      fontSize: 24, fontFamily: 'Lora_700Bold',
      color: t.text, letterSpacing: -0.5,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationButton: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: t.inputBg, borderRadius: 20,
      paddingHorizontal: 1, paddingVertical: 7,
    },
    resetButton: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
    },
    resetButtonText: { fontSize: 14, color: '#fff', fontWeight: '700' },
    locationIcon: { fontSize: 12 },
    locationLabel: { fontSize: 13, fontFamily: 'Raleway_500Medium', color: t.textSecondary },
    locationChevron: { fontSize: 10, color: t.textTertiary },
    locationDropdown: {
      position: 'absolute', top: '100%', right: 0, marginTop: 4,
      backgroundColor: t.surface, borderRadius: 20, width: 240,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08, shadowRadius: 32, elevation: 8,
      zIndex: 100, overflow: 'hidden',
    },
    dropdownItem: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    dropdownIcon: { fontSize: 16 },
    dropdownText: { fontSize: 15, fontFamily: 'Raleway_400Regular', color: t.text },
    dropdownDivider: { height: 0.5, backgroundColor: t.separator, marginLeft: 42 },
    filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sliderRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    slider: { flex: 1, height: 36 },
    sliderLabel: { fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: t.text, minWidth: 42 },
    sliderMax: { fontSize: 11, color: t.textTertiary, minWidth: 38, textAlign: 'right' },
    cuisineChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: t.chipInactive,
    },
    cuisineChipActive: { backgroundColor: t.chipActive },
    cuisineChipText: { fontSize: 13, fontFamily: 'Raleway_500Medium', color: t.chipInactiveText },
    cuisineChevron: { fontSize: 10, color: t.textTertiary },

    cardArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, paddingBottom: 80 },
    centered: { alignItems: 'center', paddingHorizontal: 36 },
    loadingText: { marginTop: 16, fontSize: 15, color: t.textTertiary },
    errorEmoji: { fontSize: 48, marginBottom: 12 },
    errorText: {
      fontSize: 15, color: t.textSecondary, textAlign: 'center',
      lineHeight: 22, marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20, fontFamily: 'Lora_700Bold', color: t.text,
      textAlign: 'center', marginBottom: 6,
    },
    emptySubtitle: { fontSize: 14, color: t.textTertiary, textAlign: 'center', marginBottom: 24 },
    emptyAction: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: t.card, borderRadius: 20, padding: 14,
      marginBottom: 8, width: '100%',
    },
    emptyActionIcon: { fontSize: 22 },
    emptyActionText: { flex: 1 },
    emptyActionTitle: { fontSize: 15, fontFamily: 'Raleway_600SemiBold', color: t.text, marginBottom: 2 },
    emptyActionSub: { fontSize: 12, color: t.textTertiary },
    emptyActionChevron: { fontSize: 18, color: t.textSecondary, fontWeight: '600' },
    retryButton: {
      backgroundColor: t.accent, paddingHorizontal: 28,
      paddingVertical: 12, borderRadius: 22,
    },
    retryText: { color: '#fff', fontFamily: 'Raleway_600SemiBold', fontSize: 16 },

    actionRow: {
      position: 'absolute', bottom: 16, left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'center', gap: 40,
      backgroundColor: 'transparent', zIndex: 20,
    },
    actionButton: {
      width: 60, height: 60, borderRadius: 30,
      justifyContent: 'center', alignItems: 'center', backgroundColor: t.card,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 16, elevation: 2,
    },
    nopeButton: { backgroundColor: t.card, borderWidth: 2.5, borderColor: t.red },
    likeButton: { backgroundColor: t.card, borderWidth: 2.5, borderColor: t.green },
    likeButtonText: { fontSize: 24, fontWeight: '600', color: t.green },
  });
}
