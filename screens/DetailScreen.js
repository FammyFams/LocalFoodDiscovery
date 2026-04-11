import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';
import { getPhotoUrl } from '../services/googlePlaces';
import { trackEvent } from '../services/analytics';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.min(SCREEN_WIDTH * 0.75, 360);

export default function DetailScreen({ route, navigation }) {
  const { restaurant } = route.params;
  const t = useTheme();

  useEffect(() => {
    trackEvent('detail_viewed', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating,
    });
  }, [restaurant.id]);
  const { likedRestaurants, notNowRestaurants, likeRestaurant, dislikeRestaurant, removeLiked, removeNotNow } =
    useRestaurants();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(t), [t]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllHours, setShowAllHours] = useState(false);

  const isLiked = likedRestaurants.some((r) => r.id === restaurant.id);
  const isNotNow = notNowRestaurants.some((r) => r.id === restaurant.id);

  const likeAnim = useRef(new Animated.Value(1)).current;
  const notNowAnim = useRef(new Animated.Value(1)).current;

  function pulseButton(anim, callback) {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 20 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    callback();
  }

  function handleLike() {
    pulseButton(likeAnim, () => {
      if (isLiked) removeLiked(restaurant.id);
      else {
        likeRestaurant(restaurant);
        if (isNotNow) removeNotNow(restaurant.id);
      }
    });
  }

  function handleNotNow() {
    pulseButton(notNowAnim, () => {
      if (isNotNow) {
        removeNotNow(restaurant.id);
      } else {
        dislikeRestaurant(restaurant);
        if (isLiked) removeLiked(restaurant.id);
        navigation.goBack();
      }
    });
  }

  function handleShare() {
    const lines = [`🍽️ ${restaurant.name}`];
    if (restaurant.address) lines.push(`📍 ${restaurant.address}`);
    if (restaurant.rating) lines.push(`⭐ ${restaurant.rating}${restaurant.userRatingsTotal ? ` (${restaurant.userRatingsTotal.toLocaleString()} reviews)` : ''}`);
    if (restaurant.website) lines.push(restaurant.website);
    Share.share({ message: lines.join('\n') });
  }

  // Load all photos lazily from refs when detail screen opens
  const [allImages, setAllImages] = useState(restaurant.images || []);
  useEffect(() => {
    if (restaurant.allPhotoRefs?.length > 1) {
      const fullUrls = restaurant.allPhotoRefs.map((ref) => getPhotoUrl(ref));
      setAllImages(fullUrls);
    }
  }, [restaurant.id]);
  const images = allImages.length > 0 ? allImages : [null];
  const imageScrollRef = useRef(null);
  const autoScrollTimer = useRef(null);

  // Auto-scroll photos every 3 seconds; stops permanently if user swipes manually
  useEffect(() => {
    if (images.length <= 1 || images[0] === null) return;
    autoScrollTimer.current = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const next = (prev + 1) % images.length;
        imageScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(autoScrollTimer.current);
  }, [images.length]);

  const todayIndex = new Date().getDay(); // 0=Sun, need to map to Foursquare index
  const todayHours = restaurant.hours?.[todayIndex === 0 ? 6 : todayIndex - 1];

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Image carousel */}
      <View style={styles.imageContainer}>
        <ScrollView
          ref={imageScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            clearInterval(autoScrollTimer.current);
          }}
          onMomentumScrollEnd={(e) => {
            setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
          }}
        >
          {images.map((uri, i) =>
            uri ? (
              <Image key={i} source={{ uri }} style={styles.image} resizeMode="cover" />
            ) : (
              <View key={i} style={[styles.image, styles.imagePlaceholder]}>
                <Text style={{ fontSize: 72 }}>🍽️</Text>
              </View>
            )
          )}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentImageIndex && styles.dotActive]} />
            ))}
          </View>
        )}

      </View>

      {/* Info */}
      <View style={[styles.info, { paddingBottom: insets.bottom + 20 }]}>
        {/* Name + open status */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: t.text }]}>{restaurant.name}</Text>
          {restaurant.openNow !== null && (
            <View style={[styles.openBadge, restaurant.openNow ? styles.openBadgeOpen : styles.openBadgeClosed]}>
              <Text style={[styles.openBadgeText, { color: restaurant.openNow ? '#15803d' : '#b91c1c' }]}>
                {restaurant.openNow ? 'Open' : 'Closed'}
              </Text>
            </View>
          )}
        </View>

        {/* Cuisine types */}
        {restaurant.types?.length > 0 && (
          <View style={styles.typesRow}>
            {restaurant.types.map((type) => (
              <View key={type} style={[styles.typeChip, { backgroundColor: t.inputBg }]}>
                <Text style={[styles.typeChipText, { color: t.textTertiary }]}>{type}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Badges row */}
        <View style={styles.metaRow}>
          {restaurant.rating && (
            <View style={[styles.badge, { backgroundColor: t.surface }]}>
              <Text style={[styles.badgeText, { color: t.textSecondary }]}>⭐ {restaurant.rating}</Text>
              {restaurant.userRatingsTotal && (
                <Text style={[styles.badgeSubText, { color: t.textTertiary }]}> ({restaurant.userRatingsTotal.toLocaleString()})</Text>
              )}
            </View>
          )}
          {restaurant.priceLevel > 0 && (
            <View style={[styles.badge, { backgroundColor: t.surface }]}>
              <Text style={[styles.badgeText, { color: t.textSecondary }]}>{'$'.repeat(restaurant.priceLevel)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {restaurant.description && (
          <View style={styles.section}>
            <Text style={[styles.description, { color: t.textSecondary }]}>{restaurant.description}</Text>
          </View>
        )}

        {/* Tags (dine in, takeout, etc.) */}
        {restaurant.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {restaurant.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: t.inputBg }]}>
                <Text style={[styles.tagText, { color: t.textTertiary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: t.separator }]} />

        {/* Address + map links */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={[styles.infoText, { color: t.textSecondary }]}>{restaurant.address}</Text>
        </View>
        <View style={styles.mapLinksRow}>
          <TouchableOpacity
            style={[styles.mapLink, { backgroundColor: t.inputBg }]}
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ', ' + restaurant.address)}`)}
          >
            <Text style={styles.mapLinkText}>🗺️ Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapLink, { backgroundColor: t.inputBg }]}
            onPress={() => Linking.openURL(
              Platform.OS === 'ios'
                ? `maps://?q=${encodeURIComponent(restaurant.name + ', ' + restaurant.address)}`
                : `https://maps.apple.com/?q=${encodeURIComponent(restaurant.name + ', ' + restaurant.address)}`
            )}
          >
            <Text style={styles.mapLinkText}>🍎 Apple Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Phone */}
        {restaurant.phone && (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}>
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={[styles.infoText, styles.link, { color: t.blue }]}>{restaurant.phone}</Text>
          </TouchableOpacity>
        )}

        {/* Website */}
        {restaurant.website && (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(restaurant.website)}>
            <Text style={styles.infoIcon}>🌐</Text>
            <Text style={[styles.infoText, styles.link, { color: t.blue }]} numberOfLines={1}>
              {restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Hours */}
        {restaurant.hours?.length > 0 && (
          <View style={styles.hoursSection}>
            <TouchableOpacity style={styles.infoRow} onPress={() => setShowAllHours((v) => !v)}>
              <Text style={styles.infoIcon}>🕐</Text>
              <Text style={[styles.infoText, { color: t.textSecondary }]}>{todayHours ?? 'See hours'}</Text>
              <Text style={styles.chevron}>{showAllHours ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showAllHours &&
              restaurant.hours.map((h, i) => (
                <Text key={i} style={[styles.hourLine, { color: t.textTertiary }]}>{h}</Text>
              ))}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: t.separator }]} />

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Animated.View style={{ transform: [{ scale: notNowAnim }], flex: 1 }}>
            <TouchableOpacity
              style={[styles.actionButton, isNotNow ? styles.activeNotNow : styles.inactiveNotNow, !isNotNow && { backgroundColor: t.surface }]}
              onPress={handleNotNow}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, isNotNow && styles.activeActionText]}>
                {isNotNow ? '✕  Not Now' : '✕  Not Now'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ width: 12 }} />

          <Animated.View style={{ transform: [{ scale: likeAnim }], flex: 1 }}>
            <TouchableOpacity
              style={[styles.actionButton, isLiked ? styles.activeLike : styles.inactiveLike, !isLiked && { backgroundColor: t.surface }]}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, isLiked && styles.activeActionText]}>
                {isLiked ? '♥  Saved' : '♥  Save'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
          <Text style={styles.shareButtonText}>↑  Share with Friends</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
    </View>
  );
}

function createStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    imageContainer: { position: 'relative', height: IMAGE_HEIGHT, backgroundColor: t.separator },
    image: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT },
    imagePlaceholder: { backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
    dots: {
      position: 'absolute', bottom: 12, left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'center', gap: 5,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { backgroundColor: '#fff', width: 16, borderRadius: 3 },
    backButton: {
      position: 'absolute', top: Platform.OS === 'ios' ? 60 : 36, left: 16,
      width: 44, height: 44, borderRadius: 22, zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
    },
    info: { padding: 20 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
    name: { fontSize: 24, fontFamily: 'Lora_700Bold', color: t.text, flex: 1, letterSpacing: -0.3 },
    openBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    openBadgeOpen: { backgroundColor: '#D1FAE5' },
    openBadgeClosed: { backgroundColor: '#FEE2E2' },
    openBadgeText: { fontSize: 12, fontFamily: 'Raleway_600SemiBold' },
    typesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    typeChip: { backgroundColor: t.inputBg, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
    typeChipText: { fontSize: 12, fontFamily: 'Raleway_500Medium', color: t.textTertiary },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    badge: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.card, borderRadius: 16,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    badgeText: { fontSize: 14, fontFamily: 'Raleway_600SemiBold', color: t.textSecondary },
    badgeSubText: { fontSize: 13, color: t.textTertiary },
    section: { marginBottom: 14 },
    description: { fontSize: 15, fontFamily: 'Raleway_400Regular', color: t.textSecondary, lineHeight: 22 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    tag: { backgroundColor: t.inputBg, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
    tagText: { fontSize: 12, fontFamily: 'Raleway_500Medium', color: t.textTertiary },
    divider: { height: 0.5, backgroundColor: t.separator, marginVertical: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    infoIcon: { fontSize: 15, marginTop: 1 },
    infoText: { fontSize: 15, fontFamily: 'Raleway_400Regular', color: t.textSecondary, flex: 1, lineHeight: 20 },
    link: { color: t.blue },
    mapLinksRow: { flexDirection: 'row', gap: 8, marginBottom: 12, marginLeft: 26 },
    mapLink: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.inputBg, borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    mapLinkText: { fontSize: 13, fontFamily: 'Raleway_500Medium', color: t.blue },
    chevron: { fontSize: 11, color: t.textTertiary, marginLeft: 4, marginTop: 3 },
    hoursSection: { marginBottom: 4 },
    hourLine: { fontSize: 13, color: t.textTertiary, marginLeft: 28, marginBottom: 3, lineHeight: 19 },
    actionRow: { flexDirection: 'row', marginTop: 4 },
    actionButton: { paddingVertical: 14, borderRadius: 24, alignItems: 'center', borderWidth: 1.5 },
    inactiveLike: { borderColor: t.green, backgroundColor: t.card },
    activeLike: { borderColor: t.green, backgroundColor: t.green },
    inactiveNotNow: { borderColor: t.red, backgroundColor: t.card },
    activeNotNow: { borderColor: t.red, backgroundColor: t.red },
    actionButtonText: { fontSize: 16, fontFamily: 'Raleway_600SemiBold', color: t.textSecondary },
    activeActionText: { color: '#fff' },
    shareButton: {
      marginTop: 12, paddingVertical: 14, borderRadius: 24,
      alignItems: 'center', borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.surface,
    },
    shareButtonText: { fontSize: 16, fontFamily: 'Raleway_600SemiBold', color: t.textSecondary },
  });
}
