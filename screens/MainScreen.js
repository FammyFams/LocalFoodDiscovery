import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
  FlatList,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import SwipeCard from '../components/SwipeCard';
import { fetchNearbyRestaurants } from '../services/googlePlaces';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { consumePendingLocation } from '../services/locationBridge';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { trackEvent } from '../services/analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COMPACT_HEADER = SCREEN_WIDTH < 400;

const RADIUS_MIN = 0.5;
const RADIUS_MAX = 5;

const CUISINE_OPTIONS = [
  { label: 'Any', type: null, emoji: '🍽️' },
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

export default function MainScreen({ navigation }) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Current Location');
  const [radius, setRadius] = useState(1);
  const [sliderRadius, setSliderRadius] = useState(1);
  const radiusTimeout = useRef(null);
  const [cuisineTypes, setCuisineTypes] = useState([]);
  const [noFastFood, setNoFastFood] = useState(false);
  const [noConvenienceStore, setNoConvenienceStore] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [cuisineModalVisible, setCuisineModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const {
    likeRestaurant,
    dislikeRestaurant,
    likedRestaurants,
    notNowRestaurants,
    clearAll,
  } = useRestaurants();

  function handleReset() {
    Alert.alert(
      'Reset Everything?',
      'This will clear all your liked and passed restaurants.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { clearAll(); setRestaurants([]); setFetchKey((k) => k + 1); } },
      ]
    );
  }
  const isFetching = useRef(false);
  const offsetIndex = useRef(0);
  const seenIds = useRef(new Set());
  const topCardRef = useRef(null);


  // Systematic offsets so re-fetches cover new ground (3 rings)
  const FETCH_OFFSETS = [
    { lat: 0,      lng: 0      }, // center
    // Inner ring ~900m
    { lat: 0.008,  lng: 0      },
    { lat: -0.008, lng: 0      },
    { lat: 0,      lng: 0.008  },
    { lat: 0,      lng: -0.008 },
    { lat: 0.006,  lng: 0.006  },
    { lat: -0.006, lng: 0.006  },
    { lat: -0.006, lng: -0.006 },
    { lat: 0.006,  lng: -0.006 },
    // Outer ring ~1.8km
    { lat: 0.016,  lng: 0      },
    { lat: -0.016, lng: 0      },
    { lat: 0,      lng: 0.016  },
    { lat: 0,      lng: -0.016 },
    { lat: 0.012,  lng: 0.012  },
    { lat: -0.012, lng: 0.012  },
    { lat: -0.012, lng: -0.012 },
    { lat: 0.012,  lng: -0.012 },
    // Far ring ~2.7km
    { lat: 0.024,  lng: 0      },
    { lat: -0.024, lng: 0      },
    { lat: 0,      lng: 0.024  },
    { lat: 0,      lng: -0.024 },
    { lat: 0.018,  lng: 0.018  },
    { lat: -0.018, lng: 0.018  },
    { lat: -0.018, lng: -0.018 },
    { lat: 0.018,  lng: -0.018 },
  ];
  const [decisionPrompt, setDecisionPrompt] = useState(false);
  const prevLikedCount = useRef(0);
  const likeScale = useRef(new Animated.Value(1)).current;
  const nopeScale = useRef(new Animated.Value(1)).current;

  function animateButton(anim) {
    Animated.sequence([
      Animated.spring(anim, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 20,
      }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  }

  useEffect(() => {
    requestCurrentLocation();
    setShowTutorial(true);
  }, []);

  // Pick up location (and optional radius) set by MapPickerScreen when this screen regains focus
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingLocation();
      if (pending) {
        setLocation(pending.coords);
        setLocationLabel('Selected Location');
        if (pending.radius != null) {
          setRadius(pending.radius);
          setSliderRadius(pending.radius);
        }
      }
    }, []),
  );

  // Show decision prompt every 10 likes
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
      loadRestaurants(
        location,
        radius,
        cuisineTypes,
        noFastFood,
        noConvenienceStore,
      );
    }
  }, [location, radius, cuisineTypes, noFastFood, noConvenienceStore, fetchKey]);

  // ── Location helpers ──────────────────────────────────────────

  async function requestCurrentLocation() {
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
      console.log('GPS coords:', loc.coords.latitude, loc.coords.longitude);
      setLocation(loc.coords);
      setLocationLabel('Current Location');
    } catch (e) {
      setError('Could not get your location. Please try again.');
    }
  }

  async function useCurrentLocation() {
    setLocationModalVisible(false);
    await requestCurrentLocation();
  }

  // ── Restaurant loading ────────────────────────────────────────

  async function loadRestaurants(loc, rad, cuisines, excludeFastFood = false, excludeConvenience = false, append = false) {
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
      console.log('Fetch returned:', results.length, 'restaurants');

      // Only keep places we haven't shown before
      const fresh = results.filter((r) => !seenIds.current.has(r.id));
      fresh.forEach((r) => seenIds.current.add(r.id));

      if (append) {
        setRestaurants((prev) => [...prev, ...fresh]);
      } else {
        setRestaurants(fresh);
      }
    } catch (e) {
      setError(`Failed to load restaurants: ${e.message}`);
    } finally {
      if (!append) setLoading(false);
      isFetching.current = false;
    }
  }

  function handleSwipeRight(restaurant) {
    likeRestaurant(restaurant);
    trackEvent('restaurant_liked', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating,
      price_level: restaurant.priceLevel,
      cuisine: restaurant.tags?.[0],
    });
    removeTopCard(restaurant.id);
  }

  function handleSwipeLeft(restaurant) {
    dislikeRestaurant(restaurant);
    trackEvent('restaurant_skipped', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating,
      price_level: restaurant.priceLevel,
    });
    removeTopCard(restaurant.id);
  }

  function removeTopCard(id) {
    setRestaurants((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      // Check pending (unswiped) count, not raw count
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
  }

  // ── Derived state ─────────────────────────────────────────────

  const actedIds = new Set([
    ...likedRestaurants.map((r) => r.id),
    ...notNowRestaurants.map((r) => r.id),
  ]);
  const pendingRestaurants = restaurants.filter((r) => !actedIds.has(r.id));
  const visibleCards = pendingRestaurants.slice(0, 3);

  // Auto-retry when the queue empties — there may be more results from
  // the next offset / cuisine bucket that haven't been tried yet
  const hasTriedRetry = useRef(false);
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
  }, [pendingRestaurants.length, restaurants.length, location, loading]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: t.bg }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: t.surface, borderBottomColor: t.separator },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: t.text }]}>
            {COMPACT_HEADER ? '🍽️ meso' : 'mesoHungy 🍽️'}
          </Text>
          <View style={styles.headerRight}>
            <View>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setLocationModalVisible(!locationModalVisible)}
              >
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationLabel} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <Text style={styles.locationChevron}>▾</Text>
              </TouchableOpacity>
              {locationModalVisible && (
                <View style={styles.locationDropdown}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={useCurrentLocation}
                  >
                    <Text style={styles.dropdownIcon}>📍</Text>
                    <Text style={styles.dropdownText}>
                      Use Current Location
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setLocationModalVisible(false);
                      navigation.navigate('MapPicker', {
                        initialCoords: location,
                        initialRadius: radius,
                      });
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
              📍{' '}
              {sliderRadius < 1
                ? sliderRadius.toFixed(1)
                : Math.round(sliderRadius)}{' '}
              mi
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
              onValueChange={(val) => {
                setSliderRadius(val);
                clearTimeout(radiusTimeout.current);
                radiusTimeout.current = setTimeout(() => setRadius(val), 400);
              }}
            />
            <Text style={styles.sliderMax}>{RADIUS_MAX} mi</Text>
          </View>
          {(() => {
            const hasFilters = cuisineTypes.length > 0;
            let label, emoji;
            if (cuisineTypes.length === 0) {
              label = 'Any';
              emoji = '🍽️';
            } else if (cuisineTypes.length === 1) {
              const opt = CUISINE_OPTIONS.find(
                (c) => c.type === cuisineTypes[0],
              );
              label = opt?.label ?? 'Custom';
              emoji = opt?.emoji ?? '🍽️';
            } else {
              label = `${cuisineTypes.length} Cuisines`;
              emoji = '🍽️';
            }
            return (
              <TouchableOpacity
                style={[
                  styles.cuisineChip,
                  hasFilters && styles.cuisineChipActive,
                ]}
                onPress={() => setCuisineModalVisible(true)}
              >
                <Text
                  style={[
                    styles.cuisineChipText,
                    hasFilters && { color: '#fff' },
                  ]}
                >
                  {emoji} {label}
                </Text>
                <Text
                  style={[
                    styles.cuisineChevron,
                    hasFilters && { color: 'rgba(255,255,255,0.6)' },
                  ]}
                >
                  ▾
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      </View>

      {/* Card area */}
      <View style={styles.cardArea}>
        {loading && restaurants.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={t.accent} />
            <Text style={styles.loadingText}>Finding places near you...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>😕</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={requestCurrentLocation}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : !location ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>📍</Text>
            <Text style={styles.errorText}>
              We need your location to find nearby restaurants.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={requestCurrentLocation}
            >
              <Text style={styles.retryText}>Allow Location</Text>
            </TouchableOpacity>
          </View>
        ) : pendingRestaurants.length === 0 && loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={t.accent} />
            <Text style={styles.loadingText}>Searching for more places...</Text>
          </View>
        ) : pendingRestaurants.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>
              You've seen all nearby places!
            </Text>
            <Text style={styles.emptySubtitle}>
              Try one of these to find more:
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={styles.emptyActionIcon}>📍</Text>
              <View style={styles.emptyActionText}>
                <Text style={styles.emptyActionTitle}>Update Location</Text>
                <Text style={styles.emptyActionSub}>
                  Search in a different area
                </Text>
              </View>
              <Text style={styles.emptyActionChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('Liked')}
            >
              <Text style={styles.emptyActionIcon}>💚</Text>
              <View style={styles.emptyActionText}>
                <Text style={styles.emptyActionTitle}>Review Liked Places</Text>
                <Text style={styles.emptyActionSub}>
                  Pick somewhere you already saved
                </Text>
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
                  Currently set to{' '}
                  {sliderRadius < 1
                    ? sliderRadius.toFixed(1)
                    : Math.round(sliderRadius)}{' '}
                  mi — tap to expand
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
                onPress={(r) =>
                  navigation.navigate('Detail', { restaurant: r })
                }
              />
            );
          })
        )}
      </View>

      {/* Action buttons */}
      {pendingRestaurants.length > 0 && !loading && (
        <View
          style={[
            styles.actionRow,
            { backgroundColor: t.surface, borderTopColor: t.separator },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: nopeScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.nopeButton]}
              onPress={() => {
                animateButton(nopeScale);
                topCardRef.current?.swipeLeft();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.nopeButtonText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => {
                animateButton(likeScale);
                topCardRef.current?.swipeRight();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.likeButtonText}>♥</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Decision prompt — shown every 10 likes */}
      <Modal
        visible={decisionPrompt}
        transparent
        animationType='fade'
        onRequestClose={() => setDecisionPrompt(false)}
      >
        <View style={styles.decisionOverlay}>
          <View style={styles.decisionSheet}>
            <Text style={styles.decisionEmoji}>🎉</Text>
            <Text style={styles.decisionTitle}>
              You've liked {likedRestaurants.length} places!
            </Text>
            <Text style={styles.decisionSub}>
              Ready to pick where to eat? Browse your saved spots and decide.
            </Text>

            {/* Preview row of liked restaurant images */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.previewRow}
            >
              {likedRestaurants.slice(0, 6).map((r) => (
                <View key={r.id} style={styles.previewItem}>
                  {r.images?.[0] ? (
                    <Image
                      source={{ uri: r.images[0] }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View
                      style={[styles.previewImage, styles.previewPlaceholder]}
                    >
                      <Text>🍽️</Text>
                    </View>
                  )}
                  <Text style={styles.previewName} numberOfLines={1}>
                    {r.name}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.decisionGoButton}
              onPress={() => {
                setDecisionPrompt(false);
                navigation.navigate('Decision');
              }}
            >
              <Text style={styles.decisionGoText}>Swipe to Decide →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDecisionPrompt(false)}
              style={styles.decisionDismiss}
            >
              <Text style={styles.decisionDismissText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Backdrop to close location dropdown */}
      {locationModalVisible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setLocationModalVisible(false)}
        />
      )}

      {/* Cuisine picker modal */}
      <Modal
        visible={cuisineModalVisible}
        animationType='slide'
        transparent
        onRequestClose={() => setCuisineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCuisineModalVisible(false)}
          />
          <View style={[styles.modalSheet, styles.cuisineSheet]}>
            <View style={styles.modalHandle} />
            <View style={styles.filterToggleSection}>
              <View style={styles.filterToggleRow}>
                <Switch
                  value={noFastFood}
                  onValueChange={setNoFastFood}
                  trackColor={{ false: t.border, true: t.accent }}
                  thumbColor='#fff'
                />
                <Text style={styles.filterToggleLabel}>🚫🍟 No Fast Food</Text>
              </View>
              <View style={styles.filterToggleRow}>
                <Switch
                  value={noConvenienceStore}
                  onValueChange={setNoConvenienceStore}
                  trackColor={{ false: t.border, true: t.accent }}
                  thumbColor='#fff'
                />
                <Text style={styles.filterToggleLabel}>
                  🚫🏪 No Convenience Stores
                </Text>
              </View>
            </View>
            <Text style={styles.modalTitle}>What are you in the mood for?</Text>
            <FlatList
              data={CUISINE_OPTIONS}
              keyExtractor={(item) => item.label}
              numColumns={3}
              columnWrapperStyle={styles.cuisineGrid}
              renderItem={({ item }) => {
                const active =
                  item.type === null
                    ? cuisineTypes.length === 0
                    : cuisineTypes.includes(item.type);
                return (
                  <TouchableOpacity
                    style={[
                      styles.cuisineOption,
                      active && styles.cuisineOptionActive,
                    ]}
                    onPress={() => {
                      if (item.type === null) {
                        setCuisineTypes([]);
                      } else {
                        setCuisineTypes((prev) =>
                          prev.includes(item.type)
                            ? prev.filter((t) => t !== item.type)
                            : [...prev, item.type],
                        );
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cuisineOptionEmoji}>{item.emoji}</Text>
                    <Text
                      style={[
                        styles.cuisineOptionLabel,
                        active && styles.cuisineOptionLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.cuisineDoneButton}
              onPress={() => setCuisineModalVisible(false)}
            >
              <Text style={styles.cuisineDoneText}>
                {cuisineTypes.length > 0
                  ? `Show Results (${cuisineTypes.length} selected)`
                  : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* First-time tutorial overlay */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <BlurView intensity={30} tint="dark" style={styles.tutorialOverlay}>
          <View style={styles.tutorialContent}>
            <Text style={styles.tutorialEmoji}>🤔</Text>
            <Text style={styles.tutorialTitle}>Don't know where to eat?</Text>
            <Text style={styles.tutorialText}>
              Swipe right to save a restaurant you'd like to try.{'\n'}
              Swipe left to skip it.
            </Text>
            <Text style={styles.tutorialArrow}>↓</Text>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => {
                setShowTutorial(false);
              }}
            >
              <Text style={styles.tutorialButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },

    // Header
    header: {
      paddingTop: 1,
      paddingHorizontal: 16,
      paddingBottom: 4,
      backgroundColor: t.surface,
      borderBottomWidth: 0,
      zIndex: 100,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: COMPACT_HEADER ? 20 : 24,
      fontFamily: 'Lora_700Bold',
      color: t.text,
      letterSpacing: -0.5,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: t.inputBg,
      borderRadius: 20,
      paddingHorizontal: 1,
      paddingVertical: 7,
    },
    resetButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: t.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resetButtonText: { fontSize: 14, color: '#fff', fontWeight: '700' },
    locationIcon: { fontSize: 12 },
    locationLabel: { fontSize: 13, fontFamily: 'Raleway_500Medium', color: t.textSecondary },
    locationChevron: { fontSize: 10, color: t.textTertiary },
    locationDropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 4,
      backgroundColor: t.surface,
      borderRadius: 20,
      width: 240,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 8,
      zIndex: 100,
      overflow: 'hidden',
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownIcon: { fontSize: 16 },
    dropdownText: { fontSize: 15, fontFamily: 'Raleway_400Regular', color: t.text },
    dropdownDivider: {
      height: 0.5,
      backgroundColor: t.separator,
      marginLeft: 42,
    },
    filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sliderRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    slider: { flex: 1, height: 36 },
    sliderLabel: {
      fontSize: 12,
      fontFamily: 'Raleway_600SemiBold',
      color: t.text,
      minWidth: 42,
    },
    sliderMax: {
      fontSize: 11,
      color: t.textTertiary,
      minWidth: 38,
      textAlign: 'right',
    },
    filterToggleSection: { marginBottom: 12 },
    filterToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    filterToggleLabel: { fontSize: 14, fontFamily: 'Raleway_500Medium', color: t.text },
    cuisineChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: t.chipInactive,
    },
    cuisineChipActive: { backgroundColor: t.chipActive },
    cuisineChipText: {
      fontSize: 13,
      fontFamily: 'Raleway_500Medium',
      color: t.chipInactiveText,
    },
    cuisineChevron: { fontSize: 10, color: t.textTertiary },
    cuisineSheet: { maxHeight: '75%', paddingBottom: 20 },
    cuisineDoneButton: {
      backgroundColor: t.accent,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    cuisineDoneText: { color: '#fff', fontFamily: 'Raleway_600SemiBold', fontSize: 16 },
    cuisineGrid: { justifyContent: 'space-between', marginBottom: 10 },
    cuisineOption: {
      flex: 1,
      marginHorizontal: 3,
      paddingVertical: 12,
      borderRadius: 20,
      backgroundColor: t.chipInactive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cuisineOptionActive: { backgroundColor: t.chipActive },
    cuisineOptionEmoji: { fontSize: 24, marginBottom: 4 },
    cuisineOptionLabel: {
      fontSize: 11,
      fontFamily: 'Raleway_500Medium',
      color: t.chipInactiveText,
      textAlign: 'center',
    },
    cuisineOptionLabelActive: { color: t.chipActiveText },

    // Card area
    cardArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, paddingBottom: 80 },
    centered: { alignItems: 'center', paddingHorizontal: 36 },
    loadingText: { marginTop: 16, fontSize: 15, color: t.textTertiary },
    errorEmoji: { fontSize: 48, marginBottom: 12 },
    errorText: {
      fontSize: 15,
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Lora_700Bold',
      color: t.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 14,
      color: t.textTertiary,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.card,
      borderRadius: 20,
      padding: 14,
      marginBottom: 8,
      width: '100%',
    },
    emptyActionIcon: { fontSize: 22 },
    emptyActionText: { flex: 1 },
    emptyActionTitle: {
      fontSize: 15,
      fontFamily: 'Raleway_600SemiBold',
      color: t.text,
      marginBottom: 2,
    },
    emptyActionSub: { fontSize: 12, color: t.textTertiary },
    emptyActionChevron: { fontSize: 18, color: t.border, fontWeight: '600' },
    retryButton: {
      backgroundColor: t.accent,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: 22,
    },
    retryText: { color: '#fff', fontFamily: 'Raleway_600SemiBold', fontSize: 16 },

    // Action buttons
    actionRow: {
      position: 'absolute',
      bottom: 16,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 40,
      backgroundColor: 'transparent',
      zIndex: 20,
    },
    actionButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 2,
    },
    nopeButton: {
      backgroundColor: t.card,
      borderWidth: 2.5,
      borderColor: t.red,
    },
    likeButton: {
      backgroundColor: t.card,
      borderWidth: 2.5,
      borderColor: t.green,
    },
    nopeButtonText: { fontSize: 24, fontWeight: '600', color: t.red },
    likeButtonText: { fontSize: 24, fontWeight: '600', color: t.green },

    // Modal (cuisine picker)
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
      paddingBottom: 40,
      maxHeight: '80%',
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Lora_700Bold',
      color: t.text,
      marginBottom: 14,
      letterSpacing: -0.3,
    },
    // Decision prompt
    decisionOverlay: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    decisionSheet: {
      backgroundColor: t.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      alignItems: 'center',
    },
    decisionEmoji: { fontSize: 44, marginBottom: 12 },
    decisionTitle: {
      fontSize: 20,
      fontFamily: 'Lora_700Bold',
      color: t.text,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    decisionSub: {
      fontSize: 14,
      color: t.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    previewRow: { marginBottom: 20, alignSelf: 'stretch' },
    previewItem: { alignItems: 'center', marginRight: 12, width: 68 },
    previewImage: { width: 68, height: 68, borderRadius: 20, marginBottom: 4 },
    previewPlaceholder: {
      backgroundColor: t.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewName: { fontSize: 11, color: t.textTertiary, textAlign: 'center' },
    decisionGoButton: {
      backgroundColor: t.accent,
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 32,
      width: '100%',
      alignItems: 'center',
      marginBottom: 10,
    },
    decisionGoText: { color: '#fff', fontFamily: 'Raleway_600SemiBold', fontSize: 16 },
    decisionDismiss: { paddingVertical: 8 },
    decisionDismissText: {
      color: t.textTertiary,
      fontSize: 14,
      fontWeight: '500',
    },

    // Tutorial overlay
    tutorialOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 200,
    },
    tutorialContent: { alignItems: 'center', paddingHorizontal: 40 },
    tutorialEmoji: { fontSize: 44, marginBottom: 12 },
    tutorialTitle: {
      fontSize: 38,
      fontFamily: 'Lora_700Bold',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 10,
      letterSpacing: -0.3,
    },
    tutorialText: {
      fontSize: 26,
      fontFamily: 'Raleway_400Regular',
      color: 'rgba(255,255,255,0.75)',
      textAlign: 'center',
      lineHeight: 36,
      marginBottom: 16,
    },
    tutorialArrow: { fontSize: 32, color: '#fff', marginBottom: 20 },
    tutorialButton: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 48,
    },
    tutorialButtonText: { color: t.text, fontFamily: 'Raleway_600SemiBold', fontSize: 17 },
  });
}
