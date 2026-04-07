import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';

export default function NotNowScreen({ navigation }) {
  const { notNowRestaurants, removeNotNow, likeRestaurant } = useRestaurants();
  const t = useTheme();

  function openDetail(item) {
    navigation.navigate('Detail', { restaurant: item });
  }

  if (notNowRestaurants.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: t.bg }]}>
        <Text style={styles.emptyEmoji}>👋</Text>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySubtitle}>Restaurants you pass on will show up here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notNowRestaurants}
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
            <TouchableOpacity
              onPress={() => removeNotNow(item.id)}
              style={styles.removeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 40, backgroundColor: '#f5f6f7',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#212529', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#868e96', textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
  },
  thumbnail: { width: 80, height: 80 },
  thumbnailPlaceholder: { backgroundColor: '#f5f6f7', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '600', color: '#868e96', marginBottom: 2 },
  meta: { fontSize: 13, color: '#adb5bd', marginBottom: 2 },
  address: { fontSize: 12, color: '#dee2e6', marginBottom: 3 },
  description: { fontSize: 12, color: '#adb5bd', lineHeight: 17 },
  rightCol: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingRight: 12, gap: 12 },
  chevron: { fontSize: 20, color: '#dee2e6', fontWeight: '400' },
  removeButton: { padding: 4 },
  removeText: { fontSize: 13, color: '#dee2e6', fontWeight: '500' },
});
