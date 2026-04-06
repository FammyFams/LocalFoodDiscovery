import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import SwipeCard from '../components/SwipeCard';
import { fetchNearbyRestaurants } from '../services/googlePlaces';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { consumePendingLocation } from '../services/locationBridge';
import { useRestaurants } from '../context/RestaurantContext';

const RADIUS_MIN = 0.5;
const RADIUS_MAX = 5;

const CUISINE_OPTIONS = [
  { label: 'Any', type: null, emoji: '🍽️' },
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
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Current Location');
  const [radius, setRadius] = useState(1);
  const [sliderRadius, setSliderRadius] = useState(1);
  const radiusTimeout = useRef(null);
  const [cuisineType, setCuisineType] = useState(null);
  const [cuisineModalVisible, setCuisineModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const { likeRestaurant, dislikeRestaurant, likedRestaurants, notNowRestaurants, clearAll } = useRestaurants();

  function handleReset() {
    Alert.alert(
      'Reset Everything?',
      'This will clear all your liked and passed restaurants.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { clearAll(); setRestaurants([]); if (location) loadRestaurants(location, radius, cuisineType); } },
      ]
    );
  }
  const isFetching = useRef(false);
  const topCardRef = useRef(null);
  const [decisionPrompt, setDecisionPrompt] = useState(false);
  const prevLikedCount = useRef(0);
  const likeScale = useRef(new Animated.Value(1)).current;
  const nopeScale = useRef(new Animated.Value(1)).current;

  function animateButton(anim) {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 20 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  }

  useEffect(() => {
    requestCurrentLocation();
  }, []);

  // Pick up location (and optional radius) set by MapPickerScreen when this screen regains focus
  useFocusEffect(useCallback(() => {
    const pending = consumePendingLocation();
    if (pending) {
      setLocation(pending.coords);
      setLocationLabel('Selected Location');
      if (pending.radius != null) {
        setRadius(pending.radius);
        setSliderRadius(pending.radius);
      }
    }
  }, []));

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
      loadRestaurants(location, radius, cuisineType);
    }
  }, [location, radius, cuisineType]);

  // ── Location helpers ──────────────────────────────────────────

  async function requestCurrentLocation() {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Please enable it in Settings.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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

  async function loadRestaurants(loc, rad, cuisine) {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchNearbyRestaurants({
        latitude: loc.latitude,
        longitude: loc.longitude,
        radiusMiles: rad,
        cuisineType: cuisine,
      });
      setRestaurants(results);
    } catch (e) {
      setError(`Failed to load restaurants: ${e.message}`);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }

  function handleSwipeRight(restaurant) {
    likeRestaurant(restaurant);
    removeTopCard(restaurant.id);
  }

  function handleSwipeLeft(restaurant) {
    dislikeRestaurant(restaurant);
    removeTopCard(restaurant.id);
  }

function removeTopCard(id) {
    setRestaurants((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      if (remaining.length < 5 && location && !isFetching.current) {
        loadRestaurants(location, radius, cuisineType);
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

  // ── Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>FoodTinder 🍽️</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.locationButton} onPress={() => setLocationModalVisible(true)}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationLabel} numberOfLines={1}>{locationLabel}</Text>
              <Text style={styles.locationChevron}>▾</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>↺</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.filtersRow}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>📍 {sliderRadius < 1 ? sliderRadius.toFixed(1) : Math.round(sliderRadius)} mi</Text>
            <Slider
              style={styles.slider}
              minimumValue={RADIUS_MIN}
              maximumValue={RADIUS_MAX}
              value={sliderRadius}
              step={0.5}
              minimumTrackTintColor="#FF6B35"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#FF6B35"
              onValueChange={(val) => {
                setSliderRadius(val);
                clearTimeout(radiusTimeout.current);
                radiusTimeout.current = setTimeout(() => setRadius(val), 400);
              }}
            />
            <Text style={styles.sliderMax}>{RADIUS_MAX} mi</Text>
          </View>
          <TouchableOpacity style={[styles.cuisineChip, cuisineType && styles.cuisineChipActive]} onPress={() => setCuisineModalVisible(true)}>
            <Text style={styles.cuisineChipText}>
              {CUISINE_OPTIONS.find((c) => c.type === cuisineType)?.emoji ?? '🍽️'}{' '}
              {CUISINE_OPTIONS.find((c) => c.type === cuisineType)?.label ?? 'Any'}
            </Text>
            <Text style={styles.cuisineChevron}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card area */}
      <View style={styles.cardArea}>
        {loading && pendingRestaurants.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF6B35" />
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
            <TouchableOpacity style={styles.emptyAction} onPress={() => setRadius(Math.min(radius + 1, RADIUS_MAX))}>
              <Text style={styles.emptyActionIcon}>📏</Text>
              <View style={styles.emptyActionText}>
                <Text style={styles.emptyActionTitle}>Increase Distance</Text>
                <Text style={styles.emptyActionSub}>Currently set to {sliderRadius < 1 ? sliderRadius.toFixed(1) : Math.round(sliderRadius)} mi — tap to expand</Text>
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
              <Text style={styles.actionButtonText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
<Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => { animateButton(likeScale); topCardRef.current?.swipeRight(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>♥</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Decision prompt — shown every 10 likes */}
      <Modal visible={decisionPrompt} transparent animationType="fade" onRequestClose={() => setDecisionPrompt(false)}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
              {likedRestaurants.slice(0, 6).map((r) => (
                <View key={r.id} style={styles.previewItem}>
                  {r.images?.[0] ? (
                    <Image source={{ uri: r.images[0] }} style={styles.previewImage} />
                  ) : (
                    <View style={[styles.previewImage, styles.previewPlaceholder]}>
                      <Text>🍽️</Text>
                    </View>
                  )}
                  <Text style={styles.previewName} numberOfLines={1}>{r.name}</Text>
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
            <TouchableOpacity onPress={() => setDecisionPrompt(false)} style={styles.decisionDismiss}>
              <Text style={styles.decisionDismissText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location picker modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setLocationModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Location</Text>

            <TouchableOpacity style={styles.currentLocButton} onPress={useCurrentLocation}>
              <Text style={styles.currentLocIcon}>📍</Text>
              <Text style={styles.currentLocText}>Use Current Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => {
                setLocationModalVisible(false);
                navigation.navigate('MapPicker', { initialCoords: location, initialRadius: radius });
              }}
            >
              <Text style={styles.currentLocIcon}>🗺️</Text>
              <Text style={styles.mapButtonText}>Pick on Map</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cuisine picker modal */}
      <Modal
        visible={cuisineModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCuisineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCuisineModalVisible(false)} />
          <View style={[styles.modalSheet, styles.cuisineSheet]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>What are you in the mood for?</Text>
            <FlatList
              data={CUISINE_OPTIONS}
              keyExtractor={(item) => item.label}
              numColumns={3}
              columnWrapperStyle={styles.cuisineGrid}
              renderItem={({ item }) => {
                const active = cuisineType === item.type;
                return (
                  <TouchableOpacity
                    style={[styles.cuisineOption, active && styles.cuisineOptionActive]}
                    onPress={() => { setCuisineType(item.type); setCuisineModalVisible(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cuisineOptionEmoji}>{item.emoji}</Text>
                    <Text style={[styles.cuisineOptionLabel, active && styles.cuisineOptionLabelActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F5' },

  // Header
  header: {
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FF6B35' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF0E8', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 5, maxWidth: 140,
  },
  resetButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F44336',
    justifyContent: 'center', alignItems: 'center',
  },
  resetButtonText: { fontSize: 16, color: '#fff', fontWeight: '800' },
  locationIcon: { fontSize: 13 },
  locationLabel: { fontSize: 13, fontWeight: '600', color: '#FF6B35', flex: 1 },
  locationChevron: { fontSize: 11, color: '#FF6B35' },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  slider: { flex: 1, height: 36 },
  sliderLabel: { fontSize: 12, fontWeight: '700', color: '#FF6B35', minWidth: 42 },
  sliderMax: { fontSize: 11, color: '#aaa', minWidth: 38, textAlign: 'right' },
  cuisineChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  cuisineChipActive: { borderColor: '#FF6B35', backgroundColor: '#FFF0E8' },
  cuisineChipText: { fontSize: 13, fontWeight: '600', color: '#444' },
  cuisineChevron: { fontSize: 11, color: '#888' },
  cuisineSheet: { maxHeight: '75%' },
  cuisineGrid: { justifyContent: 'space-between', marginBottom: 12 },
  cuisineOption: {
    flex: 1, marginHorizontal: 4, paddingVertical: 14,
    borderRadius: 14, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
  },
  cuisineOptionActive: { backgroundColor: '#FF6B35' },
  cuisineOptionEmoji: { fontSize: 26, marginBottom: 4 },
  cuisineOptionLabel: { fontSize: 11, fontWeight: '600', color: '#444', textAlign: 'center' },
  cuisineOptionLabelActive: { color: '#fff' },

  // Card area
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#888' },
  errorEmoji: { fontSize: 52, marginBottom: 12 },
  errorText: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#222', textAlign: 'center', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 24 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  emptyActionIcon: { fontSize: 24 },
  emptyActionText: { flex: 1 },
  emptyActionTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 2 },
  emptyActionSub: { fontSize: 12, color: '#999' },
  emptyActionChevron: { fontSize: 20, color: '#ccc', fontWeight: '600' },
  retryButton: { backgroundColor: '#FF6B35', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Action buttons
  actionRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 40, paddingVertical: 20, paddingBottom: 28,
  },
  actionButton: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  nopeButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#F44336' },
likeButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#4CAF50' },
  actionButtonText: { fontSize: 26, fontWeight: '700' },

  // Modal (cuisine picker)
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ddd', alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  currentLocButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF0E8', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
  },
  currentLocIcon: { fontSize: 20 },
  currentLocText: { fontSize: 16, fontWeight: '600', color: '#FF6B35' },
  mapButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0F4FF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  mapButtonText: { fontSize: 16, fontWeight: '600', color: '#3B5BDB' },
  // Decision prompt
  decisionOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  decisionSheet: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 24, width: '100%', alignItems: 'center',
  },
  decisionEmoji: { fontSize: 48, marginBottom: 12 },
  decisionTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  decisionSub: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  previewRow: { marginBottom: 20, alignSelf: 'stretch' },
  previewItem: { alignItems: 'center', marginRight: 12, width: 72 },
  previewImage: { width: 72, height: 72, borderRadius: 12, marginBottom: 4 },
  previewPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  previewName: { fontSize: 11, color: '#555', textAlign: 'center' },
  decisionGoButton: {
    backgroundColor: '#FF6B35', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  decisionGoText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  decisionDismiss: { paddingVertical: 8 },
  decisionDismissText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
});
