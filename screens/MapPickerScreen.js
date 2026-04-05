import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapPickerScreen({ navigation, route }) {
  const initialCoords = route.params?.initialCoords;
  const insets = useSafeAreaInsets();

  const [marker, setMarker] = useState(
    initialCoords
      ? { latitude: initialCoords.latitude, longitude: initialCoords.longitude }
      : null
  );
  const [label, setLabel] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const initialRegion = {
    latitude: initialCoords?.latitude ?? 37.7749,
    longitude: initialCoords?.longitude ?? -122.4194,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  async function handleMapPress(e) {
    const coords = e.nativeEvent.coordinate;
    setMarker(coords);
    setGeocoding(true);
    setLabel('');
    try {
      const places = await Location.reverseGeocodeAsync(coords);
      if (places?.[0]) {
        const p = places[0];
        const parts = [p.city || p.district, p.region, p.country].filter(Boolean);
        setLabel(parts.join(', ') || 'Selected Location');
      } else {
        setLabel('Selected Location');
      }
    } catch {
      setLabel('Selected Location');
    } finally {
      setGeocoding(false);
    }
  }

  function handleConfirm() {
    if (!marker) return;
    navigation.navigate('Tabs', {
      screen: 'Discover',
      params: {
        pickedLocation: {
          coords: marker,
          label: label || 'Selected Location',
        },
      },
    });
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      {/* Instruction banner */}
      <View style={[styles.banner, { top: insets.top + 12 }]}>
        <Text style={styles.bannerText}>
          {marker ? (geocoding ? 'Getting location...' : label) : 'Tap anywhere on the map'}
        </Text>
        {geocoding && <ActivityIndicator size="small" color="#FF6B35" style={{ marginLeft: 6 }} />}
      </View>

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {marker && (
          <Marker coordinate={marker} pinColor="#FF6B35" />
        )}
      </MapView>

      {/* Confirm button */}
      {marker && !geocoding && (
        <View style={[styles.confirmContainer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>📍  Use This Location</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: -2,
  },
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: '70%',
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  confirmContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  confirmButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
