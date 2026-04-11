import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,

} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Restaurant, Theme } from '../types';

export default function LikedScreen({ navigation }: { navigation: any }) {
  const { likedRestaurants, removeLiked } = useRestaurants();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  function openDetail(item: Restaurant) {
    navigation.navigate('Detail', { restaurant: item });
  }

  if (likedRestaurants.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: t.bg }]}>
        <Text style={styles.emptyEmoji}>💚</Text>
        <Text style={styles.emptyTitle}>No likes yet</Text>
        <Text style={styles.emptySubtitle}>Swipe right on restaurants you want to try!</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <FlatList
      data={likedRestaurants}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
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

function createStyles(t: Theme) {
  return StyleSheet.create({
    list: { padding: 16, gap: 10 },
    empty: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      padding: 40, backgroundColor: t.bg,
    },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: t.textTertiary, textAlign: 'center' },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.card, borderRadius: 12, overflow: 'hidden',
    },
    thumbnail: { width: 80, height: 80 },
    thumbnailPlaceholder: { backgroundColor: t.inputBg, justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
    name: { fontSize: 16, fontWeight: '600', color: t.text, marginBottom: 2 },
    meta: { fontSize: 13, color: t.textTertiary, marginBottom: 2 },
    address: { fontSize: 12, color: t.textTertiary, marginBottom: 3 },
    description: { fontSize: 12, color: t.textTertiary, lineHeight: 17 },
    rightCol: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingRight: 12, gap: 12 },
    chevron: { fontSize: 20, color: t.textTertiary, fontWeight: '400' },
    removeButton: { padding: 4 },
    removeText: { fontSize: 13, color: t.textTertiary, fontWeight: '500' },
  });
}
