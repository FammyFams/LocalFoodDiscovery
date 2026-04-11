import { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPendingLocation } from '../services/locationBridge';
import { useTheme } from '../context/ThemeContext';

const RADIUS_MIN = 0.5;
const RADIUS_MAX = 5;

function milesToMeters(miles) {
  return miles * 1609.34;
}

export default function MapPickerScreen({ navigation, route }) {
  const initialCoords = route.params?.initialCoords;
  const initialRadius = route.params?.initialRadius ?? 1;
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const mapRef = useRef(null);
  const currentRegion = useRef(initialRegion);
  const [marker, setMarker] = useState(null);
  const [radius, setRadius] = useState(initialRadius);

  function zoom(factor) {
    const r = currentRegion.current;
    if (!r?.latitudeDelta) return;
    const next = {
      ...r,
      latitudeDelta: Math.min(Math.max(r.latitudeDelta * factor, 0.002), 100),
      longitudeDelta: Math.min(Math.max(r.longitudeDelta * factor, 0.002), 100),
    };
    mapRef.current?.animateToRegion(next, 250);
  }

  const initialRegion = {
    latitude: initialCoords?.latitude ?? 37.7749,
    longitude: initialCoords?.longitude ?? -122.4194,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  function handleMapPress(e) {
    setMarker(e.nativeEvent.coordinate);
  }

  function handleConfirm() {
    setPendingLocation(marker, radius);
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={[styles.banner, { top: insets.top + 12 }]}>
        <Text style={styles.bannerText}>
          {marker ? 'Adjust radius then confirm' : 'Tap anywhere on the map'}
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        onRegionChangeComplete={(r) => { if (r?.latitudeDelta) currentRegion.current = r; }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {marker && (
          <>
            <Marker coordinate={marker} pinColor={t.accent} />
            <Circle
              center={marker}
              radius={milesToMeters(radius)}
              strokeColor={t.accent}
              strokeWidth={2}
              fillColor={`${t.accent}20`}
            />
          </>
        )}
      </MapView>

      <View style={[styles.zoomButtons, { bottom: marker ? 220 : insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.zoomButton} onPress={() => zoom(0.5)}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={() => zoom(2)}>
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
      </View>

      {marker && (
        <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>📏 Radius</Text>
            <Text style={styles.sliderValue}>
              {radius < 1 ? radius.toFixed(1) : Math.round(radius)} mi
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={RADIUS_MIN}
            maximumValue={RADIUS_MAX}
            value={radius}
            step={0.5}
            minimumTrackTintColor={t.accent}
            maximumTrackTintColor={t.border}
            thumbTintColor={t.accent}
            onValueChange={setRadius}
          />
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>📍  Use This Location</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function createStyles(t) {
  return StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    backButton: {
      position: 'absolute', left: 16, zIndex: 10,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
    },
    backText: { fontSize: 28, fontWeight: '700', color: t.text, marginTop: -2 },
    banner: {
      position: 'absolute', alignSelf: 'center', zIndex: 10,
      backgroundColor: t.surface, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    bannerText: { fontSize: 14, fontWeight: '600', color: t.text },
    panel: {
      backgroundColor: t.surface,
      paddingHorizontal: 24, paddingTop: 20,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08, shadowRadius: 10, elevation: 10,
    },
    sliderRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
    },
    sliderLabel: { fontSize: 15, fontWeight: '700', color: t.text },
    sliderValue: { fontSize: 15, fontWeight: '700', color: t.accent },
    slider: { width: '100%', height: 36, marginBottom: 16 },
    confirmButton: {
      backgroundColor: t.accent, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
      shadowColor: t.accent, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    zoomButtons: {
      position: 'absolute', right: 16, zIndex: 10,
      gap: 8,
    },
    zoomButton: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
    },
    zoomText: { fontSize: 24, fontWeight: '400', color: t.text, lineHeight: 28 },
  });
}
