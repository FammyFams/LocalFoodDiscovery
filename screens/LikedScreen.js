import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { useRestaurants } from '../context/RestaurantContext';

export default function LikedScreen({ navigation }) {
  const { likedRestaurants, removeLiked } = useRestaurants();

  function openDetail(item) {
    navigation.navigate('Detail', { restaurant: item });
  }

  if (likedRestaurants.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>💚</Text>
        <Text style={styles.emptyTitle}>No likes yet</Text>
        <Text style={styles.emptySubtitle}>Swipe right on restaurants you want to try!</Text>
      </View>
    );
  }

  // TODO: Remove this button or keep it — experimental export feature
  function exportToGoogleMaps() {
    const query = likedRestaurants.map((r) => r.name + ', ' + r.address).join(' | ');
    Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(query)}`);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* TODO: Remove — experimental export button */}
      <TouchableOpacity style={styles.exportButton} onPress={exportToGoogleMaps}>
        <Text style={styles.exportButtonText}>🗺️ View All on Google Maps</Text>
      </TouchableOpacity>
    <FlatList
      data={likedRestaurants}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.75}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={{ fontSize: 28 }}>🍽️</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.priceLevel > 0 ? '$'.repeat(item.priceLevel) : ''}
              {item.rating ? `  ⭐ ${item.rating}` : ''}
              {item.openNow !== null ? (item.openNow ? '  🟢 Open' : '  🔴 Closed') : ''}
            </Text>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <View style={styles.rightCol}>
            <Text style={styles.chevron}>›</Text>
            <TouchableOpacity onPress={() => removeLiked(item.id)} style={styles.removeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 40, backgroundColor: '#FFF9F5',
  },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  thumbnail: { width: 90, height: 90 },
  thumbnailPlaceholder: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 3 },
  meta: { fontSize: 13, color: '#777', marginBottom: 3 },
  address: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  description: { fontSize: 12, color: '#999', lineHeight: 17, fontStyle: 'italic' },
  rightCol: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingRight: 12, gap: 12 },
  chevron: { fontSize: 22, color: '#ccc', fontWeight: '600' },
  removeButton: { padding: 4 },
  removeText: { fontSize: 14, color: '#ddd', fontWeight: '600' },
  // TODO: Remove — experimental export button styles
  exportButton: {
    backgroundColor: '#3B5BDB', borderRadius: 14, marginHorizontal: 16,
    marginTop: 12, marginBottom: 4, paddingVertical: 12, alignItems: 'center',
  },
  exportButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
