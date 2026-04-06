import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
  TextInput,
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
import { useRestaurants } from '../context/RestaurantContext';

const RADIUS_OPTIONS = [0.5, 1, 2, 3, 5];

export default function MainScreen({ navigation, route }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Current Location');
  const [radius, setRadius] = useState(1);

  // Location picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);

  const { likeRestaurant, dislikeRestaurant, likedRestaurants, notNowRestaurants, clearAll } = useRestaurants();

  function handleReset() {
    Alert.alert(
      'Reset Everything?',
      'This will clear all your liked and passed restaurants.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { clearAll(); setRestaurants([]); if (location) loadRestaurants(location, radius); } },
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

  // Handle location picked from map
  useEffect(() => {
    const picked = route.params?.pickedLocation;
    if (picked) {
      setLocation(picked.coords);
      setLocationLabel(picked.label);
      navigation.setParams({ pickedLocation: null });
    }
  }, [route.params?.pickedLocation]);

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
      loadRestaurants(location, radius);
    }
  }, [location, radius]);

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

  async function handleSearchChange(text) {
    setSearchText(text);
    clearTimeout(searchTimeout.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await Location.geocodeAsync(text);
        // Reverse geocode each result to get readable names
        const labeled = await Promise.all(
          results.slice(0, 5).map(async (r) => {
            const places = await Location.reverseGeocodeAsync(r);
            const p = places?.[0];
            const label = [p?.city || p?.district, p?.region, p?.country]
              .filter(Boolean).join(', ');
            return { coords: r, label: label || text };
          })
        );
        // Deduplicate by label
        const seen = new Set();
        setSearchResults(labeled.filter(({ label }) => {
          if (seen.has(label)) return false;
          seen.add(label);
          return true;
        }));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function selectLocation(coords, label) {
    setLocation(coords);
    setLocationLabel(label);
    setPickerVisible(false);
    setSearchText('');
    setSearchResults([]);
  }

  async function useCurrentLocation() {
    setPickerVisible(false);
    setSearchText('');
    setSearchResults([]);
    await requestCurrentLocation();
  }

  // ── Restaurant loading ────────────────────────────────────────

  async function loadRestaurants(loc, rad) {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchNearbyRestaurants({
        latitude: loc.latitude,
        longitude: loc.longitude,
        radiusMiles: rad,
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
        loadRestaurants(location, radius);
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
            <TouchableOpacity style={styles.locationButton} onPress={() => setPickerVisible(true)}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationLabel} numberOfLines={1}>{locationLabel}</Text>
              <Text style={styles.locationChevron}>▾</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>↺ Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
              onPress={() => setRadius(r)}
            >
              <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextActive]}>
                {r} mi
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            <Text style={styles.errorEmoji}>🎉</Text>
            <Text style={styles.errorText}>You've seen all nearby places!</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadRestaurants(location, radius)}>
              <Text style={styles.retryText}>Refresh</Text>
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
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Location</Text>

            {/* Current location button */}
            <TouchableOpacity style={styles.currentLocButton} onPress={useCurrentLocation}>
              <Text style={styles.currentLocIcon}>📍</Text>
              <Text style={styles.currentLocText}>Use Current Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => {
                setPickerVisible(false);
                navigation.navigate('MapPicker', { initialCoords: location });
              }}
            >
              <Text style={styles.currentLocIcon}>🗺️</Text>
              <Text style={styles.mapButtonText}>Choose on Map</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Search input */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search city or address..."
                placeholderTextColor="#aaa"
                value={searchText}
                onChangeText={handleSearchChange}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searching && <ActivityIndicator size="small" color="#FF6B35" />}
            </View>

            {/* Search results */}
            <FlatList
              data={searchResults}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => selectLocation(item.coords, item.label)}
                >
                  <Text style={styles.resultIcon}>📌</Text>
                  <Text style={styles.resultText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchText.length > 0 && !searching ? (
                  <Text style={styles.noResults}>No results found</Text>
                ) : null
              }
            />
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F44336', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  resetButtonText: { fontSize: 13, color: '#fff', fontWeight: '800' },
  locationIcon: { fontSize: 13 },
  locationLabel: { fontSize: 13, fontWeight: '600', color: '#FF6B35', flex: 1 },
  locationChevron: { fontSize: 11, color: '#FF6B35' },
  radiusRow: { flexDirection: 'row', gap: 8 },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  radiusChipActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B35' },
  radiusChipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  radiusChipTextActive: { color: '#fff' },

  // Card area
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#888' },
  errorEmoji: { fontSize: 52, marginBottom: 12 },
  errorText: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
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

  // Modal
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
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
  },
  mapButtonText: { fontSize: 16, fontWeight: '600', color: '#3B5BDB' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#222' },
  resultsList: { maxHeight: 280 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  resultIcon: { fontSize: 16 },
  resultText: { fontSize: 15, color: '#333', flex: 1 },
  noResults: { textAlign: 'center', color: '#aaa', paddingVertical: 20, fontSize: 14 },

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
